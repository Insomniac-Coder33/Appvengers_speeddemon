#include <algorithm>
#include <array>
#include <charconv>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <string_view>
#include <system_error>
#include <unordered_map>
#include <vector>

namespace {
namespace fs = std::filesystem;

struct Options {
    fs::path input;
    fs::path output;
    std::size_t buffer_size = 1048576;
};

std::uint64_t parse_unsigned_option(std::string_view text) {
    std::uint64_t value = 0;
    const auto result = std::from_chars(text.data(), text.data() + text.size(), value);
    if (text.empty() || result.ec != std::errc{} ||
        result.ptr != text.data() + text.size()) {
        throw std::invalid_argument("invalid unsigned integer option");
    }
    return value;
}

Options parse_options(int argc, char** argv) {
    Options options;
    fs::path data = "/data", out = "/out";
    bool data_seen = false, out_seen = false, buffer_seen = false;
    for (int i = 1; i < argc; ++i) {
        const std::string_view name = argv[i];
        if (name != "--data" && name != "--out" && name != "--buffer-size") {
            throw std::invalid_argument("unknown option: " + std::string(name));
        }
        if (++i == argc || std::string_view(argv[i]).empty()) {
            throw std::invalid_argument("missing value for " + std::string(name));
        }
        if (name == "--data") {
            if (data_seen) throw std::invalid_argument("duplicate --data");
            data_seen = true;
            data = argv[i];
        } else if (name == "--out") {
            if (out_seen) throw std::invalid_argument("duplicate --out");
            out_seen = true;
            out = argv[i];
        } else {
            if (buffer_seen) throw std::invalid_argument("duplicate --buffer-size");
            buffer_seen = true;
            const auto size = parse_unsigned_option(argv[i]);
            if (size < 1 || size > 16777216) {
                throw std::invalid_argument("--buffer-size must be between 1 and 16777216");
            }
            options.buffer_size = static_cast<std::size_t>(size);
        }
    }
    options.input = data / "requests.log";
    options.output = out / "summary.txt";
    return options;
}

void protect_input(const fs::path& input, const fs::path& output) {
    if (!fs::is_regular_file(input)) {
        throw std::invalid_argument("input must be an existing regular file");
    }
    if (fs::absolute(input).lexically_normal() ==
        fs::absolute(output).lexically_normal()) {
        throw std::invalid_argument("input and output must be different files");
    }
    if (fs::exists(input) && fs::exists(output) && fs::equivalent(input, output)) {
        throw std::invalid_argument("input and output refer to the same file");
    }
    if (output.filename().empty() || fs::is_symlink(output) ||
        (fs::exists(output) && !fs::is_regular_file(output))) {
        throw std::invalid_argument("output must name a regular file, not a symlink or special file");
    }
}

// Official fixed-width UTC timestamp; validate real Gregorian dates as well.
std::uint32_t parse_timestamp_hour(std::string_view text) {
    if (text.size() != 27 || text[4] != '-' || text[7] != '-' ||
        text[10] != 'T' || text[13] != ':' || text[16] != ':' ||
        text[19] != '.' || text[26] != 'Z') {
        throw std::invalid_argument("timestamp must use YYYY-MM-DDTHH:mm:ss.ffffffZ");
    }
    const auto digits = [&text](std::size_t begin, std::size_t count) {
        unsigned value = 0;
        for (std::size_t i = begin; i < begin + count; ++i) {
            if (text[i] < '0' || text[i] > '9') {
                throw std::invalid_argument("timestamp contains a nondigit");
            }
            value = value * 10 + static_cast<unsigned>(text[i] - '0');
        }
        return value;
    };
    const unsigned year = digits(0, 4);
    const unsigned month = digits(5, 2);
    const unsigned day = digits(8, 2);
    const unsigned hour = digits(11, 2);
    const unsigned minute = digits(14, 2);
    const unsigned second = digits(17, 2);
    static_cast<void>(digits(20, 6));
    if (year < 1 || month < 1 || month > 12 || hour > 23 ||
        minute > 59 || second > 59) {
        throw std::invalid_argument("timestamp component is outside the timestamp range");
    }
    constexpr std::array<unsigned, 12> days = {
        31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    const bool leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    const unsigned limit = days[month - 1] + (month == 2 && leap ? 1U : 0U);
    if (day < 1 || day > limit) {
        throw std::invalid_argument("timestamp day is invalid for its Gregorian month");
    }
    return (year << 14) | (month << 10) | (day << 5) | hour;
}

struct HourCounters {
    std::uint64_t requests = 0;
    std::uint64_t errors = 0;
    std::vector<std::uint32_t> latencies;
};

struct EndpointState {
    const std::string* name;
};

void append_latency(std::vector<std::uint32_t>& values, std::uint32_t value) {
    if (values.size() == values.capacity()) {
        const auto maximum = values.max_size();
        if (values.size() == maximum) {
            throw std::length_error("latency vector exceeds its representable capacity");
        }
        const auto capacity = values.capacity();
        const auto next = capacity == 0 ? 1 :
            (capacity > maximum / 2 ? maximum : capacity * 2);
        values.reserve(next);
    }
    values.push_back(value);
}

class Aggregates {
public:
    Aggregates() = default;
    Aggregates(const Aggregates&) = delete;
    Aggregates& operator=(const Aggregates&) = delete;

    void add(const std::string& endpoint, std::uint32_t hour,
             std::uint16_t status, std::uint32_t latency) {
        auto found = endpoint_ids_.find(endpoint);
        if (found == endpoint_ids_.end()) {
            if (endpoints.size() > std::numeric_limits<std::uint32_t>::max()) {
                throw std::length_error("too many endpoints for uint32 identifiers");
            }
            const auto id = static_cast<std::uint32_t>(endpoints.size());
            found = endpoint_ids_.emplace(endpoint, id).first;
            // Unordered-map key references survive rehash. Keys are never erased.
            endpoints.push_back(EndpointState{&found->first});
        }
        const auto id = found->second;
        const auto key = (static_cast<std::uint64_t>(id) << 32) | hour;
        auto& counters = hours[key];
        if (counters.requests == std::numeric_limits<std::uint64_t>::max()) {
            throw std::overflow_error("hourly request count overflow");
        }
        append_latency(counters.latencies, latency);
        ++counters.requests;
        if (status >= 500 && status <= 599) {
            if (counters.errors == std::numeric_limits<std::uint64_t>::max()) {
                throw std::overflow_error("hourly error count overflow");
            }
            ++counters.errors;
        }
    }

    std::vector<EndpointState> endpoints;
    std::unordered_map<std::uint64_t, HourCounters> hours;

private:
    std::unordered_map<std::string, std::uint32_t> endpoint_ids_;
};

class Parser {
public:
    explicit Parser(Aggregates& aggregates) : aggregates_(aggregates) {}

    void consume_line(std::string_view line) {
        // Longest legal record: 27+1+7+1+125+1+3+1+10 bytes, excluding LF.
        if (line.empty() || line.size() > max_line_size) fail("invalid record length");
        std::array<std::string_view, 5> fields;
        std::size_t begin = 0;
        for (std::size_t i = 0; i < 4; ++i) {
            const auto end = line.find(' ', begin);
            if (end == std::string_view::npos || end == begin) fail("five nonempty fields required");
            fields[i] = line.substr(begin, end - begin);
            begin = end + 1;
        }
        fields[4] = line.substr(begin);
        if (fields[4].empty() || fields[4].find(' ') != std::string_view::npos) {
            fail("five fields separated by single spaces required");
        }
        std::uint32_t hour;
        try { hour = parse_timestamp_hour(fields[0]); }
        catch (const std::invalid_argument& error) { fail(error.what()); }
        const auto method = fields[1];
        if (method != "GET" && method != "POST" && method != "PUT" &&
            method != "PATCH" && method != "DELETE" && method != "HEAD" &&
            method != "OPTIONS") fail("unknown HTTP method");
        const auto endpoint = fields[2];
        if (endpoint.empty() || endpoint.size() > 125 || endpoint.front() != '/') {
            fail("endpoint is outside the official grammar");
        }
        for (const unsigned char byte : endpoint) {
            const bool allowed = (byte >= 'A' && byte <= 'Z') ||
                (byte >= 'a' && byte <= 'z') || (byte >= '0' && byte <= '9') ||
                byte == '/' || byte == '-' || byte == '_' || byte == '.' ||
                byte == '{' || byte == '}' || byte == ':';
            if (!allowed) fail("endpoint is outside the official grammar");
        }
        const auto status = number(fields[3]);
        if (fields[3].size() != 3 || status < 100 || status > 599) fail("status must be 100..599");
        if (fields[4].size() > 1 && fields[4].front() == '0') fail("leading latency zero");
        const auto latency = number(fields[4]);
        // Views never outlive this call. Aggregates still interns owning strings.
        endpoint_.assign(endpoint);
        aggregates_.add(endpoint_, hour, static_cast<std::uint16_t>(status), latency);
        if (line_ == std::numeric_limits<std::uint64_t>::max()) {
            throw std::overflow_error("line counter overflow");
        }
        ++line_;
    }

    static constexpr std::size_t max_line_size = 176;

private:
    [[noreturn]] void fail(std::string_view message) const {
        throw std::invalid_argument("line " + std::to_string(line_) + ": " + std::string(message));
    }
    std::uint32_t number(std::string_view text) const {
        std::uint32_t value = 0;
        const auto result = std::from_chars(text.data(), text.data() + text.size(), value);
        if (text.empty() || result.ec != std::errc{} || result.ptr != text.data() + text.size()) {
            fail("numeric field is outside its unsigned range");
        }
        return value;
    }
    Aggregates& aggregates_;
    std::string endpoint_;
    std::uint64_t line_ = 1;
};

void ingest(const Options& options, Aggregates& aggregates) {
    std::ifstream input(options.input, std::ios::binary);
    if (!input) throw std::runtime_error("cannot open input file");
    Parser parser(aggregates);
    std::vector<char> buffer(options.buffer_size);
    std::string carry;
    while (input) {
        input.read(buffer.data(), static_cast<std::streamsize>(buffer.size()));
        const std::string_view block(buffer.data(), static_cast<std::size_t>(input.gcount()));
        std::size_t begin = 0;
        while (begin < block.size()) {
            const auto end = block.find('\n', begin);
            const auto length = (end == std::string_view::npos ? block.size() : end) - begin;
            if (length > Parser::max_line_size - carry.size()) {
                throw std::invalid_argument("record exceeds the official maximum length");
            }
            const auto span = block.substr(begin, length);
            if (end == std::string_view::npos) {
                carry.append(span);
                break;
            }
            if (carry.empty()) parser.consume_line(span);
            else {
                carry.append(span);
                parser.consume_line(carry);
                carry.clear();
            }
            begin = end + 1;
        }
    }
    if (input.bad() || !input.eof()) throw std::runtime_error("input read failed");
    if (!carry.empty()) throw std::invalid_argument("official records require a final LF");
}

bool unsigned_bytes_less(const std::string& left, const std::string& right) {
    return std::lexicographical_compare(
        left.begin(), left.end(), right.begin(), right.end(),
        [](char a, char b) {
            return static_cast<unsigned char>(a) < static_cast<unsigned char>(b);
        });
}

struct OutputOrder {
    std::vector<std::uint32_t> endpoints;
    std::vector<std::uint64_t> hours;
};

OutputOrder prepare_output(Aggregates& aggregates) {
    OutputOrder order;
    order.endpoints.reserve(aggregates.endpoints.size());
    for (std::size_t i = 0; i < aggregates.endpoints.size(); ++i) {
        order.endpoints.push_back(static_cast<std::uint32_t>(i));
    }
    std::sort(order.endpoints.begin(), order.endpoints.end(),
              [&aggregates](std::uint32_t left, std::uint32_t right) {
                  return unsigned_bytes_less(*aggregates.endpoints[left].name,
                                             *aggregates.endpoints[right].name);
              });
    std::vector<std::uint32_t> ranks(aggregates.endpoints.size());
    for (std::size_t i = 0; i < order.endpoints.size(); ++i) {
        ranks[order.endpoints[i]] = static_cast<std::uint32_t>(i);
    }
    order.hours.reserve(aggregates.hours.size());
    for (auto& item : aggregates.hours) {
        std::sort(item.second.latencies.begin(), item.second.latencies.end());
        order.hours.push_back(item.first);
    }
    std::sort(order.hours.begin(), order.hours.end(),
              [&ranks](std::uint64_t left, std::uint64_t right) {
                  const auto left_rank = ranks[static_cast<std::uint32_t>(left >> 32)];
                  const auto right_rank = ranks[static_cast<std::uint32_t>(right >> 32)];
                  const auto left_hour = static_cast<std::uint32_t>(left);
                  const auto right_hour = static_cast<std::uint32_t>(right);
                  if (left_hour != right_hour) return left_hour < right_hour;
                  return left_rank < right_rank;
              });
    return order;
}

// Official nearest-rank percentiles, with overflow-safe rank arithmetic.
std::uint32_t percentile(const std::vector<std::uint32_t>& sorted, unsigned percent) {
    static_assert(sizeof(std::size_t) <= sizeof(std::uint64_t));
    if (sorted.empty() || percent == 0 || percent > 100) {
        throw std::logic_error("invalid nearest-rank percentile request");
    }
    const auto count = static_cast<std::uint64_t>(sorted.size());
    const auto rank = (count / 100) * percent +
        ((count % 100) * percent + 99) / 100;
    return sorted[static_cast<std::size_t>(rank - 1)];
}

void write_number(std::ostream& output, std::uint64_t value) {
    std::array<char, 20> buffer{};
    const auto result = std::to_chars(buffer.data(), buffer.data() + buffer.size(), value);
    if (result.ec != std::errc{}) {
        throw std::logic_error("integer formatting failed");
    }
    output.write(buffer.data(), result.ptr - buffer.data());
}

void write_hour(std::ostream& output, std::uint32_t hour_key) {
    std::array<char, 20> text = {
        '0', '0', '0', '0', '-', '0', '0', '-', '0', '0',
        'T', '0', '0', ':', '0', '0', ':', '0', '0', 'Z'};
    const auto put_digits = [&text](unsigned value, std::size_t end, unsigned count) {
        for (unsigned i = 0; i < count; ++i) {
            text[end - i] = static_cast<char>('0' + value % 10);
            value /= 10;
        }
    };
    put_digits(hour_key >> 14, 3, 4);
    put_digits((hour_key >> 10) & 15, 6, 2);
    put_digits((hour_key >> 5) & 31, 9, 2);
    put_digits(hour_key & 31, 12, 2);
    output.write(text.data(), static_cast<std::streamsize>(text.size()));
}

// Exact floor(errors * 1,000,000 / count) without overflowing uint64.
// Binary long division keeps a remainder below count; errors <= count.
std::uint64_t error_ppm(std::uint64_t errors, std::uint64_t count) {
    if (count == 0 || errors > count) throw std::logic_error("invalid error fraction");
    std::uint64_t quotient = 0, remainder = 0;
    for (int bit = 19; bit >= 0; --bit) {
        quotient *= 2;
        if (remainder >= count - remainder) {
            remainder -= count - remainder;
            ++quotient;
        } else remainder *= 2;
        if ((1000000U >> bit) & 1U) {
            if (remainder >= count - errors) {
                remainder -= count - errors;
                ++quotient;
            } else remainder += errors;
        }
    }
    return quotient;
}

void serialize_summary(std::ostream& output, const Aggregates& aggregates,
                       const OutputOrder& order) {
    for (const auto key : order.hours) {
        const auto& group = aggregates.hours.at(key);
        const auto id = static_cast<std::uint32_t>(key >> 32);
        write_hour(output, static_cast<std::uint32_t>(key));
        output.put(' ');
        output << *aggregates.endpoints[id].name;
        const std::array<std::uint64_t, 6> values = {
            group.requests, percentile(group.latencies, 50), percentile(group.latencies, 95),
            percentile(group.latencies, 99), group.errors, error_ppm(group.errors, group.requests)};
        for (const auto value : values) {
            output.put(' ');
            write_number(output, value);
        }
        output.put('\n');
    }
}

void write_output(const Options& options, const Aggregates& aggregates,
                  const OutputOrder& order) {
    protect_input(options.input, options.output);
    std::ofstream output(options.output, std::ios::binary | std::ios::trunc);
    if (!output) {
        throw std::runtime_error("cannot open output file");
    }
    try {
        if (!fs::is_regular_file(options.output) || fs::is_symlink(options.output)) {
            throw std::runtime_error("opened output is not a regular file");
        }
        output.exceptions(std::ios::badbit | std::ios::failbit);
        serialize_summary(output, aggregates, order);
        output.flush();
        output.close();
    } catch (...) {
        output.exceptions(std::ios::goodbit);
        output.close();
        std::error_code ignored;
        if (fs::is_regular_file(options.output, ignored) &&
            !fs::is_symlink(options.output, ignored)) {
            fs::remove(options.output, ignored);
        }
        throw;
    }
}
}  // namespace

int main(int argc, char** argv) {
    try {
        if (argc == 2 && std::string_view(argv[1]) == "--help") {
            std::cout
                << "Usage: track-a [--data DIR] [--out DIR] [--buffer-size N]\n"
                   "Defaults: /data/requests.log -> /out/summary.txt.\n"
                   "Buffer size: 1..16777216; default 1048576.\n";
            return 0;
        }
        const auto options = parse_options(argc, argv);
        fs::create_directories(options.output.parent_path());
        protect_input(options.input, options.output);
        Aggregates aggregates;
        ingest(options, aggregates);
        const auto order = prepare_output(aggregates);
        write_output(options, aggregates, order);
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "error: " << error.what() << '\n';
        return 1;
    }
}
