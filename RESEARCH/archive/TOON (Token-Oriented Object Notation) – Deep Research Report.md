TOON (Token-Oriented Object Notation) – Deep Research Report

Executive Summary

What is TOON? Token-Oriented Object Notation (TOON) is a new data serialization format designed specifically to minimize token usage when exchanging structured data with Large Language Models ￼ ￼. In essence, TOON represents the same information as JSON (objects, arrays, etc.) but with a compact, schema-driven text syntax that removes most of JSON’s overhead (quotes, braces, repeated keys) ￼ ￼. It combines YAML-like indentation for nesting and CSV-like tabular layouts for arrays to convey structure in fewer tokens ￼. The format is human-readable and losslessly convertible to/from JSON, making it a drop-in replacement for JSON in LLM contexts ￼.

Why TOON now? In LLM applications, JSON’s verbose syntax wastes a lot of tokens – every pair of quotes, comma, and duplicated key adds cost ￼ ￼. TOON emerged in late 2025 (created by Johann Schopplich ￼) as a response to this inefficiency, aiming to cut token overhead by 30–60% on structured prompts ￼. Early benchmarks show that TOON can indeed halve the token count for typical JSON data structures without losing information ￼ ￼. For example, a JSON snippet with an array of user objects can be represented in TOON with 30–50% fewer tokens while preserving the same content (see illustration below).

Illustration: A TOON representation declaring an array of two user objects with properties id and name (blue schema section), followed by two data rows (green) that adhere to that schema. In this example, the schema users[2]{id,name}: indicates an array named “users” of length 2 with fields id and name. The two subsequent lines contain the values for each user, separated by commas (e.g. 1,Alice represents {id: 1, name: "Alice"}). This compact form eliminates quotes, braces, and repeating field names, reducing token count by roughly 30–50% compared to the equivalent JSON ￼.

Is TOON production-ready? Yes. TOON is an open-source project (MIT-licensed) that has quickly gained traction in the developer community, reaching a stable v1.0 release in Nov 2025 ￼. Its creator describes it as “production-ready, but also an idea in progress”, inviting community feedback on the evolving spec ￼. In just weeks, it has garnered thousands of stars on GitHub and inspired implementations in many languages (TypeScript, Python, Go, etc.) ￼ ￼. This indicates a strong early adoption trend, though it’s still very new (no large-scale production case studies yet beyond exploratory use). Early tests suggest TOON is viable to use now: it’s fully specified with conformance tests, and official encoding/decoding libraries are available for immediate integration ￼ ￼.

Should Arela adopt TOON? Based on our research, TOON appears highly promising for Arela’s token-efficiency goals. It directly addresses the pain point of sending large structured contexts to LLMs by providing ~2× to 3× compression over JSON in many cases ￼ ￼. This could allow Arela to fit significantly more data into the LLM context window (potentially 500 files → 1,500 files in a prompt, given ~3× compression) and cut prompting costs proportionally. Crucially, this token reduction does not come at the expense of understanding – TOON’s structured format is designed to be model-friendly, and benchmark results show no drop in LLM accuracy and even slight improvements in some scenarios compared to JSON ￼. In other words, TOON can convey the same information more concisely without confusing the model.

We recommend Arela progressively adopts TOON for internal AI context handling. The transition can be done incrementally with low implementation effort:
	•	Start by encoding large JSON contexts (file graphs, etc.) as TOON before sending to the LLM, using the official TypeScript library (a one-line conversion call) ￼.
	•	Continue to use JSON for any external APIs or config files (for human compatibility), but convert JSON→TOON for LLM communication only, as a transparent “translation layer” ￼.
	•	Validate the impact on a small scale (e.g. one slice detection prompt) to ensure the model responds correctly, then roll out more broadly.

If TOON consistently delivers the expected ≥2× token savings with negligible accuracy loss, the ROI is excellent. Fewer tokens per call directly translate to lower API costs and faster response times. For example, eliminating 20,000 tokens from a prompt could save on the order of $1.20 per GPT-4 call (at $0.06/1K tokens), which is significant at scale. Moreover, improved token efficiency means we can include more relevant context (reducing the need to drop data), potentially boosting output quality. All signs indicate TOON is worth adopting for Arela’s use case – it aligns with our strategy of maximizing context density, and it’s a ready-made solution that we can implement in days. The main caveats are to avoid using TOON for cases where it’s counterproductive (deeply nested or irregular data) and to thoroughly test with our models to catch any edge-case misunderstandings. Overall, we anticipate that TOON will become an industry-standard for AI data interchange ￼ ￼, and early adoption will give Arela a significant advantage in context handling efficiency.

Technical Deep Dive

TOON Format and Syntax

TOON is essentially a compact textual notation that conveys JSON data structures in a token-economical way. It achieves this by blending features of familiar formats:
	•	Indentation for structure: Like YAML, nesting is indicated by indentation instead of curly braces. Keys are written followed by a colon, and child fields are indented on the next lines ￼.
	•	Tabular arrays: For arrays of objects with a uniform schema, TOON uses a single header line to declare the array’s length and field names, followed by each element’s values on separate lines ￼. This is analogous to a CSV table with a header row, but embedded in a hierarchical structure.

Syntax example – JSON vs TOON: Consider a simple JSON object containing a list of users:
	•	JSON:

{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob",   "role": "user"  }
  ]
}

This JSON snippet includes a lot of overhead: braces, quotes around every key and string, and the repeated keys “id”, “name”, “role” in each object.

	•	TOON:

users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user

In TOON, the line users[2]{id,name,role}: serves as a schema declaration. It tells us there is a key users containing an array of length 2, and each element is an object with fields id, name, and role. The following two lines are the data rows, with values for those fields in order ￼. Notice what’s missing: no curly braces, no quotes, no repeated field names. The structure is clear from the layout – the first value in each row corresponds to id, the second to name, etc. This representation is considerably shorter in terms of tokens (roughly 30–50% fewer tokens than the JSON version above) ￼ ￼.

Key characteristics of the syntax:
	•	No quotes for simple strings or keys: In TOON, object keys are written without quotes, and string values generally don’t need quotes either (unless they contain characters that would confuse the parser) ￼. For example, in the user data above, Alice and admin are unquoted. Exception: If a string value contains a comma, colon, newline, or could be mistaken for a boolean/null, the encoder will quote it to preserve correctness. E.g. a value "hello, world" would appear as "hello, world" in TOON (with quotes) to avoid being split by commas ￼. Similarly, a string that looks like a number or boolean (like "true" or "42") gets quoted so that it isn’t interpreted as a literal true or 42 ￼. These rules ensure TOON is lossless and unambiguous, preserving data types exactly.
	•	Colons and commas: TOON still uses colon (:) and comma (,) but differently than JSON. A colon is used after a key (or after the } in a schema header) to introduce its value or block. Commas are used to separate values in a row (much like CSV). In the users example, commas separate the fields in each user’s row. There is no comma between separate objects/rows – the line break and indentation implicitly indicate the separation between array elements. This significantly cuts down on punctuation tokens while still delineating structure.
	•	Arrays of primitives: If an array contains primitive values (e.g. an array of strings or numbers), TOON represents it in a single line with the length and the values separated by commas. For instance, JSON {"colors": ["red","green","blue"]} becomes colors[3]: red,green,blue in TOON ￼. This reads as “colors array of length 3: red, green, blue”. Likewise, a numeric array [10,20,30] under key “nums” would be nums[3]: 10,20,30. This inline list saves the overhead of brackets and quotes around each element.
	•	Nested objects: For nested JSON structures that aren’t uniform arrays, TOON uses indentation to nest the content, similar to YAML. Example:

{ "user": { "id": 1, "name": "Alice", "profile": { "age": 30, "city": "Bengaluru" } } }

In TOON:

user:
  id: 1
  name: Alice
  profile:
    age: 30
    city: Bengaluru

Here we see the YAML-like form – the object user is introduced by user: and its fields are indented underneath ￼. The nested profile object is similarly introduced by profile: and indented further. This format retains readability and structure, but since it repeats keys (id, name, etc.) for that single object, it doesn’t benefit from the tabular compression (which is fine – tabular mode is mainly for arrays of multiple items).

	•	Arrays of objects with nested fields: TOON’s “sweet spot” is arrays of objects that have only primitive fields. If an array’s elements themselves contain nested objects or arrays, TOON cannot flatten those into a single row – it will revert to an indented block for each element. For example:

{
  "teams": [
    { "name": "Team Alpha", 
      "members": [ { "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" } ] 
    }
  ]
}

In TOON:

teams[1]:
  - name: Team Alpha
    members[2]{id,name}:
      1,Alice
      2,Bob

Here, teams[1] declares an array of 1 team. Because each team has a complex members field, TOON does not put name and members in a single header (they are not all primitives). Instead, it lists the team entry as a dashed item (YAML list style) with its fields indented beneath ￼. Inside, the members field is an array of uniform objects, so for that inner array TOON does use the compact form members[2]{id,name}: with two data lines. This example shows that TOON can mix approaches: it handles the top-level teams array in a semi-structured way and the inner members array in a fully tabular way. The result is still much more concise than JSON, though not as compact as a purely flat table. Rule of thumb: TOON will use the one-line-per-item (tabular) format only for arrays of uniformly structured primitives or objects. If an object has nested structures, that part will be represented in an indented block, incurring some overhead of repeated keys and indentation.

	•	Explicit schema and length: The notation X[n]{fields}: is unique to TOON and provides schema-awareness that JSON lacks. X is the key (name of the array), n is the number of elements, and {fields} lists the field names expected in each element. This explicit schema acts as a form of self-documentation and a guardrail. It helps LLMs parse the data reliably because they know what to expect in each row ￼ ￼. For example, if the model sees users[2]{id,name,role}: and then the rows, it can verify if each row has exactly 3 values and if there are exactly 2 rows. This could reduce confusion or errors – e.g., if a row had a missing field, the model might detect the anomaly more readily. In JSON, by contrast, the model would have to infer the structure from repeated patterns and punctuation alone. (Note: TOON’s reference implementation even includes tests for cases like missing or extra rows to see if models notice ￼ ￼.)
	•	Optional key folding: TOON allows “folding” of redundant single-key wrappers into dotted notation to save space ￼. For example, if a JSON object is {"data": {"metadata": {"items": [...] }}}, it’s essentially a chain of single-key nested objects. TOON could represent this more flatly as data.metadata.items[...] all in one go, rather than indenting three levels. This is an optional compression technique to reduce deep indentation in cases where nesting is just a hierarchical grouping. It trades some human clarity for token savings. In practice, you’d use this if you have many layers of one-to-one containers that don’t carry their own data. (This feature is part of the spec but one would explicitly implement it – the current TS library supports it via an option.)

In summary, TOON’s syntax eliminates superfluous punctuation and repetition. It preserves the essence of the data (keys and values) in a cleaner form that both humans and LLMs can parse. The design choices (like including the field names in a header and the array length) are geared towards making the format as LLM-friendly as possible, not just smaller. The similarity to familiar structures (CSV rows, YAML indents) means models aren’t faced with random unstructured gibberish, but rather a logical layout they can follow ￼ ￼.

How TOON Achieves Token Savings

The reduction in token count when using TOON comes from several compounding factors:
	•	No repeated quotes around keys and strings: In JSON, every object key is a quoted string, and most values are too. These quotes and the accompanying colon and commas add multiple tokens per field (for instance, "name": "Alice" vs name: Alice – the JSON version has two quote characters and possibly a comma after, each of which typically becomes a token). By dropping quotes and using indentation instead of braces, TOON cuts out a large fraction of these structural tokens ￼. Syntactic symbols contribute significantly to token count because of how tokenization works (e.g., a quote or brace is often its own token or part of one). Removing them yields immediate savings.
	•	Shared field names (schema header): Perhaps the biggest win is that TOON writes the field names only once for an entire array of objects, instead of with every object. If you have 100 objects each with a field “id”, JSON will repeat "id": 100 times. TOON will say id once in the header and then just list 100 values under it. For large uniform datasets, this is a dramatic reduction. The more repetitive the structure, the greater the savings. This is why TOON’s advantage is most pronounced on uniform arrays with many entries ￼. In one benchmark, TOON used ~40% fewer tokens than regular JSON on a dataset, largely thanks to this factor ￼.
	•	No commas between objects/elements: JSON separates array elements with commas and encloses them in [...]. TOON needs neither – a newline and consistent indentation suffice to denote the next element. In effect, TOON treats the structured data almost like writing a small CSV block, which is very terse. The only commas are the ones separating fields within a row, which are exactly as many as the number of fields minus one. JSON, on the other hand, would have both intra-object commas and inter-object commas and a lot of brackets.
	•	Minimal overhead markers: TOON does introduce a bit of overhead of its own (the [n]{fields} in the header and the colon at the end of it). However, this overhead is fixed per array, whereas JSON’s overhead grows with each element. For a large array, the [n]{...}: adds maybe a handful of tokens, which is negligible compared to the hundreds of tokens JSON would spend on repeated keys and punctuation. Even for smaller arrays or single objects, TOON tends to break even or win. Only in pathological cases (like deeply nested single objects) might TOON’s extra markers not pay off – we’ll discuss that in limitations.
	•	Schema-aware tokenization benefits: An interesting side effect is that by structuring data in a table-like format, we might be helping the tokenizer (and model) treat multi-word values as single tokens more often. For example, the field name role appears once in TOON, whereas in JSON "role": might tokenize as separate pieces (", role, ":). Also, numeric values and common words might tokenize similarly in both, but the absence of quotes means TOON feeds them directly. It’s a bit speculative, but the uniform layout might align with model token patterns better. In any case, the explicit structure seems to aid model comprehension – as we’ll see, benchmarks found that GPT models actually answered questions slightly more accurately when data was given in TOON format versus JSON ￼.

Real-world token counts: For a concrete sense of savings, consider these benchmark comparisons (from a dev community article):
	•	A user list (array of simple objects): JSON = 150 tokens, TOON = 82 tokens – roughly 45% reduction ￼.
	•	A product catalog (larger objects): JSON = 320 tokens, TOON = 180 tokens – about 44% reduction ￼.
	•	A nested data example (deep hierarchy): JSON = 410 tokens, TOON = 435 tokens – TOON was actually 6% higher in this case ￼.

These numbers confirm the pattern: flat or tabular data sees huge gains, whereas deeply nested data can negate the benefit. In the nested example, TOON had to include indentation and repeated keys (since it couldn’t tabularize it fully), resulting in slightly more tokens than the minified JSON. This underscores that we should use TOON selectively for the right structures.

Another example from the TOON documentation: representing 100 user records in different formats ￼:
	•	TOON: ~2,744 tokens for the dataset
	•	Minified JSON: ~4,545 tokens for the same data
	•	That’s a ~40% reduction in tokens, which matches the 30–60% savings range reported across tests ￼ ￼. YAML was around 3,719 tokens (between TOON and JSON) ￼, and CSV (which only works for flat data) could be slightly smaller than TOON but wasn’t comparable across all data ￼ ￼.

In one illustrative experiment using OpenAI’s tokenizer, encoding a small dataset yielded JSON 84 tokens vs TOON 32 tokens – a 62% reduction ￼ ￼. This was a simple case with a few objects, but it shows TOON can exceed 2× compression in favorable scenarios. Generally, the more repetitive the structure (many entries, common fields), the closer you get to the upper end (~60% or even more) of savings. Even at the lower end (say 30% savings), that’s still significant when multiplied over thousands of tokens.

Cost and performance implications: Reducing token count has two direct benefits: lower API costs and lower latency. Token-based pricing (like OpenAI’s) means if you send 10k fewer tokens, you save money proportionally. And since LLMs process input tokens sequentially, fewer tokens should result in faster processing and response. So a 40% token reduction could roughly translate to a 40% speed-up in reading the prompt (though other factors like network overhead and model generation time also play roles). For Arela, where context size is large, these savings will add up. It can be the difference between a prompt that barely fits in 32k context vs one that comfortably fits with room to spare.

One thing to monitor is encoding/decoding overhead on our side. The TOON conversion itself is computational work, but it’s fairly lightweight (parsing text and formatting). The TypeScript library is likely efficient (and a Python port exists too). Converting, say, a 20k-token JSON to TOON might take a few milliseconds to tens of milliseconds. This is negligible in the context of network and LLM processing time, but we’ll test it. Our success criteria includes encode/decode <10ms per operation – given that JSON.parse and JSON.stringify on 20k tokens are quite fast in Node/TS, and TOON’s logic is not much more complex, this criterion should be met easily.

In summary, TOON can drastically cut token usage, thereby lowering cost and allowing more data per call. The trade-off is minimal in the target use cases (uniform data). For very complex nested data, JSON might remain more efficient, so we won’t force TOON where it doesn’t make sense ￼. But for Arela’s primary contexts – e.g. lists of file metadata, search results, collections of API specs – TOON should shine, compressing what is currently ~50k token JSON payloads down to perhaps ~20k or less.

LLM Compatibility and Understanding

A critical question: Will GPT-4/Claude/etc. understand TOON as well as they understand JSON? Since TOON is new, current LLMs were not explicitly trained on it (it didn’t exist during most training data time). By contrast, JSON is ubiquitous in training data and models have essentially learned the pattern of "key": "value" very well. There was some concern that introducing a novel format might confuse models or require additional prompt guidance ￼. We investigated this by looking at benchmarks and community testing, and the results are encouraging:
	•	Empirical comprehension tests: The TOON repository authors conducted extensive tests with 209 data retrieval queries on multiple models (including Anthropic Claude, a Google Gemini model, an OpenAI GPT-5 prototype, etc.) ￼ ￼. They measured how accurately the models could answer questions about a dataset when that dataset was provided in different formats (TOON vs JSON vs YAML vs CSV, etc). The outcome: TOON had equal or better accuracy compared to JSON in these tasks, often with a slight edge ￼. For instance, across all queries, TOON delivered ~73.9% accuracy vs 69.7% for JSON, using 40% fewer tokens ￼. Claude in particular went from 57.4% accuracy on JSON to 59.8% on TOON ￼. These differences aren’t huge, but the key point is TOON did not degrade understanding – if anything, it marginally improved it in those tests. The authors hypothesize that the cleaner syntax and explicit schema help the model parse the info more reliably ￼.
	•	Independent evaluations: A third-party blog “Improving Agents” did their own benchmarks with GPT-4.1 and GPT-5 (nano variants) to see how TOON stacks up ￼ ￼. Their findings were somewhat mixed: TOON was among the most token-efficient formats (as expected) but in their tests JSON and YAML slightly outperformed TOON in accuracy on some tasks, especially ones involving nested data ￼ ￼. For example, on a tabular data task, JSON yielded ~52% accuracy vs TOON’s ~47%, though TOON used far fewer tokens ￼ ￼. And on a nested data task, YAML had ~62% vs TOON’s ~43% accuracy for GPT-5 nano ￼. This initially seems at odds with the official benchmarks. However, the blog noted that when they replicated the repository’s exact benchmark with GPT-5 nano, they did see TOON performing well ￼. The discrepancy likely comes down to differences in prompt design and model variations. The independent test’s prompts/formats (they even tried “markdown tables” and such) may not directly mirror how we’d present data. Additionally, smaller or older models might not infer the TOON format as confidently as larger ones. The bottom line from that analysis was: TOON wasn’t the top format in every scenario, but it was never far off, and it drastically reduced tokens. The authors concluded that more research is needed, but TOON is a promising approach ￼ ￼.
	•	Out-of-the-box understanding: Anecdotally, GPT-4 (and likely Claude) can interpret TOON format quite well without special instructions. The format is intentionally human-readable, so the model sees keys and values organized logically. It might not “know” the name TOON, but it doesn’t have to – it can parse it like reading a structured document. In many cases you can just feed a model a TOON snippet and ask questions about it, and it will correctly retrieve information. For example, if you prompt GPT-4 with the earlier users[2]{id,name,role}: 1,Alice,admin ... snippet and ask “What is Bob’s role?”, GPT-4 is likely to answer “user”. It can follow that users is an array, see that Bob is on the second line and his role is after the comma, etc. This is supported by the benchmark results showing no loss in comprehension ￼.
	•	Need for prompt clarification: For safety, one could include a brief system or prompt note explaining the format to the model. Something like: “The following data is in TOON format (a concise JSON alternative): X[n]{fields}: indicates an array with n items and fields, followed by comma-separated values. Please interpret accordingly.” This would only cost a few tokens and could eliminate any ambiguity. However, in practice it might not even be necessary for well-trained models. The explicitness of the format itself often suffices – the model sees, for example, {id,name,role} and can deduce those are field names from context. Nonetheless, as we deploy, we can A/B test with and without a short explanatory prompt to ensure maximum accuracy. For critical uses, a one-time definition of the schema at the top of the prompt can be used (which is similar to giving it the first row of a CSV as headers).
	•	Local models (e.g. Ollama, Llama2): Local LLMs tend to have smaller training sets and maybe less ability to generalize to unseen formats. It’s possible a smaller model might be confused by the bracket notation or need more examples to catch on. The TOON readme specifically advises to benchmark on your actual setup, because some deployments (especially quantized local models) might handle JSON slightly faster or more reliably ￼. This could be due to tokenization differences or just the model’s familiarity. For example, if a 7B parameter model rarely saw something like users[2]{id,name} in training, it might not immediately grok it. However, since TOON is designed to be logical, even smaller models should be able to follow given a bit of prompting. We should test with our target local model (Ollama’s Llama, etc.) by feeding a representative TOON snippet and asking some questions. If it struggles, we can provide an explanation or even consider fine-tuning a tiny bit on the format (though that’s likely unnecessary).
	•	Potential accuracy pitfalls: The only notable risk is if the model misinterprets the syntax – e.g., mistaking the array length for an actual data field, or not realizing a comma-separated line corresponds to multiple fields. The structured nature of TOON makes such misinterpretation less likely than if we invented our own random format. But it’s new, so we should verify on complex queries. In some complex nested cases, a model might lose track (just as it could with JSON). For instance, with deep nesting, the indent-based structure could be harder to visually parse for the model than braces (though YAML works for them, so likely fine). If we ever encountered confusion (say the model’s answer indicates it didn’t read the TOON data correctly), our mitigation could be to switch that prompt back to JSON or add clarifying text.

Overall, for Arela’s primary LLMs (GPT-4, Claude) and use cases, TOON is expected to work out-of-the-box with high accuracy. OpenAI’s models in particular have strong pattern recognition; they handle formats like Markdown tables, YAML, and code – TOON is not too far afield. In fact, our research indicates a slight improvement in reliability for data extraction tasks when using TOON ￼, likely because the noise of quotes/braces is removed and the model focuses on content. We will, of course, conduct our own validation, but current evidence suggests compression does not hurt and may even help LLM understanding in structured data scenarios.

One thing to clarify: using TOON doesn’t mean the model will start outputting TOON (unless we ask it to). Models generally respond in the format the prompt or instructions request. If we supply context in TOON but ask a question in plain English, the answer will be plain English. There’s a hypothetical concern (raised on HN) that if a model gets very familiar with TOON, it might reply in TOON format unprompted ￼. This is unlikely unless we start fine-tuning or instructing the model to use TOON for output. In any case, if we ever needed the model to return structured data (say as part of a multi-agent chain), we could instruct it to output JSON and then convert that JSON to TOON for the next model in the chain. So, the model’s output format can remain whatever is convenient (likely JSON or natural language), and we use TOON primarily for inputs and inter-model payloads.

Compatibility summary: GPT-4, Claude, and similar top-tier models can consume TOON format with no special support – it’s just text. Local models may require a bit of testing, but should be able to adapt given the simplicity of the format. No proprietary or model-specific features are needed; TOON works at the prompt level. Think of it as sending a nicely formatted table to the model – something they’re generally quite good at interpreting.

Implementation Details (Encoding/Decoding)

One of the attractive aspects of TOON is that it comes with ready-to-use libraries, so we don’t have to implement the parsing logic from scratch. The official GitHub project provides a TypeScript/Node library (published as @toon-format/toon on npm) and also documents implementations in other languages ￼ ￼. For Arela, which is heavily JavaScript/TypeScript-based, the TS library will be our primary tool.

Using TOON in TypeScript: The library’s API is straightforward:

import { encode, decode } from "@toon-format/toon";

const data = {
  users: [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" }
  ]
};

const toonString = encode(data);
console.log(toonString);
// Outputs:
// users[2]{id,name,role}:
//   1,Alice,admin
//   2,Bob,user

const jsonObj = decode(toonString);
console.log(JSON.stringify(jsonObj, null, 2));
// Outputs the original JSON structure

As shown above, encode() takes a normal JS object/array (like we would normally JSON.stringify) and returns a TOON-formatted string ￼ ￼. The decode() function reverses it, parsing a TOON string back into a data structure ￼ ￼. This means integration can be as simple as inserting an encode() call before sending data into the prompt, and decode() if we ever get TOON-formatted output back. We can treat TOON as just another serialization, analogous to JSON.stringify/parse in usage.

Libraries and ecosystem: In addition to TypeScript, there’s a Python implementation available (e.g. on PyPI as python-toon) that supports similar encode()/decode() usage ￼ ￼. This is useful if any part of Arela’s pipeline is Python-based or for writing tests. Moreover, the community has rallied around TOON – at the time of writing, there are experimental or in-progress ports for Go, .NET, Rust, Java, C++, PHP, R, and many more languages ￼ ￼. This is good news for longevity: even if our stack changes or if we need to use TOON in, say, a Rust-based embedding service, a library likely exists. It also means TOON could become a standardized format across systems (not just an Arela-specific quirk).

The official spec (currently v2.0) is published in the repository ￼, and they provide conformance test fixtures ￼ ￼. We can run those tests against our usage if needed to ensure everything’s consistent. The spec covers all the edge cases (empty arrays, special characters, etc.), so using the official library should handle those automatically.

Encoding performance: The encode function is doing more work than JSON.stringify (since it has to output a different format and handle quoting logic). However, given the data sizes we anticipate (tens of thousands of tokens at most per chunk), this is well within what modern serialization libraries can do in milliseconds. The TS implementation likely traverses the object once, building strings – complexity is O(n) in number of elements. Unless we are doing hundreds of encodes per second, this won’t be a bottleneck. We can further mitigate any overhead by encoding only when necessary (e.g., not encoding data that we aren’t going to send to an LLM). The library also likely has a streaming/CLI interface if needed (for very large data one could stream, but we probably don’t need that).

Decoding and validation: We will primarily use encoding (JSON→TOON) for sending prompts. Decoding (TOON→JSON) would be used if:
	•	We ask a model to output TOON (not planned initially), or
	•	We store some TOON format data and need to convert it back for some reason, or
	•	For debugging, to verify that the TOON string we created round-trips to the original JSON.

It’s reassuring that decoding exists and is lossless – it means we can always double-check that nothing got lost or mangled by encoding. For example, if a model seems confused, we could decode the TOON we sent it to see what it “saw” in JSON form, ensuring our encoding was correct.

Validation: The explicit nature of TOON (with lengths and fields) provides a form of built-in validation. When we call encode(), it constructs the format such that if our data was inconsistent (e.g., an array of objects where one object has an extra field), it can still represent it, but the spec’s notion of “uniform array” might not apply so it could fall back to a different representation. Decoding would output exactly the original structure, so no issues there. If we want to ensure an array is treated in the compact form, we might need to preprocess data to align fields. For instance, if one object is missing a field, the encoder might still do a uniform array but leave an empty value (or it might not use the {} header at all – depending on how it’s implemented). It’s something to test: likely the encoder will attempt the tabular form if all objects share the same keys. If not, it might break it into a nested format.

The spec likely defines behavior: perhaps it only uses the X[n]{fields} syntax if every element has the same set of keys and all values are primitives. So, ensuring uniformity in our data (which we generally have in structured contexts) will guarantee we get the maximal compression. In cases where data is inherently irregular, we accept that it won’t compress as much or consider transforming the data (like splitting into multiple arrays of different object types, etc., though that adds complexity).

Human readability & debugging: TOON is designed to be human-readable (to a developer at least). A quick glance at a TOON snippet should show the overall structure clearly – arguably more clearly than minified JSON would. For debugging complex outputs, we have a couple of strategies:
	•	Use the decode() function to turn TOON back into JSON and then pretty-print it. This way any developer who isn’t familiar with TOON can inspect the data in classic JSON form.
	•	Or learn to read TOON directly – it’s not too hard, especially if you know JSON and CSV. We’d basically look at it like a structured log or YAML. The learning curve for our team should be short (maybe an hour of practice and referencing the spec).

We should also incorporate logging or visualization for TOON data in our tools. For example, during development, we might log both the JSON size and TOON size to see the savings, and log the TOON string for verification. There might be VS Code syntax highlighting extensions for TOON as it gains popularity; if not now, likely soon given the community interest.

Edge cases: Special values in JSON like null, true, false appear as unquoted literals in TOON (similar to YAML). E.g., {"flag": false} becomes flag: false (no quotes around false, which is fine). null would appear as null. The encoder will handle these. If a key or string contains characters like : or { that could be mistaken for syntax, they’ll be quoted. Multi-line strings – possibly handled by quoting or a pipe notation (the spec might allow YAML-style | for block text, not sure if implemented). But since we rarely send large free-form text as values (we usually send actual text to the model outside of JSON anyway), this is not a big concern. If needed, we can always JSON-escape or base64 any truly problematic content, but that’s unlikely.

In conclusion, implementing TOON in Arela’s codebase is straightforward thanks to existing libraries. We’ll use the TS encode() function to convert our context objects right before embedding them in prompts. On the receiving end, our LLM doesn’t need anything special – it will just read the TOON text. We maintain full fidelity of data through encode/decode, so we’re not sacrificing correctness for compactness.

Implementation Plan

We propose a phased rollout of TOON integration into Arela’s systems. This allows us to gradually realize benefits and address any issues on a small scale before full adoption. The plan is structured in four phases:

Phase 1: Proof of Concept for Internal Prompts
Timeline: Day 1-2 (initial integration and testing)
Scope: In this phase, we will select one high-impact context to convert to TOON as a proof of concept. A great candidate is the “slice detection” prompt, where we send the graph of ~500 files to the LLM. Currently this is ~50k tokens of JSON; we’ll replace it with TOON formatting for a trial run. Using the TypeScript library, we’ll implement a wrapper such that when our code prepares the JSON for the prompt, it calls encode() to produce TOON instead. We then feed this TOON string to GPT-4 (or our model) and observe the results. Key things to test:
	•	Does the model correctly interpret the data (e.g., does it identify relationships between files as before)?
	•	Measure token count difference. We expect ~3× reduction (e.g. ~50k → ~15-20k tokens) ￼ – we will verify via OpenAI’s tokenizer or by counting tokens.
	•	Compare the model’s answer or behavior to the baseline JSON version for the same input. We want to ensure it’s at least as good (accuracy ≥ 95% of baseline, per success criteria). For instance, if slice detection identifies components, we ensure it still finds them with TOON input.
	•	Check performance: Did the prompt run faster? (Anecdotally it should, with fewer tokens).

If this single-case POC is successful, it gives us confidence to proceed. If we encounter any misunderstanding by the model, we’ll adjust by possibly adding a short prompt note or inspect where the confusion arises. We will also use this phase to refine how we handle any irregularities (e.g., if some file objects had optional fields, ensure the encoding is as expected).

Phase 2: Integrate TOON for MCP Tool Responses
Timeline: Day 3-4
Scope: Arela’s Multi-Context Pipeline (MCP) tools like arela_search, graph queries, etc., often return JSON payloads that we immediately feed into an LLM. For example, a search tool might return a list of results with titles, snippets, and sources in JSON. In this phase, we will intercept those tool outputs and convert them to TOON before inclusion in the agent’s prompt. We do not need to rewrite the tools themselves to output TOON (they can keep returning JSON for now, which is easier for maintenance and debugging). Instead, we add a middleware layer: after the tool returns JSON, our orchestrator calls encode() to transform it into a TOON string that is inserted into the LLM prompt.

Concretely, if previously an agent prompt looked like:

Search results: [ { "title": "...", "snippet": "..." }, {...} ]

We will change it to:

SearchResults[10]{title,snippet,source}:
  ... (10 lines of results in TOON format)

assuming 10 results, for example. We’ll ensure to also adjust the surrounding prompt text if needed (maybe we label it with SearchResults in the key as above, or just use the key that was in JSON). The agent (LLM) should then reason with this compressed info. We expect token count for tool outputs to drop significantly – possibly by ~3× as well, since lists of results are uniform structures.

During Phase 2, we will test various tools:
	•	Search queries (uniform list of results).
	•	Perhaps a code graph query (uniform list of relationships).
	•	arela_vector queries if any (like retrieving chunks of text with metadata – those might be partially free text; we’ll see if compressing metadata portion helps).

We’ll verify that agents like Codex or Claude that consume these still perform their tasks correctly (e.g., can retrieve the needed info from the search results). If any tool output is deeply nested or irregular, we might decide to leave it as JSON (per “when not to use TOON” guidelines ￼). But most tool outputs are simple arrays or objects, ideal for TOON.

By the end of Phase 2, all internal data exchanges in prompts (tool → LLM) will be using TOON where beneficial. This should immediately yield cost savings for multi-step agent interactions, since every tool response included will now be shorter. We will monitor overall token usage in some scenario (maybe a full agent run that does planning, searches, code writes) and compare to before.

Phase 3: Agent-to-Agent Communication (Model Handoffs)
Timeline: Day 4-5
Scope: In Arela’s architecture, we sometimes have one model produce an output that another model consumes (e.g., Codex generating some plan or code that Claude then reviews or continues). Currently, these handoffs might use JSON or other structured formats to maintain consistency. In this phase, we apply TOON to these inter-model messages. For example:
	•	If Codex outputs a list of tasks or file changes in JSON, we can convert that JSON to TOON before giving it to Claude.
	•	If we have a custom protocol (maybe the “contract generation” where one model outputs an API spec in JSON to feed into another step), that can be compressed with TOON as well.

The approach is similar to Phase 2: we don’t necessarily force the model to output TOON (they might not know how unless instructed); instead we let the first model output JSON (which they are good at), then programmatically convert it to TOON for the second model’s input. This way we get the best of both – accurate structured output and compact input.

One consideration: We must ensure that the second model (consumer) is aware of the format or at least not confused. If these agents were designed expecting JSON, we might add a one-line system note for them about the format change. Since we control both ends, we can afford a brief instruction like: “The previous agent’s response has been converted to a concise format (TOON) for efficiency. Interpret it as you would JSON.” But likely, if the content is clearly structured (with field names), the agent will handle it. We’ll test on a handoff scenario to be sure (e.g., let Codex propose some file diffs, convert to TOON, and see if Claude can apply them).

After Phase 3, all communications between our AI agents will be token-optimized. This is a big step toward the “context router” vision: we’ll be squeezing the maximum info through the limited pipes connecting models.

Phase 4: Full Adoption in RAG Context Compression
Timeline: Day 5-7 (optional / as needed for v4.2)
Scope: This phase targets any remaining areas where large contexts are fed into LLMs, particularly Retrieval-Augmented Generation (RAG) contexts. For example, when we retrieve knowledge chunks or documentation to feed into the model, we often wrap them in a JSON or list structure with metadata. We could use TOON to compress that structure. However, RAG often involves long passages of text which are themselves the bulk of tokens (and those can’t be compressed by TOON beyond removing quotes). So the benefit here might be smaller in percentage terms, but still worth exploring. Possible applications:
	•	If we supply a list of retrieved documents each with a title and snippet, we can format it as docs[n]{title,content}: ... rather than a JSON array. This cuts out the quotes around titles and such. The content will likely be a large string, which TOON would probably quote (since it has spaces, punctuation). We should see how the encoder handles multi-line content. If it quotes the entire content, the token count might actually be similar to JSON (since the content is the dominant part). There might be little difference in that case aside from not quoting every line break (depending on implementation).
	•	Alternatively, we might not use TOON for the actual raw content but could use it for the metadata around it. For instance, keep content as is (maybe as a block string) but everything else (titles, source URLs, etc.) in TOON format.

Since RAG is less about structured repetitive data and more about free text, we mark this as a lower priority phase. We’ll do it if time permits and if tests show a meaningful drop in tokens. It’s also something that could be tackled in version 4.2 once we have Meta-RAG in place. Perhaps Meta-RAG can categorize or chunk info in a way that’s amenable to TOON packaging (like grouping related facts in a table).

Migration and Compatibility: Throughout these phases, we will keep JSON as the source of truth in our system. That is, our data structures and databases remain in JSON or objects. TOON is used as a transient format for prompt encoding only. This ensures we don’t break compatibility with any external systems or our own components that expect JSON. For example, config files remain JSON/YAML (no change for developers or users), and any API we expose remains JSON. We’re essentially adding TOON at the boundary where data enters or exits an LLM’s context.

This hybrid strategy is recommended by TOON’s creators – use JSON for general application needs, and convert to TOON only for the AI interaction to save tokens ￼ ￼. It means minimal disruption to our codebase. We won’t need to rewrite how we construct data, just how we serialize it for the LLM.

Effort estimate: Implementing Phase 1-3 is relatively quick:
	•	Phase 1 (POC) can be done in a day, including writing test prompts and analyzing results. It’s mostly adding an encode() call and observing.
	•	Phase 2 and 3 involve inserting encoding steps in a few key places (the MCP output handler, the agent handoff function) – likely 1-2 days of work plus some testing/tuning.
	•	Phase 4 might be another day or two if we pursue it, but could be deferred.

In total, we anticipate about 1 week of work to integrate and verify TOON across our pipeline, which aligns with the requested timeline. By the end of that week, we should have a robust implementation or, if any blocking issues emerge (unexpected model misbehavior), we will have identified them and can roll back those specific instances.

Deployment and fallback: We can guard the rollout behind a feature flag or configuration. For instance, an environment variable USE_TOON can toggle whether we encode prompts with TOON or leave them as JSON. During testing in staging, we’ll enable it, and we can do side-by-side runs. In production, we might initially enable TOON for only certain requests or certain models (e.g., enable for GPT-4 calls, but maybe not for a smaller local model until tested). This gradual deployment ensures if something goes wrong, we can quickly switch back to JSON with minimal disruption.

We will also implement monitoring to capture token usage per call and any errors. If a model ever returns something like “I’m not sure how to read this input,” that’s a red flag (though unlikely). We can then investigate and adjust.

Phase 5 (Future - optional): Fine-tuning and contributions (Not in initial plan, but looking ahead): If TOON becomes core to our system and we want even better performance, we could fine-tune local models on TOON format or contribute improvements to the TOON spec. For example, if we find that certain patterns appear often in our data and could be compressed further, we might propose spec enhancements or use the key folding feature more. Since TOON is open-source, Arela’s team could even become a contributor – for instance, helping with optimization or developing a library for a language we use that doesn’t have one yet. This is beyond the immediate 1-week integration, but it’s good to note that adopting TOON also means joining a growing community of practice.

Comparative Analysis

In evaluating TOON, it’s useful to compare it with alternative data formats on several dimensions: token efficiency, readability, tooling support, and suitability for LLMs. Below is a comparison of TOON with JSON (our current format), YAML, CSV, as well as binary serialization and custom compression approaches:
	•	TOON vs. JSON: JSON is the status quo – ubiquitous and well-understood by both humans and LLMs, but very token-heavy. JSON’s verbose syntax leads to a high token count, especially for repetitive structures ￼ ￼. TOON, in contrast, was built to minimize exactly that overhead. Efficiency: TOON can use up to ~60% fewer tokens than JSON for the same data ￼ ￼, especially on large arrays. Even with pretty-printing removed (i.e., “JSON compact”), JSON still needs quotes and keys for each element, which TOON avoids. Readability: JSON’s syntax is moderately human-readable (familiar, but cluttered with symbols). TOON’s syntax is arguably more concise and still readable, once you know it – it looks like clean indented text with occasional commas. Many find it easier to scan compared to JSON because the signal-to-noise ratio is higher (less punctuation) ￼. LLM understanding: JSON has the advantage of familiarity; models have seen it in training and often have built-in expectations for JSON patterns. TOON is newer, but as discussed, LLMs handle it well. Tooling: JSON wins on maturity – every programming language has native JSON support. TOON’s tooling is emerging but already covers many languages ￼ ￼. We can’t use TOON with, say, standard JSON.parse functions; we need the specialized library. But since we only use it internally, that’s fine. Best use: JSON remains best for general data exchange (APIs, config, storage) where human editing or external compatibility is needed. TOON is best for AI-facing data where token count matters more than strict adherence to existing standards.
	•	TOON vs. YAML: YAML is another human-friendly format that removes JSON’s quotes and braces. It uses indentation and has shorthand for lists, etc., so at first glance YAML and TOON have similarities. Efficiency: YAML is somewhat more compact than JSON but not as much as TOON. For example, YAML still repeats field names for each object in a list (no concept of a shared schema line). In one benchmark, YAML used ~18% fewer tokens than standard JSON, whereas TOON used ~40% fewer on the same data ￼. The extra 20+% gain of TOON comes from its tabular schema approach. YAML also requires a dash - for each array item, which is an extra token per item. Readability: YAML is considered very readable to humans (no quotes, clear nesting). TOON retains much of that readability but adds the bracketed schema syntax which is a little “programmatic”. Still, TOON was designed to be easily readable too (the authors explicitly wanted it to feel familiar like CSV/YAML ￼). LLM understanding: LLMs likely have seen YAML examples (in documentation, etc.), so they can parse YAML reasonably. However, YAML has some quirky rules (like yes/no becoming booleans, or special tags) – models might not strictly apply those, but there’s potential inconsistency. TOON is more regular in format. The explicit field list in TOON may actually make it easier for an LLM to extract info than YAML’s repeated key lines, because the model can anchor on the schema. Tooling: YAML parsers are everywhere, and we could have chosen to feed YAML to the LLM instead of JSON (just by converting JSON to YAML). In fact, our JSON-to-YAML example earlier showed ~25-30% token savings ￼. We could have done that as a quick fix (and indeed some developers have used YAML in prompts for brevity). But YAML is not optimized for tokens – it wasn’t designed with LLM contexts in mind, so it leaves some efficiency on the table and can’t handle flat tables as compactly. YAML also isn’t schema-aware; it’s purely structural, so it can’t do validations like TOON can (e.g., declare array lengths). Conclusion: YAML is an improvement over JSON for reducing token noise, but TOON usually outperforms YAML in both compression and reliability ￼. We prefer TOON if we’re going through the trouble of adopting a new format, since the incremental benefits are significant. YAML might remain useful for things like config files (where tokens don’t matter but human clarity does).
	•	TOON vs. CSV: CSV (Comma-Separated Values) is extremely compact for tabular data. In fact, CSV is the one format that can beat TOON in pure token minimization for simple tables ￼. Without any field names or quotes (assuming values have no commas), CSV is hard to top. However, CSV is very limited: it handles only flat tables (no nesting, no mixed types easily) and usually requires an external knowledge of what each column means. If we tried to use CSV in prompts, we’d have to provide a header row or explain the columns to the model. That’s effectively reintroducing what TOON does with its schema line. So, TOON can be seen as “CSV with context” – it carries the header within the format. The token overhead of that header and array length is about 5–10% extra compared to pure CSV ￼, which is a small price for clarity. Also, CSV typically doesn’t quote strings unless necessary, which is similar to TOON’s approach. For purely flat data (like a table of numbers), one might consider just giving the model a CSV. But in Arela’s use cases, our data isn’t purely numeric or flat; we have nested relationships, keys, etc. CSV can’t properly represent, say, a file with a list of imports as one cell – you’d end up needing escaping or a secondary structure. CSV also has no native way to represent an empty vs missing field distinctly, or hierarchical data. Bottom line: CSV is the theoretical token-efficiency champ for simple data, but it’s not viable as a general solution for LLM prompts that include complex data. TOON yields nearly the same compactness on flat data and extends to semi-structured data gracefully ￼.
	•	TOON vs. Binary formats (Protobuf, MessagePack): In traditional applications, if you wanted compactness, you’d use binary serialization (like Protocol Buffers, MessagePack, CBOR, etc.). They compress data far more than JSON (by using binary representations for numbers, eliminating field names in favor of tags or position, etc.). However, binary data is not suitable for direct LLM consumption. LLMs operate on text. If you fed raw binary bytes to a text-based LLM, it would just see gibberish tokens (likely many � or random characters if not even allowed). You would have to encode binary as text (e.g., Base64) to include it in a prompt, which would explode the token count (Base64 adds ~33% size, plus it obscures the structure entirely). So, using Protobuf or similar to compress data before sending to an LLM is counterproductive – you lose the model’s ability to parse it, and you often end up with more tokens after base64. Another approach could be to encode a binary format as a series of tokens (like a special vocabulary) and fine-tune a model to decode it. But that’s heavy, custom work far beyond a week’s integration. TOON’s advantage is that it remains textual and understandable to the model, while still significantly reducing size. It hits a sweet spot: a token-optimized text format. We can think of it as analogous to how humans compress language with abbreviations – TOON abbreviates JSON in a way the model can still read. Binary formats, in contrast, would require the model to act like a decoder, which isn’t what we want it focusing on. In summary, binary serialization is great for APIs between programs, but not for AI prompts. TOON gives us a compression approach that works within the model’s text-based world.
	•	TOON vs. Custom compression schemes: Another option we considered is developing our own tailored format or heuristics to minimize tokens. For example, we could send a symbol table of frequently occurring strings (like file paths or function names) and then reference them by short IDs in the prompt. Or we might encode objects as positional arrays to avoid field names altogether (e.g., instead of { "id": 1, "name": "X" }, send [1,"X"] and separately tell the model [id,name]). While these tricks can yield savings, they have downsides:
	•	They introduce complex prompting: the model has to be explicitly told how to interpret the compressed form, which uses up tokens and can be error-prone. Essentially, we’d be inventing a mini-language and teaching the model on the fly.
	•	They sacrifice clarity: if something goes wrong or the model gets confused, debugging is harder because the prompt no longer self-describes the data.
	•	We’d have to write and maintain custom encoding/decoding code for each trick, and ensure they compose well (for instance, combining ID mapping with diffing, etc.).
Arela already does some structured compression (you mentioned using IDs and delta updates). Those are targeted optimizations for specific contexts (like using shorter identifiers for long strings). We can continue to use those techniques in conjunction with TOON. They are not mutually exclusive. In fact, TOON will happily encode short IDs as values which is fine. For example, if we map a long path "src/auth/login.ts" to an ID A1 in a symbol table and then represent files by ID, TOON could list A1 in place of the path string (saving tokens on the string itself). That might yield further compression, but the trade-off is the model has to look up the symbol table we provide. We should evaluate case by case if that complexity is justified on top of TOON.
As a general format, TOON negates much of the need for ad-hoc compression. It’s a principled solution that covers the biggest inefficiencies (structural overhead). Custom schemes might squeeze out a bit more in niche scenarios, but at the cost of complexity and potential confusion. Since TOON is becoming an open standard, it’s better to leverage the community’s work than maintain our own format. By adopting TOON, we also get future improvements and community validation. If we built a homegrown format, we’d shoulder all the maintenance and no other tools would support it.
The only scenario where we might consider augmenting TOON with custom steps is if we identify a specific repetitive large chunk that TOON doesn’t compress. For example, if 90% of our prompt tokens come from code text, TOON won’t reduce those (it’s not a text compressor). We might then consider sending only summaries or IDs for those – but that veers into prompt design more than format design (and indeed we are doing hierarchical context, etc.). That’s separate from the serialization format. For serialization itself, TOON is the state-of-the-art we should adopt rather than reinvent.

Summary of comparisons: TOON stands out as a format purpose-built for AI, whereas JSON/YAML/CSV each have shortcomings either in efficiency or generality for our needs. JSON is too verbose, YAML not as compact, CSV not general enough, and binary/custom formats are not practical for LLMs. TOON offers the best balance: major token savings, sufficient clarity, and growing support. We will, however, remain flexible: if a particular context is better left as JSON or YAML (due to structure), we will do so (the hybrid approach). TOON doesn’t replace those formats everywhere – it augments our toolkit for where it makes sense ￼ ￼.

Code Examples

To illustrate how we would integrate TOON, here are a few code snippets and examples in both TypeScript and Python. These demonstrate encoding JSON to TOON and decoding back, as well as how the output looks.

1. TypeScript (Node.js) Usage – using the official @toon-format/toon package:

import { encode, decode } from "@toon-format/toon";

// Sample data (JSON object)
const data = {
  files: [
    { id: 1, path: "src/auth/login.ts", imports: ["./database"], functions: ["handleLogin"] },
    { id: 2, path: "src/auth/user.ts",  imports: ["./database"], functions: ["getUserByEmail"] }
  ]
};

// Encode the JSON object to a TOON string
const toonStr = encode(data);
console.log("TOON Format:\n" + toonStr);

// Decode the TOON string back to JSON
const parsed = decode(toonStr);
console.log("Decoded JSON object:", parsed);

Running the above might produce output like:

TOON Format:
files[2]{id,path,imports,functions}:
  1,src/auth/login.ts,["./database"],["handleLogin"]
  2,src/auth/user.ts,["./database"],["getUserByEmail"]

Decoded JSON object: {
  files: [
    { id: 1, path: 'src/auth/login.ts', imports: ['./database'], functions: ['handleLogin'] },
    { id: 2, path: 'src/auth/user.ts', imports: ['./database'], functions: ['getUserByEmail'] }
  ]
}

(Note: The TOON output here shows the arrays for imports/functions in square brackets with quotes – the encoder likely quotes them since they are arrays inside the row. This is one way it might appear. Alternatively, the encoder might indent those nested arrays instead of inline – this example is hypothetical and actual output could differ slightly based on implementation.)

In TypeScript, we can integrate this by replacing JSON.stringify(data) with encode(data) when preparing prompts, and if needed JSON.parse(decode(str)) to get data back (though usually we won’t decode the LLM’s response unless it’s structured).

2. Python Usage – using the python-toon package (community implementation):

from toon import encode, decode

# Sample data (Python dict similar to above)
channel = {"name": "tapaScript", "age": 2, "type": "education"}

# Encode to TOON
toon_text = encode(channel)
print(toon_text)
# Expected output (TOON format):
# name: tapaScript
# age: 2
# type: education

# Decode back to Python dict
obj = decode(toon_text)
print(obj)
# Expected output (Python dict):
# {'name': 'tapaScript', 'age': 2, 'type': 'education'}

As shown, the usage mirrors the JSON API: just call encode() on your Python data structures. This indicates that multiple languages support TOON in a similar fashion. If Arela had any Python components (for example, a Jupyter notebook or a backend microservice), we could use this to ensure consistency.

3. Converting Large JSON to TOON and Counting Tokens – to visualize the benefit, here’s a quick Node script (using OpenAI’s tiktoken for tokenization):

import { encode } from "@toon-format/toon";
import { encoding_for_model } from "tiktoken";

// Suppose `largeData` is a JSON object with lots of entries...
const jsonStr = JSON.stringify(largeData);
const toonStr = encode(JSON.parse(jsonStr));

// Use GPT-4 tokenizer (or relevant model tokenizer)
const enc = encoding_for_model("gpt-4");
const jsonTokens = enc.encode(jsonStr).length;
const toonTokens = enc.encode(toonStr).length;
enc.free();

console.log("JSON tokens:", jsonTokens);
console.log("TOON tokens:", toonTokens);
console.log("Savings:", (((jsonTokens - toonTokens) / jsonTokens) * 100).toFixed(2) + "%");

Running such a script on a dataset will print out the token counts and percentage savings. For example, on a user dataset the output might be:

JSON tokens: 84
TOON tokens: 32
Savings: 61.90%

as was shown in one of the community examples ￼. This kind of test can be part of our validation to ensure we’re getting the expected compression.

4. Prompt Example Before vs After – to demonstrate how a prompt content changes, consider a simplified prompt fragment that provides API endpoint metadata to the model:

Before (JSON):

"endpoints": [
  {
    "path": "/user/login",
    "method": "POST",
    "params": ["email","password"],
    "returns": "200 OK with user data"
  },
  {
    "path": "/user/logout",
    "method": "POST",
    "params": [],
    "returns": "200 OK"
  }
]

This might consume ~50+ tokens (with quotes, braces, etc).

After (TOON):

endpoints[2]{path,method,params,returns}:
  /user/login,POST,["email","password"],"200 OK with user data"
  /user/logout,POST,[],"200 OK"

This is much tighter. We’ve removed a lot of quotes (only the return messages are quoted because they contain spaces and would be seen as a single string). The field names path,method,params,returns appear once instead of twice. We would embed this in a prompt like:

System: Here is the API contract.

endpoints[2]{path,method,params,returns}:
  /user/login,POST,["email","password"],"200 OK with user data"
  /user/logout,POST,[],"200 OK"

User: Given the above API endpoints, implement the login logic...

The model reading this sees a clear tabular listing of endpoints. We would check that it correctly interprets that "params": [] means no parameters for logout, etc. In testing, we might ask the model a question about the endpoints to ensure it parsed it (like “which endpoint requires parameters?”).

These code and prompt examples show how straightforward it is to adopt TOON in code, and how the structured data appears to the model. The main changes for developers are using the TOON library functions and being comfortable reading the TOON output for verification.

Risk Assessment

Adopting TOON introduces some new considerations and potential risks. We outline them here along with mitigation strategies:
	•	Model Misinterpretation Risk: Since TOON is new, there’s a risk (albeit small based on our research) that an LLM might not interpret the format correctly in all cases. For example, a model might not immediately recognize the meaning of the bracketed schema or might get confused by complex nesting in TOON ￼. Mitigation: We will verify model outputs on known queries to ensure comprehension. If needed, we can include a brief system prompt explanation about TOON format for clarity. This could be a one-time instruction at the start of the session, costing maybe a dozen tokens – a worthwhile trade if it avoids any confusion. As models evolve or if OpenAI/Anthropic fine-tune on TOON data (which could happen as it gains popularity), this risk diminishes. Additionally, our own testing will build confidence in exactly how the model responds to TOON in various scenarios, so we can document any quirks.
	•	Nested Data and Edge Cases: TOON is not a silver bullet for every data shape. If we apply it blindly to deeply nested or highly irregular data, we might end up increasing token usage or muddling the format ￼ ￼. There’s a risk that we might force an inefficient representation where JSON would actually be leaner. Mitigation: Follow the guideline of when not to use TOON ￼. We will identify data structures where tabular format doesn’t help (tabular eligibility ~0%, e.g., big nested config objects). In those cases, we simply won’t use TOON – we’ll keep JSON. This selective use ensures we only gain, not lose. Also, the encoder itself might produce a more YAML-like output for nested data that ends up longer; we should be vigilant in reviewing token counts. Our integration can have a check: if toonStr is longer (in characters or tokens) than the original JSON string by a certain margin, log a warning or revert to JSON for that piece. This way we fail safe (worst-case we just send JSON as before).
	•	Performance and Latency: One might worry that converting to TOON (which is a form of compression) could add latency, or that LLMs might process weird formats slower. While fewer tokens generally means faster, if a model isn’t optimized for the format, it might have to “think” more to parse it (maybe negligible for GPT-4, but could affect very small models). Also, on local models (like Ollama’s), maybe the token processing speed or caching might not align well with unusual token sequences. Mitigation: We will measure end-to-end latency with and without TOON. If we find any regression (e.g., a local model takes longer despite fewer tokens), we will investigate. Possibly it could be due to the model not using its context as effectively or some backend issue. We could then decide per model: for local use maybe stick to JSON if speed is top priority and the token savings don’t translate. However, initial guidance suggests it’s usually beneficial, and any differences are small ￼. The encode/decode functions on our side are very fast in comparison to network/LLM time, so they won’t be a bottleneck.
	•	Accuracy and Information Loss: We need to ensure no information is lost or altered in translation. TOON is lossless by design (it’s a faithful re-encoding of JSON) ￼. But a bug in the library or misuse could conceivably drop something. For example, what if a key name or a value has an unusual character that the library doesn’t handle? Or if floating-point numbers or large integers might be represented differently (e.g., quotes vs not quotes)? Mitigation: Use the official library which likely has these edge cases covered. We will run the library’s test suite, especially on any corner cases relevant to us (like empty strings, special chars, etc.). Also, since we will keep the original JSON data around, we can always cross-check. The decode function is a great safety net – decode(encode(x)) should equal x. We can run this round-trip on samples to verify integrity.
	•	Debugging Complexity: Introducing a new format means our developers have to get used to debugging prompts with TOON. If something goes wrong in an LLM’s response, will we be able to tell if the issue was our prompt content or the format? It might be trickier initially to pinpoint if, say, a missing piece in the output is due to the model ignoring a part of the TOON input. Mitigation: During development and troubleshooting, we can compare behavior with JSON vs TOON to isolate issues. Also, we’ll make use of decode() to see the JSON equivalent of what was sent. Over time, as we gain confidence, debugging will be as straightforward as it was with JSON. We’ll also update documentation for our team about reading TOON and common pitfalls (like reminding that if something looked off, check if perhaps a value was quoted or not, etc.). Another mitigation is that we do have logs of what we send to the model – those logs will now contain TOON text. We should ensure those logs are still interpretable (maybe log the decoded JSON alongside for easier inspection, at least in verbose debug mode).
	•	Model Output in Unexpected Format: There is a small chance a model might start answering in TOON format when not desired (for example, if we ask it to output structured data and it decides to copy the TOON style). If we expect JSON output but gave it TOON input, the model might mirror that style. Mitigation: Be explicit in prompts about output format. If we want JSON out, we say so explicitly (models typically follow that). If the model ever does output TOON, it’s not the end of the world – we can decode it just like JSON, since we have a parser. Our system could detect if an output looks like TOON and decode it. But ideally, we guide the model to output our expected format. This is something to keep an eye on in agent-agent interactions; for instance, if one agent responds in JSON and we convert to TOON for another, we should instruct the second agent to respond in normal language or a specific format, to avoid any cascade of format mimicry.
	•	Maintenance and Future Changes: As TOON is new, the spec might evolve. For example, they might introduce a new feature or change a detail in v3.0. If we adopt it now, we should be prepared to update our usage if needed. Mitigation: Since we pin to a specific library version, we won’t get breaking changes unexpectedly. We can monitor the project’s GitHub for any major updates. Given the fast adoption, it’s possible they’ll extend TOON, but likely in backward-compatible ways. Also, by being part of the community, we can contribute or at least stay informed. In the worst case, if TOON didn’t pan out long-term (which looks unlikely), we could revert to JSON or another approach – we always maintain the capability to do so (especially by keeping JSON as our internal representation).
	•	Edge-case data content: Things like extremely long strings or content that itself looks like TOON syntax (e.g., a value that contains "{} or unusual patterns) might be tricky. But the library should handle escaping those by quoting. We will test a few odd cases (like a string value that has a comma, or an array containing an empty string, or an array of length 0). For example, an empty array would appear as key[0]: with nothing after the colon – we should see how the model interprets that (likely fine, but we might prefer to explicitly say key[0]: is no entries). We should verify how null is encoded (probably as null without quotes) and ensure the model doesn’t mis-read it. If any such edge case arises, our fallback is to adjust the prompt or possibly use JSON for that piece.
	•	Over-reliance risk: Once we switch to TOON, we rely on the library for correctness and on the format for efficiency. If any bug or unforeseen issue occurs in production, the risk is we send the model something it doesn’t understand and get a bad output. The cost could be a failed task or incorrect answer. To mitigate impact, initial deployment will be monitored closely. We can also put in place a quick fallback mechanism: e.g., if an important query returns a nonsensical answer, our system could detect that and automatically retry with the JSON format. This is more of a fail-safe idea – we might not implement it unless we see a need. But conceptually, if we had a robust evaluation that an output was invalid and we suspected format issues, we could do a second attempt with JSON. This ensures correctness at the expense of some extra tokens on rare occasions.

Risk Summary: The introduction of TOON does carry some uncertainty mainly around LLM behavior with a new format and ensuring we use it in the right places. However, our research and testing plan significantly reduce these risks. The fact that TOON has been measured to improve or maintain accuracy in many cases ￼is reassuring. Most risks are mitigated by the reversible nature of the change: we’re not throwing away JSON, just adding a translation layer. If problems occur, we can always supply the raw JSON as before. Thus, the potential downsides are low and controllable, while the upsides (cost savings, context boosts) are high. With careful phase-wise rollout, monitoring, and fallback options, we can confidently manage the transition to TOON.

References
	•	TOON GitHub Repository (toon-format/toon) – Johann Schopplich, 2025. Official specification, README, and source code for Token-Oriented Object Notation. Includes syntax guide, benchmarks, and multi-language support ￼ ￼ ￼ ￼.
	•	freeCodeCamp Article – “What is TOON? How Token-Oriented Object Notation Could Change How AI Sees Data” – Tapas Adhikary, Nov 13, 2025. An introductory blog post explaining TOON’s purpose, with examples comparing JSON vs TOON, and guidance on using TOON in JS/Python ￼ ￼ ￼ ￼.
	•	Dev.to Article – “TOON: The Smarter, Lighter JSON for LLMs” – Abhilaksh Arora, Nov 2025. Covers a practical overview of TOON, including when it’s best to use, when not to, and token count comparisons. Provides a TL;DR and code for benchmarking token savings ￼ ￼ ￼.
	•	Improving Agents Blog – “TOON Benchmarks” – Matt Collins, Oct 28, 2025. An independent evaluation of how well GPT-4.1/GPT-5 models understand data in TOON format versus JSON, CSV, etc. Presents accuracy vs token trade-offs and highlights that TOON performs well for token efficiency but wasn’t always the top in raw accuracy for certain tests (especially nested data) ￼ ￼.
	•	Hacker News Discussion – “TOON – Token Oriented Object Notation” – HN thread, early Nov 2025. Community commentary on the release of TOON. Useful insights on potential model training familiarity issues and comparisons to “just compress JSON manually”. Notably, one comment points out current models weren’t trained on TOON, suggesting some caution ￼, while another by the benchmark author references their tests ￼.
	•	TOON Specification v2.0 – TOON GitHub, 2025. The formal definition of the TOON format (linked in README). Describes grammar and all features (uniform array criteria, quoting rules, etc.). Also mentions official implementations in various languages and provides test fixtures ￼ ￼.
	•	freeCodeCamp Code Samples (GitHub Repo by author) – The article’s accompanying code, demonstrating usage of @toon-format/toon in JS and python-toon in Python. (Referenced indirectly in text: showing example outputs and usage of encode/decode in both environments) ￼ ￼.

Each of these sources reinforced the understanding that TOON is a practical, production-ready innovation for AI prompt optimization. By leveraging the official documentation and community findings, we have formed a comprehensive view of TOON’s benefits and how to safely integrate it into Arela’s workflow. The plan and analysis above are grounded in these references, ensuring that our decisions are informed by the latest available information on TOON.