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
    bool contract_seen = false;
    bool input_seen = false;
    bool output_seen = false;
    bool buffer_seen = false;
    for (int i = 1; i < argc; ++i) {
        const std::string_view name = argv[i];
        if (name != "--contract" && name != "--input" &&
            name != "--output" && name != "--buffer-size") {
            throw std::invalid_argument("unknown option: " + std::string(name));
        }
        if (i + 1 == argc) {
            throw std::invalid_argument("missing value for " + std::string(name));
        }
        const std::string_view value = argv[++i];
        if (name == "--contract") {
            if (contract_seen || value != "local-v1") {
                throw std::invalid_argument("--contract must appear once with value local-v1");
            }
            contract_seen = true;
        } else if (name == "--input") {
            if (input_seen || value.empty()) {
                throw std::invalid_argument("--input must appear once with a nonempty path");
            }
            input_seen = true;
            options.input = argv[i];
        } else if (name == "--output") {
            if (output_seen || value.empty()) {
                throw std::invalid_argument("--output must appear once with a nonempty path");
            }
            output_seen = true;
            options.output = argv[i];
        } else {
            if (buffer_seen) {
                throw std::invalid_argument("--buffer-size must appear at most once");
            }
            buffer_seen = true;
            const auto size = parse_unsigned_option(value);
            if (size < 1 || size > 16777216) {
                throw std::invalid_argument("--buffer-size must be between 1 and 16777216");
            }
            options.buffer_size = static_cast<std::size_t>(size);
        }
    }
    if (!contract_seen || !input_seen || !output_seen) {
        throw std::invalid_argument("--contract local-v1, --input and --output are required");
    }
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

// This is the provisional local-v1 timestamp policy, not an official contract.
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
        throw std::invalid_argument("timestamp component is outside the local-v1 range");
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
};

struct EndpointState {
    const std::string* name;
    std::vector<std::uint32_t> latencies;
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
            endpoints.push_back(EndpointState{&found->first, {}});
        }
        const auto id = found->second;
        append_latency(endpoints[id].latencies, latency);
        const auto key = (static_cast<std::uint64_t>(id) << 32) | hour;
        auto& counters = hours[key];
        if (counters.requests == std::numeric_limits<std::uint64_t>::max()) {
            throw std::overflow_error("hourly request count overflow");
        }
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

    void consume(unsigned char byte) {
        if (pending_cr_) {
            if (byte != '\n') {
                fail("CR must be followed by LF");
            }
            pending_cr_ = false;
            finish_record();
            return;
        }
        if (byte == '\r') {
            pending_cr_ = true;
            return;
        }
        if (byte == '\n') {
            finish_record();
            return;
        }
        if (byte == ' ') {
            if (between_fields_) {
                return;
            }
            if (!field_has_bytes_) {
                fail("leading spaces or an empty record are not allowed");
            }
            finish_field();
            if (field_ == 4) {
                fail("trailing spaces or extra fields are not allowed");
            }
            ++field_;
            field_has_bytes_ = false;
            between_fields_ = true;
            return;
        }
        if (byte < 32 || byte == 127) {
            fail("control bytes are not allowed in fields");
        }
        between_fields_ = false;
        field_has_bytes_ = true;
        record_started_ = true;
        if (field_ == 0) {
            if (timestamp_size_ == timestamp_.size()) {
                fail("timestamp is longer than 27 bytes");
            }
            timestamp_[timestamp_size_++] = static_cast<char>(byte);
        } else if (field_ == 2) {
            endpoint_.push_back(static_cast<char>(byte));
        } else if (field_ == 3) {
            accumulate_number(byte, status_, std::numeric_limits<std::uint16_t>::max());
        } else if (field_ == 4) {
            accumulate_number(byte, latency_, std::numeric_limits<std::uint32_t>::max());
        }
    }

    // Only endpoint payload bytes use spans. Delimiters, controls, CR state,
    // and every other field still pass through the original scalar machine.
    void consume_buffer(std::string_view bytes) {
        std::size_t offset = 0;
        while (offset < bytes.size()) {
            if (field_ == 2 && !pending_cr_) {
                const auto begin = offset;
                while (offset < bytes.size()) {
                    const auto byte = static_cast<unsigned char>(bytes[offset]);
                    if (byte <= 32 || byte == 127) {
                        break;
                    }
                    ++offset;
                }
                if (offset != begin) {
                    endpoint_.append(bytes.data() + begin, offset - begin);
                    between_fields_ = false;
                    field_has_bytes_ = true;
                    record_started_ = true;
                }
                if (offset == bytes.size()) {
                    break;
                }
            }
            consume(static_cast<unsigned char>(bytes[offset++]));
        }
    }

    void finish_input() {
        if (pending_cr_) {
            fail("input ends with a bare CR");
        }
        if (record_started_) {
            finish_record();
        }
    }

private:
    [[noreturn]] void fail(std::string_view message) const {
        throw std::invalid_argument("line " + std::to_string(line_) + ": " +
                                    std::string(message));
    }

    void accumulate_number(unsigned char byte, std::uint32_t& value,
                           std::uint32_t maximum) const {
        if (byte < '0' || byte > '9') {
            fail("status and latency must contain only ASCII digits");
        }
        const auto digit = static_cast<std::uint32_t>(byte - '0');
        if (value > (maximum - digit) / 10) {
            fail("numeric field exceeds its unsigned range");
        }
        value = value * 10 + digit;
    }

    void finish_field() {
        if (field_ == 0) {
            try {
                hour_ = parse_timestamp_hour(
                    std::string_view(timestamp_.data(), timestamp_size_));
            } catch (const std::invalid_argument& error) {
                fail(error.what());
            }
        }
    }

    void finish_record() {
        if (!record_started_) {
            fail("blank records are not allowed");
        }
        if (field_ != 4 || between_fields_ || !field_has_bytes_) {
            fail("record must contain exactly five nonempty fields");
        }
        aggregates_.add(endpoint_, hour_, static_cast<std::uint16_t>(status_), latency_);
        field_ = 0;
        field_has_bytes_ = false;
        between_fields_ = false;
        record_started_ = false;
        timestamp_size_ = 0;
        endpoint_.clear();
        status_ = 0;
        latency_ = 0;
        if (line_ == std::numeric_limits<std::uint64_t>::max()) {
            throw std::overflow_error("line counter overflow");
        }
        ++line_;
    }

    Aggregates& aggregates_;
    std::array<char, 27> timestamp_{};
    std::size_t timestamp_size_ = 0;
    std::string endpoint_;
    std::uint32_t hour_ = 0;
    std::uint32_t status_ = 0;
    std::uint32_t latency_ = 0;
    std::uint64_t line_ = 1;
    unsigned field_ = 0;
    bool field_has_bytes_ = false;
    bool between_fields_ = false;
    bool record_started_ = false;
    bool pending_cr_ = false;
};

void ingest(const Options& options, Aggregates& aggregates) {
    std::ifstream input(options.input, std::ios::binary);
    if (!input) {
        throw std::runtime_error("cannot open input file");
    }
    Parser parser(aggregates);
    std::vector<char> buffer(options.buffer_size);
    while (input) {
        input.read(buffer.data(), static_cast<std::streamsize>(buffer.size()));
        const auto count = input.gcount();
        parser.consume_buffer(std::string_view(buffer.data(), static_cast<std::size_t>(count)));
    }
    if (input.bad() || !input.eof()) {
        throw std::runtime_error("input read failed");
    }
    parser.finish_input();
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
        auto& latencies = aggregates.endpoints[i].latencies;
        std::sort(latencies.begin(), latencies.end());
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
    for (const auto& item : aggregates.hours) {
        order.hours.push_back(item.first);
    }
    std::sort(order.hours.begin(), order.hours.end(),
              [&ranks](std::uint64_t left, std::uint64_t right) {
                  const auto left_rank = ranks[static_cast<std::uint32_t>(left >> 32)];
                  const auto right_rank = ranks[static_cast<std::uint32_t>(right >> 32)];
                  if (left_rank != right_rank) {
                      return left_rank < right_rank;
                  }
                  return static_cast<std::uint32_t>(left) <
                         static_cast<std::uint32_t>(right);
              });
    return order;
}

// Nearest-rank integer percentiles are deliberately provisional local-v1 policy.
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

void write_hex(std::ostream& output, const std::string& text) {
    constexpr char digits[] = "0123456789abcdef";
    for (const char character : text) {
        const auto byte = static_cast<unsigned char>(character);
        output.put(digits[byte >> 4]);
        output.put(digits[byte & 15]);
    }
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

void serialize_local_v1(std::ostream& output, const Aggregates& aggregates,
                        const OutputOrder& order) {
    output << "{\"contract\":\"local-v1\",\"endpoints\":[";
    bool first = true;
    for (const auto id : order.endpoints) {
        const auto& endpoint = aggregates.endpoints[id];
        if (!first) {
            output.put(',');
        }
        first = false;
        output << "{\"endpoint_hex\":\"";
        write_hex(output, *endpoint.name);
        output << "\",\"count\":";
        write_number(output, static_cast<std::uint64_t>(endpoint.latencies.size()));
        output << ",\"p50_us\":";
        write_number(output, percentile(endpoint.latencies, 50));
        output << ",\"p95_us\":";
        write_number(output, percentile(endpoint.latencies, 95));
        output << ",\"p99_us\":";
        write_number(output, percentile(endpoint.latencies, 99));
        output.put('}');
    }
    output << "],\"hours\":[";
    first = true;
    for (const auto key : order.hours) {
        const auto id = static_cast<std::uint32_t>(key >> 32);
        const auto& counters = aggregates.hours.at(key);
        if (!first) {
            output.put(',');
        }
        first = false;
        output << "{\"endpoint_hex\":\"";
        write_hex(output, *aggregates.endpoints[id].name);
        output << "\",\"hour_utc\":\"";
        write_hour(output, static_cast<std::uint32_t>(key));
        output << "\",\"requests\":";
        write_number(output, counters.requests);
        output << ",\"errors\":";
        write_number(output, counters.errors);
        output << ",\"rate_numerator\":";
        write_number(output, counters.errors);
        output << ",\"rate_denominator\":";
        write_number(output, counters.requests);
        output.put('}');
    }
    output << "]}\n";
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
        serialize_local_v1(output, aggregates, order);
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
                << "Usage: track-a --contract local-v1 --input PATH --output PATH "
                   "[--buffer-size N]\n"
                   "Provisional local contract only. Buffer size: 1..16777216; "
                   "default 1048576.\n";
            return 0;
        }
        const auto options = parse_options(argc, argv);
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
