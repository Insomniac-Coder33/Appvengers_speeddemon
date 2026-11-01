#include <cassert>
#include <sstream>
#define main original_solver_main
#include "/source/src/main.cpp"
#undef main
int main(int argc, char** argv) {
    assert(argc == 2);
    EndpointHash hash;
    std::equal_to<> eq;
    std::vector<std::string> values = {"", "/", "a", "aa", std::string("a\0b",3), std::string("\x80\xff",2), std::string(125,'p')};
    std::unordered_map<std::string, unsigned, EndpointHash, std::equal_to<>> map;
    for (unsigned i=0; i<values.size(); ++i) {
        const auto& owned=values[i];
        std::string scratch="X"+owned+"Y";
        const std::string_view view(scratch.data()+1,owned.size());
        assert(hash(owned)==hash(view) && eq(owned,view) && eq(view,owned));
        map.emplace(owned,i);
        assert(map.find(view)!=map.end() && map.find(view)->second==i);
        scratch.assign(300,'z');
        assert(map.find(std::string_view(owned))->second==i);
    }
    map.rehash(4096);
    for (unsigned i=0; i<values.size(); ++i) assert(map.find(std::string_view(values[i]))->second==i);
    assert(!eq(std::string("a\0b",3),std::string_view("a",1)));
    assert(map.find(std::string_view("absent"))==map.end());
    Aggregates aggregates;
    std::vector<std::string> expected;
    std::vector<const std::string*> references;
    const auto hour=parse_timestamp_hour("2026-11-01T00:00:00.000000Z");
    for (unsigned i=0; i<512; ++i) {
        std::string scratch="/"+std::string(100,'p')+std::to_string(i);
        expected.push_back(scratch);
        aggregates.add(std::string_view(scratch),hour,i%3==0?500:499,i*7919U);
        references.push_back(aggregates.endpoints.back().name);
        scratch.assign(300,'x');
    }
    for (unsigned i=512; i-- > 0;) {
        std::string scratch=expected[i];
        aggregates.add(std::string_view(scratch),hour,599,4294967295U-i);
        scratch.assign(300,'y');
    }
    assert(aggregates.endpoints.size()==512);
    for (unsigned i=0;i<512;++i) {
        assert(aggregates.endpoints[i].name==references[i]);
        assert(*references[i]==expected[i]);
    }
    const auto order=prepare_output(aggregates);
    std::ofstream output(argv[1],std::ios::binary);
    output.exceptions(std::ios::badbit|std::ios::failbit);
    serialize_summary(output,aggregates,order);
    output.close();
    std::cout << "PASS identical hashes, exact equality, mutable input ownership, rehash references and aggregation\n";
}
