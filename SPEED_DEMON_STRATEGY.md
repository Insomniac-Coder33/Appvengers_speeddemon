# Speed Demon: solution and prize strategy

Initial analysis: 19 October 2026. Second audit completed: 20 October 2026. Intended participant: one developer with AI assistance. Scope: solution design, competitive reasoning, correctness, and selection criteria. This document contains no competition implementation. The second audit adds effort-based entry decisions and operational preparation in [SPEED_DEMON_NEXT_STEPS.md](SPEED_DEMON_NEXT_STEPS.md).

**1. Recommended direction**

My recommendation after the second audit is **A first, with a deliberate choice between a specialist entry and expanding to three qualifying tracks**. C is the preferred second candidate; B is a provisional third candidate, with D compared against it after the specifications arrive. A+C+B is an overall-title option, not a proven highest-probability strategy for winning any prize. Protect specialist performance and a real optimization write-up if expansion would dilute them. Do not commit to E without an unusually strong compression opportunity.

This is a judgment about controllable risk for a solo participant, not a claim about numerical winning odds. We do not know the competitors, final task contracts, reference source sizes for every track, or actual holdout performance. There is no defensible globally optimal algorithm or guaranteed winning portfolio yet.

| Track | Proposed role | Main advantage | Main reason to reconsider |
| --- | --- | --- | --- |
| A: Ingest | Flagship; specialist-award candidate | Large known memory headroom; exact statistics need little raw storage | Parser throughput, accounting, or reference semantics differ from expectations |
| C: Join | Conditional second entry; possible lean entry | Remove string materialization and potentially most join operations | CSV/number/join semantics or validation effort make expansion unattractive |
| B: Index | Conditional overall third | Clear opportunities in representation, intersections, and phrase verification | Tokenization or tenfold index storage makes a reliable entry too costly |
| D: Traverse | Conditional replacement for B | Potentially exceptional reduction in search work | Unknown topology and the fastest-entry speed floor create substantial variance |
| E: Compress | Specialist alternative, not default | Reversible binary transforms may expose major redundancy | Custom codec correctness, decoder tuning, and source cost compete for solo attention |

The distinguishing idea is **to remove work before accelerating instructions**: retain only exact sufficient data in A, shrink the relation before joining in C, and eliminate impossible documents before checking positions in B. These techniques are established engineering ideas; the competitive contribution is applying them accurately, choosing the right tradeoffs, and proving their effect on this workload.

Three balanced, eligible entries are the route to the overall title. Two entries do not qualify. Entering more tracks is not automatically beneficial; confirm how extra tracks affect the geometric mean. A+C+B is a target portfolio, not a commitment to submit a weak B just to reach three.

Prize objectives must remain distinct. Human-review quality changes track totals and therefore overall ranking; it does not directly raise K for the highest-K award. The write-up award requires a separate publication route. The lean award's exact ordering and prize stacking need clarification. The published cash breakdown does not specify a separate cash award for every track, even though promotional wording mentions per-track prizes. Another completed track is therefore not automatically another independent cash-prize opportunity.

**2. What the guide establishes, and what remains open**

The supplied [participation guide](SPEED_DEMON_GUIDE.md) is the basis for the workload descriptions, rules, numerical baselines, and constraints used below. Its distinction between published facts and engineering guidance is appropriate.

The current organizer site schedules final specifications and the harness for 28 October, before the coding window opens on 30 October. As of this analysis, the overview therefore cannot settle all semantics. Advance design is allowed; project implementation belongs inside the permitted window. [Organizer release information and rules](https://speeddemon.dev/).

The central unresolved contracts are percentile ranks, timestamp normalization, Boolean grammar, tokenizer behavior, CSV BOM boundaries, duplicate joins, numerical reduction, graph output requirements, compression interfaces, source accounting, and the exact scaling generator. None should be inferred from a few preview rows.

One technical clarification matters immediately: cgroup `memory.peak` is not simply process RSS. Cgroup accounting includes anonymous memory, charged file cache, and kernel allocations; tmpfs also consumes accounted memory. Page-cache ownership and host prewarming can affect which cgroup receives charges. Consequently, neither “mapping a 312 MB file necessarily adds 312 MB to our score” nor “streaming guarantees a tiny score” is justified without the harness. [Linux cgroup v2 documentation](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html).

**3. The score changes which optimizations are worth doing**

Using the formula in the guide, in the region where the ratio caps and final score clamps are inactive:

`track total = (65 / ln(25)) × ln(K) + 0.35 × judge score`

The following are calculated consequences, not organizer targets or predicted results:

| Improvement, with other scoring ratios unchanged | Added final track points |
| --- | ---: |
| Halve runtime | 5.60 |
| Halve measured memory, or compressed bytes in E | 2.80 |
| Halve normalized source size | 2.10 |
| Halve dependency weight, when possible | 2.10 |
| Halve scaling ratio | 1.40 |
| Improve normalized judge score by 10 points | 3.50 |

A ten-point judging improvement is worth approximately a 1.54-fold runtime improvement under those assumptions. Documentation cannot replace a qualifying program, but technical clarity and real experimental evidence are significant parts of the optimization objective.

There is a subtle coupling: `X = T10 / T1`. Below the caps, the joint time/scaling factor can be rewritten as:

`(Tref1/T1)^0.30 × (Tref10/T10)^0.10`

This assumes X uses the same time measure as T; the harness must confirm that for multi-phase tracks. Halving both normal and tenfold runtime earns the full 5.60 points. Halving only normal runtime while leaving tenfold runtime unchanged earns about 4.20, because X worsens. Deliberately slowing normal execution to flatter X loses score in this region and is not a useful optimization.

The cap also creates stopping points. With A's published baseline, its time ratio saturates at **0.824 seconds**, and its memory ratio saturates at **58.8 MB**, using consistent units. These are mathematical thresholds, not measured promises. Once an axis saturates, improve other axes or another track; further improvement can still matter for eligibility, tie-breaks, headroom, or readability.

For a proposed optimization, compare the whole change:

`Δln(K) = 0.40 ln(Told/Tnew) + 0.20 ln(Mold/Mnew) + 0.15 ln(Sold/Snew) + 0.15 ln(Dold/Dnew) + 0.10 ln(Xold/Xnew)`

Use capped reference ratios instead where a cap is crossed. Examples with other ratios fixed:

- Doubling source size needs more than a 1.297-fold runtime improvement merely to break even on machine score.
- Doubling memory needs more than a 1.414-fold runtime improvement.
- Doubling dependency weight has the same machine-score cost as doubling source size.
- A dependency-free implementation at D=1 cannot improve that axis further. Dependencies must justify their cost, but rejecting one that substantially improves correctness or speed can also be a bad decision.

The overall score creates another tradeoff. Illustrative totals of 80, 55, and 45 have a geometric mean of 58.28; three totals of 65 produce 65. For fixed track count, a one-point gain in a weak track has greater relative impact than a one-point gain in a strong track. However, expected improvement per unit of effort and the risk of failing a gate still matter.

If all submitted qualifying tracks count, adding a fourth helps the mean only when its score exceeds the existing mean. If only a selected subset counts, that conclusion changes. Resolve this rule before deciding to expand the portfolio.

**4. Track A: exact statistics with compact storage**

Recommended design: a bounded byte parser, dynamically assigned endpoint IDs, compact counters, exact latency storage, and deterministic serialization. Parse only the information the answer needs. Do not construct a general log-record object for every line.

The important arithmetic is simple: 3.1 million `uint32` latency values occupy **12.4 MB** of raw payload. If record count grows tenfold, that payload becomes **124 MB**. Endpoint names, capacity slack, worker buffers, hourly state, runtime overhead, and charged file pages are additional. These numbers nevertheless show why approximate percentile sketches and giant histograms are unnecessary starting points.

Store each endpoint string once, compare actual bytes after a hash match, and retain latency values in compact groups. Dictionary IDs must arise from the current input. The preview endpoint count and popular paths are sizing hints, not a closed vocabulary.

For percentiles, first determine the exact required rank or interpolation formula. Then compare small-group sorting with exact selection for large groups. Several requested ranks can share partition work; if interpolation needs adjacent ranks, select those too. A bounded or introspective selection strategy avoids an adversarial quickselect pivot becoming a serious tail. Sorting can win for small groups because overhead dominates there.

The default is not a histogram per endpoint. A 65,536-bin histogram of 32-bit counters for each of 1,842 endpoints already costs about 483 MB and still does not cover the full latency domain. Radix selection is an optional candidate for very large groups, not a reason to replace a straightforward compact representation prematurely.

Timestamp work should match the output. If the final contract guarantees canonical UTC timestamps and only hourly buckets are needed, extracting a canonical date-and-hour key can avoid parsing unused microseconds. If offsets are allowed or buckets are defined in UTC independently of representation, normalization is necessary. Per-shard monotonicity does not imply globally increasing timestamps.

Parallel parsing is a measured option. Worker-local counters avoid contention, but duplicated dictionaries, vector capacity, and final merging can erase the memory advantage. A latency must be counted exactly once across partitions. Percentiles cannot be obtained by averaging worker percentiles: merge exact underlying values or an exact rank-capable representation.

Complexity target: one pass over input bytes, plus expected linear total selection work or per-group sorting; memory proportional to retained latencies and distinct aggregate keys. Large endpoint cardinality and many hour buckets must be included in the bound.

**A correctness matrix**

| Case family | Required reasoning |
| --- | --- |
| Small groups | Counts 1, 2, and values near percentile-rank transitions; absent groups only if output requires them |
| Distributions | All equal; sorted/reverse sorted; huge outlier; repeated boundary values; one hot endpoint; mostly unique endpoints |
| Numeric bounds | Latency 0 and maximum uint32; counter overflow; interpolation width and rounding |
| Error definition | Distinguish 499, 500, 599, and 600; correct denominator and grouping |
| Time | Hour/day/month/year boundaries; interleaved shards; offsets and leap seconds only as permitted by the spec |
| Endpoint identity | Long paths, common prefixes, byte differences, hash collisions, keys absent from samples |
| Input boundaries | Missing final newline, CRLF if legal, final partial buffer, line spanning several buffers |
| Output | Sorting of endpoints/hours, omitted versus zero groups, fixed precision, final newline |

Metamorphic check: permuting valid records should preserve these aggregates if the specified numeric reduction is order-independent. Splitting work into different chunk sizes and worker counts must preserve exact output.

**5. Track C: parse fully, materialize selectively, aggregate early**

The baseline candidate fuses a correct CSV state machine, projection of needed fields, lookup, and aggregation. Every byte affecting syntax must still be interpreted; avoiding copies of `name` and `note` does not permit skipping their quote and newline rules.

The more distinctive candidate is **aggregate by join key before joining**. If the final result needs decomposable statistics such as exact sum and count grouped by a region label, first build per-`region_id` statistics while parsing. Then join each distinct ID to its lookup rows and combine by final output group. With N fact rows and K distinct join IDs, this can reduce approximately N lookup-table probes to K, while still scanning the input once. Every fact row still needs routing to its aggregate state. If the original join is already a cheap dense-array access, early grouping may add complexity without saving time.

The algebraic justification is that exact addition and counting can be regrouped when the join maps each row using only the retained key and all required multiplicities are preserved. This is an application of an established database optimization, not a claim to invent it. [Research on performing group-by before join](https://www.microsoft.com/en-us/research/publication/performing-group-by-before-join/).

This transformation is valid only under the actual semantics:

- The aggregate state retains everything the final answer requires. Average needs both sum and count; distinct counts, medians, and row-level output require different reasoning.
- Join predicates and filters do not depend on discarded fact fields.
- Missing-key and null behavior are preserved.
- Duplicate lookup rows preserve the specified multiplicity. A map that silently keeps the last duplicate is not equivalent to a one-to-many join.
- Numerical regrouping is allowed. Exact scaled-integer addition is associative; IEEE floating-point addition generally is not. The mathematically nicer answer can still fail the reference hash.

If these conditions fail, use the fused per-record join. Both candidates can avoid materializing irrelevant strings and sort only the final aggregate groups.

For amounts, use a scaled integer only if the contract establishes decimal semantics, permitted precision, and sufficient bounds. Determine the accumulator width from maximum magnitude times maximum contributing rows, including join multiplicity. Preserve the mandated rounding and negative-zero representation. Do not reinterpret a floating-point reference as exact decimal arithmetic without authorization from the spec.

A single-pass state machine is the default CSV design. A parallel extension could summarize each byte block's parser-state transition, compose those summaries, and start parsing each block in its correct state. That requires accounting for quote escapes, CRLF, BOM state, and field position. Merely splitting at newlines or counting quotes is insufficient as a general parser. For a solo entry, keep this extension only if parsing is demonstrably the limiting cost and the source increase pays for itself.

Complexity target: O(fact bytes + lookup bytes + distinct join keys + grouped join matches + output-group sorting), with expected constant-time dictionary operations. The grouped-join term matters for duplicate lookup keys and one-to-many matches. A dense lookup array is justified only when actual key bounds make it compact; otherwise a sparse representation is safer.

**C correctness matrix**

| Case family | Required reasoning |
| --- | --- |
| Quoting | Quoted commas, doubled quotes, quote at buffer end, empty quoted field, closing quote before delimiter/EOF |
| Records | Newline inside quotes; CRLF split across buffers; mixed LF/CRLF; final record without terminator |
| BOM | Marker split across buffers; permitted chunk markers versus U+FEFF inside field data; never strip matching bytes globally |
| Empty values | Empty string versus missing/null; trailing empty field; blank record and header behavior |
| Shape | Exactly five columns; too many/few columns and malformed quote behavior only as specified |
| Numbers | Negative amounts, optional plus/space/exponent only if legal, precision boundaries, large totals, cancellation, negative zero |
| Join | Missing key, duplicate lookup key, multiple IDs mapping to one label, duplicates in facts, unused lookup rows |
| Large state | One huge field, high key cardinality, skew, collision-heavy hashes, aggregate-table resizing |
| Ordering | Byte or locale collation, tie handling, empty labels, numeric formatting |

The strongest proof experiment for early aggregation is comparing it with a simple join-then-group oracle on tiny inputs containing duplicate lookup rows, missing keys, merged labels, negative amounts, and relevant numeric extremes. Equivalent CSV encodings of the same logical records must produce identical results when the spec defines them as equivalent.

**6. Track B: compact postings and selective exact query evaluation**

B is the proposed third track because its principal uncertainties should become explicit in the tokenizer and query contracts. It is still a substantial task, especially at tenfold input. It is not a harmless add-on.

Represent the index as a term dictionary, sorted document postings, and token positions. Processing documents in increasing ID order allows sorted appends; parallel construction needs an ordered merge or another way to restore that invariant. Keep document membership separate from position payloads so Boolean evaluation does not decode positional information. Prefer flat arrays and ranges to an object or hash set for every occurrence.

Do not assume raw four-byte positions are the whole memory cost. If the corpus contains U token occurrences, just those positions cost 4U bytes; document IDs, ranges, dictionary text, capacity slack, and construction transients add more. At tenfold input the analogous term is 40U, if token count grows proportionally. Actual token density and vocabulary growth decide whether delta encoding or packed positions are worthwhile.

For Boolean queries:

- Intersect sorted postings directly rather than building temporary sets.
- Within a provably commutative AND subtree, start from selective lists; use galloping advancement when list lengths are very different.
- Merge OR branches with deduplication.
- Apply NOT relative to the exact document universe. Preserve the specified grammar and associativity; do not freely reorder mixed operators.
- A compact bitset can help very common terms, but bitsets for every term may waste memory. Treat any frequency threshold as a measured choice.

For phrases, start with a rare phrase term. If that term occurs at position p and phrase offset j, check the other terms at the corresponding positions `p + i - j`, staying within the same document and guarding against negative positions or unsigned underflow. This preserves exact phrase semantics while avoiding broad position-list cross products. Repeated words and overlapping matches require careful handling. Boolean document membership alone cannot establish a phrase match. Sorted-list intersection and positional verification are established search techniques; the choice of representation and evaluation order is workload dependent. [Boolean query processing](https://nlp.stanford.edu/IR-book/html/htmledition/processing-boolean-queries-1.html), [positional indexes](https://nlp.stanford.edu/IR-book/html/htmledition/positional-indexes-1.html).

Compact delta-coded postings can reduce memory traffic, but decoding adds work and source. Keep compression only if the combined construction/query time, measured memory, and source score improve. A rare-term anchor plus simple position arrays may beat a sophisticated codec.

A small repeated-query cache is an optional optimization for repeats in the current workload. It must include all semantic query distinctions, preserve output order, and remain bounded. Never ship cached answers. Do not build a query-specific partial index unless the specification permits query visibility during construction and the resulting artifact satisfies the actual index contract.

Complexity target: expected linear indexing in input/tokens, with query work proportional to postings and positions actually examined plus output size. Broad OR/NOT queries and extremely common phrases can force large work; no indexing trick makes mandatory output free.

**B correctness matrix**

| Case family | Required reasoning |
| --- | --- |
| Tokenization | Case folding, punctuation, apostrophes, hyphens, digits, Unicode, combining characters; follow reference exactly |
| Documents | Empty document, term absent from all documents, IDs/order, phrase must not cross document boundary |
| Boolean grammar | Left associativity versus precedence; unary/binary NOT; repeated operators and parentheses only if supported |
| Set semantics | Duplicate terms, duplicate matches, empty intersection, universal complement, NOT of an absent term |
| Phrase semantics | Stopwords retained; repeated word; phrase longer than document; overlapping matches; first/last position |
| Position coding | Maximum delta, zero/one delta, integer width, block end, malformed queries only if in scope |
| Query distribution | All identical, all unique, very long queries, common-term OR, mostly negative clauses |
| Serialization | Required document ordering, duplicates, no-hit formatting, exact correspondence to original query order |

**7. Why D is a challenger rather than the solo default**

A strong general candidate is forward/reverse compressed sparse row adjacency, exact bidirectional Dijkstra, compact priority queues, and reusable search state. Dense node IDs are useful for arrays. Avoid clearing all n distances on every query when only a small subset is visited; touched lists or generation stamps can reduce reset work.

Use 64-bit path distances and guard additions. A uint32 edge bound does not imply a uint32 path bound. With nonnegative weights, bidirectional termination must use a valid lower bound and the best complete path found so far. Stopping at the first meeting vertex is wrong in general. Stale priority-queue entries must not corrupt the stopping test.

Inspect repeated sources and targets if query visibility permits it. Several targets for one source can share a forward search; several sources for one target can share a reverse search. Stop only when the required targets are settled or unreachability is established. Keep original output order.

Preprocessing has to repay its own time. For additional preprocessing cost P and per-query saving d over Q applicable queries, `P < Q × d` is only the time break-even condition. Any extra memory and source cost makes the full score requirement stricter; a reduction in those costs can offset some added time.

Landmark A* is an exact candidate for suitable graphs; directed lower bounds need the correct forward and reverse distance formulas, and unreachable landmarks must be handled. Its usefulness depends on search-space reduction and preprocessing cost. [Original directed landmark research](https://www.microsoft.com/en-us/research/publication/computing-the-shortest-path-a-search-meets-graph-theory/). Full contraction hierarchies are not the default simply because they work well on road networks. The graph preview does not establish road-network structure.

One promising, optional variation is **contracting low-degree vertices while preserving all query endpoints**. First discard nonnegative self-loops and reduce parallel edges to their minimum when only distances matter. For a nonterminal vertex v, replace every pair `u -> v -> w` with a shortcut `u -> w` weighted by the sum, again reducing parallel edges and dropping self-loops. If v has at most one incoming or at most one outgoing edge after reduction, the number of edges cannot increase. Nonterminal vertices with no incoming or no outgoing edges can be removed. Original paths through v map to shortcuts; every shortcut expands to an original walk. With nonnegative weights this preserves terminal distances.

This is not free: mutable forward/reverse adjacency, duplicate management, wider shortcut weights, and rebuilding compact arrays may cost more than the saved queries. If queries are hidden during preprocessing, the simple endpoint-protection design is not applicable. If actual paths or tie-sensitive output are required, provenance and reconstruction introduce additional requirements. Keep this as a hypothesis with a proof obligation, not as the promised winning trick.

Using the preview node count 1,740,512 solely as an example, 32-bit destinations/weights and 32-bit offsets give forward plus reverse CSR payload of `16m + 8(n+1)`, approximately **93.9 MB**. Bidirectional uint64 distances plus uint32 stamps add about **41.8 MB per worker**, excluding heaps. If both n and m grow tenfold, six such workers and the graph already require about **3.45 GB**. Indexed heaps can push that subtotal toward **5.12 GB**; input staging, construction peaks, and charged memory remain extra. Shortcut weights can also enlarge edges. Worker count must fit the actual tenfold memory budget.

D's main edge cases are zero-weight edges/cycles, self-loops, duplicate and asymmetric edges, disconnected components, same-source/target queries, long paths, high-degree hubs, stale queue entries, exhausted frontiers, and stamp wraparound. Different strongly connected components do not by themselves prove unreachability: the condensation graph can have paths between them.

The reason to choose D over B would be evidence that a bounded, explainable graph method is competitive on the released distribution, including its speed floor. Correctness alone cannot establish that.

**8. E's most interesting specialist opportunity**

For E, with source, dependencies, and scaling fixed and score ratios uncapped, maximizing K is equivalent to minimizing **T squared times compressed bytes**, where T is the harness's actual time aggregate. A codec 10% slower must produce over **17.36% fewer bytes** to break even. Halving bytes tolerates less than a square-root-of-two slowdown. Decoder throughput therefore deserves unusually strong attention.

The preview's binary sensor segment is only 22% of raw bytes but approximately 45% of the sum of independently compressed segment sizes implied by the displayed per-segment ratios. This is an indicative calculation, not a reconciliation with the separate whole-corpus ratio. It suggests examining binary redundancy before spending all effort on prose.

A plausible specialist design is a simple custom block codec with fast literal/match decoding, plus a small number of reversible transforms. For verified sensor frames, candidates include column deinterleaving, XOR of successive uint32 bit patterns in a column, and byte/bit shuffling. Each transform and parameter needed for inversion must be encoded in the stream. Float arithmetic is inappropriate for bit-exact reconstruction of NaNs, signed zeros, and arbitrary payloads. Bit shuffling is a reversible rearrangement, not compression by itself; a coder must exploit the resulting patterns. [Bitshuffle author's description](https://github.com/kiyo-masui/bitshuffle).

Every block needs a literal/raw escape when compression expands it. Block metadata, dictionary resets, and decoder state must be included in the size. A generic byte codec remains the fallback for unexpected content. Parsing and reserializing JSON or logs is unsafe unless the representation preserves every original byte, including whitespace and number spelling.

Required edge families include empty/tiny blocks, exact block boundaries, incompressible bytes, all-zero runs, embedded zero bytes, long matches, overlapping LZ copies, maximal offsets/lengths, partial sensor frames, endianness, NaN payloads, signed zero, and independent decoder startup. The decoder must reconstruct from its permitted inputs without a retained original file or encoder process state. Corrupt-stream behavior is relevant only where the contract demands it.

E could be excellent for a compression specialist, but it is a less predictable third-track commitment for this solo entry.

**9. Cross-track edge cases and constraints that can erase a good score**

The following cases extend the per-track matrices. They are design questions to resolve against legal input domains, not an instruction to support every malformed format imaginable.

| Area | Failure to exclude |
| --- | --- |
| Exact bytes | Correct mathematical values but wrong sort order, decimal precision, whitespace, encoding, or terminal newline |
| Parsing boundaries | Tokens, UTF-8 sequences, BOMs, quotes, or CRLF split at every possible buffer position |
| Numeric behavior | Overflow in counters, offsets, lengths, products, path sums, or intermediate rounding |
| Memory | Vector growth overlaps, old/new hash tables alive together, worker-local duplication, large stack arrays, tmpfs, output cache |
| Scaling | Tenfold bytes may change distinct keys, vocabulary, graph size, query count, or maximum record length differently |
| Hashing | Collision resolution checks full identity; no assumption that hash alone identifies a key |
| Concurrency | No data races; exact partition ownership; deterministic output and permitted reduction ordering |
| CPU assumptions | Instructions supported on the actual host; local compiler flags do not silently target another machine |
| I/O | Short reads/writes, required file names, prescribed output count, allowed scratch only, clean exit |
| Packaging | Available offline toolchain/base image; no hidden package fetch or local absolute path |
| Accounting | Compiler/runtime classification, generated/vendored code, tests and shared-source inclusion follow official scripts |
| Holdout | No hardcoded keys, records, seeds, filenames beyond contract, output digests, or saved answers |
| Eligibility | Timeout, fastest-entry speed floor, memory cap, and five-run correctness are separate conditions |

Use a language the developer can inspect and debug confidently. A standard-library-oriented C++ or Rust solution is a reasonable systems design choice; an unfamiliar language switch is not justified by theoretical speed alone. This document does not settle the language before knowing that familiarity and the offline toolchain.

**10. Evidence that would make the entry stand out**

The best technical story is a small number of large, defensible reductions in work, backed by exact results. AI-generated volume, complicated assembly, and an attractive demonstration do not establish this.

Each promoted optimization should have a short, reviewable argument:

| Claim | Evidence required |
| --- | --- |
| A stores less without losing accuracy | Every required latency rank is recoverable; exact sample/hash agreement; real peak memory |
| C avoids most joins | Algebraic conditions; duplicate/missing-key tests; measured join-operation reduction |
| B phrase anchoring saves work | Exact offset argument; repeated-term cases; candidate/position checks and whole-task time |
| D preprocessing pays | Included preprocessing time; full query batch; memory/source effect; topology sensitivity |
| E transform helps | Independent byte-exact round trip; total encoded bytes; both encode/decode time |

The evidence should separate algorithm correctness, serialization correctness, and container correctness. A simple independent oracle is especially valuable because an optimized candidate and a copied version can share the same mistake. Small exhaustive or randomized cases should cover legal boundary values; use metamorphic checks only when the transformation preserves the task's actual semantics.

Ablations should isolate the contribution of each important choice: turn off early grouping, compact IDs, phrase anchoring, or an encoding transform and observe what changes. Profile explanations should agree with measured work: fewer allocations, bytes retained, joins performed, postings visited, or edges relaxed. End-to-end measurements decide whether those changes help the score.

The write-up should explain an actual failed hypothesis as carefully as a successful one, include revisions and input identities, and show uncertainty in repeated timings. Never construct an invented optimization history. Treat public write-up submission as a separate deliverable requiring the event's publishing conditions; a repository PERF file alone may not enter that award.

For a solo developer, AI is most useful for independently challenging invariants, generating adversarial legal cases, checking arithmetic, and reviewing subtle optimizations. The developer still needs to explain every critical assumption. Multiple AI analyses are not a correctness proof when they share the same premise.

**11. What could change the recommendation**

| Unanswered fact | Consequence for solution choice |
| --- | --- |
| A percentile/interpolation and time rules | Determines exact selection ranks and whether hour extraction is valid |
| C aggregate and numeric semantics | Determines whether early grouping and scaled integers are equivalent |
| B grammar/tokenizer and construction visibility | Determines query planning, normalization cost, and legality of query-aware indexing |
| Tenfold generator dimensions | Determines actual retained-state bounds and worker counts |
| D topology, query repetition, output kind | Determines whether graph preprocessing beats its own cost |
| E codec interface and sensor layout | Determines valid reversible transforms and decoder ownership |
| Reference source/dependency measures per track | Changes whether an elaborate implementation improves K |
| Speed-floor interpretation | Changes eligibility risk for a specialist or weaker third entry |
| Extra-track aggregation and prize stacking | Changes whether broadening the entry improves expected reward |

The candidate designs remain **exact compact aggregation for A; quote-aware projected parsing with conditional early grouping for C; and compact positional indexing for B**. The entry decision is A first, with expansion earned by the evidence and time-budget conditions in the next-steps document. Actual measurements under the released contracts must decide between candidate algorithms; this analysis deliberately makes no unmeasured runtime or prize guarantee.
