Code Summarization for Arela

Goal: Investigate how to automatically summarize source code to reduce LLM context tokens while preserving semantic meaning. This report reviews the state-of-the-art in code summarization, AST-based extraction, prompt design, token efficiency, quality evaluation, existing tools, and proposes an implementation strategy for Arela.

Figure: High-level pipeline of automatic source code summarization, consisting of (1) source code modeling, (2) summarization generation, and (3) quality evaluation ￼ ￼.

1. Code Summarization Techniques

Definition: Code summarization is the task of generating a concise natural language description of what a piece of source code does ￼. A high-quality summary explains the code’s purpose and functionality, helping developers understand the code more easily ￼. Traditionally, code summaries often serve as code comments or documentation.

Approaches: Early approaches used manually-crafted templates and simple heuristics. These methods extracted keywords (e.g. function names, identifiers) to form sentences, but they missed deeper semantic info and heavily depended on good naming conventions ￼ ￼. Next came information retrieval (IR)-based methods, which attempt to find similar code snippets and reuse their documentation or use keyword extraction. IR methods’ effectiveness depends on large, high-quality code corpora and often struggles if code is unique or lacks prior documentation ￼.

Modern state-of-the-art techniques are machine learning-based, especially deep learning:
	•	Sequence-to-Sequence Models: Early ML models treated code summarization like translation, feeding code as a sequence of tokens and generating a description. RNN-based seq2seq models (with attention) were used, but faced issues with long code and complex structures.
	•	AST-Based Models: Researchers incorporated code’s structure via Abstract Syntax Trees. For example, code2seq and code2vec (2018-2019) break code into AST paths to better represent its structural features ￼ ￼. AST-based encoders (like Tree-LSTMs or specialized transformers) can capture syntax and semantics more effectively than plain text token models ￼ ￼. This reduces the learning burden since the model doesn’t need to infer the code structure solely from linear tokens.
	•	Transformer Models: Recent works use transformers pre-trained on code. CodeBERT (2020) is a bi-modal encoder pre-trained on code and natural language, which can be fine-tuned for summarization tasks ￼. GraphCodeBERT (2020) extends CodeBERT by incorporating data flow graph information for better code understanding ￼. CodeT5 (2021) and PLBART (2021) are sequence-to-sequence transformers (encoder-decoder) fine-tuned on code-to-comment generation, achieving strong results on benchmarks. These models can generate summaries in fluent natural language by attending to the most relevant parts of code.
	•	Large Language Models (LLMs): Models like OpenAI Codex, GPT-4, StarCoder, and Code Llama (7B–34B parameters) are trained on massive code corpora. They are capable of summarizing code zero-shot (just by prompting) or with minimal examples. LLMs implicitly learn coding patterns and documentation style from training data. For instance, OpenAI’s Codex (which powers GitHub Copilot) can produce a function’s description if prompted with a docstring comment. Industry tools: GitHub Copilot uses an LLM (Codex) to suggest code and sometimes summaries (docstrings) based on context. Cursor (an AI code editor) uses smaller models to summarize files when context limits are hit ￼. These industry solutions demonstrate that LLM-based summarization is feasible at scale – they often combine retrieval or context filtering with LLM generation (e.g., only feeding relevant parts of the code to the model).

AST-based vs Full-Text: An open question is whether to feed the raw code or some structured representation to the model. Feeding full source code (especially long files) consumes many tokens and may include details not relevant to a high-level summary. Research suggests that we may not need the entire code for an accurate summary. In fact, an empirical study (Ding et al., 2024) found that using only a function’s signature (name, parameters, etc.) often suffices to summarize its main functionality. Surprisingly, truncating input to as low as 20 tokens had minimal impact on summary quality ￼. By focusing on function signatures instead of full bodies, summarization performance improved: using signatures yielded over 2% higher quality scores and 9.2% more summaries judged high-quality by programmers compared to using full code ￼. This indicates that a lot of the function’s semantics are captured by its declaration and name (when well-named), and the model can infer the rest. Thus, extracting the right information (like definitions) is crucial for efficient summarization.

What to capture in summaries: The key is to preserve semantic meaning – what the code does – while omitting unimportant implementation details (the how). The summary should answer: “What is the purpose of this code? What functionality does it provide?” Important information includes:
	•	High-level purpose: A brief statement of the module/function’s overall responsibility.
	•	Inputs and outputs: What inputs (parameters) it takes and what it returns or effects it has (side effects, state changes).
	•	Key functionality: Major steps or algorithms (only if notable) and external interactions (e.g. calls to important APIs or databases).
	•	Public API surface: If it’s a module or class, mention the main classes, functions, or constants it exposes for use by others.

The optimal summary length depends on the code’s complexity and the context usage. For a single function, 1-3 sentences (say 30-60 tokens) focusing on its behavior is often enough. For a larger module or class, a slightly longer summary or structured format (listing main components) might be needed. We aim to compress code by ~5-10× – for example, summarizing a 1000-line file (which could be ~3000-5000 tokens of code) into maybe 300-500 tokens of summary. This compression should retain the essential 90% of semantics so that a developer or an LLM can answer questions about the code using the summary. Different code types might need different emphasis:
	•	Utility functions: Often small and single-purpose – a one-sentence summary of their return value or effect suffices.
	•	UI Components: Mention what UI element it represents and its key interactive features or state.
	•	APIs or Services: Document each endpoint or major function – e.g., “This module handles user authentication (login, logout, token refresh) using OAuth2, and exports middleware for route protection.”
	•	Libraries or Tools: Focus on the provided functionality and how other code uses it (the public API and any notable internal mechanism).

Using the above approaches, the state-of-the-art in code summarization today often blends structure and semantics: for example, extract the structural outline (using an AST) and then use an LLM to generate a natural language description. This hybrid strategy leverages the precision of static analysis with the fluency of learned language models. In the next section, we delve deeper into which AST elements to extract for summarization.

2. AST Extraction for Summarization

Using the AST: By parsing the code into an Abstract Syntax Tree (AST), we can programmatically extract important elements to feed into the summarization process. The TypeScript AST (via tools like ts-morph or the TypeScript Compiler API) provides structured access to declarations, allowing us to focus on the interface of the code rather than its low-level implementation. Key elements to extract include:
	•	Function and Method Signatures: For each function (or class method), get its name, parameters (and types), return type, and any JSDoc comment. The signature often reveals the intent (via the function name and param names) and usage contract. For example, with ts-morph one can retrieve all top-level functions easily (sourceFile.getFunctions() returns all function declarations ￼). A function calculateTotal(price: number, taxRate: number): number almost describes itself – a summary can say it “calculates the total price including tax.” If a JSDoc is present, it likely contains a human-written summary we can utilize or refine.
	•	Class and Interface Definitions: Extract class names, their inheritance or implements relations, and summaries of their purpose. Within classes, list important public methods and properties. For summarization, focusing on the class’s role and its public API is key (private helper methods can usually be omitted unless they implement key logic). For instance, if we have a class UserManager with methods createUser, deleteUser, etc., the summary should note it “provides user account management (creation, deletion, etc.).”
	•	Module Exports: Identify what the module exports (functions, classes, constants). The exports define the module’s public interface and thus what is important for its role. If a file exports a function or a class, those are likely the primary things to summarize. In contrast, internal utility functions not exported are less important unless they carry significant logic. Using AST, we can check for export modifiers or analyze module.exports in JS. Focusing on exported symbols ensures the summary covers what other parts of the project might use.
	•	Imports/Dependencies: Knowing which modules a file imports can hint at its functionality. For example, importing fs suggests file system operations, or importing an http library indicates web requests. Including a brief mention of key dependencies can provide context (e.g., “uses Express.js for handling HTTP requests”). However, we should be selective – list only major external or domain-specific libraries, not every single import. The AST can enumerate import declarations; tools like ts-morph have sourceFile.getImportDeclarations() and similar for requires.
	•	Type Definitions: If the file contains important TypeScript types (interfaces, type aliases, enums), these are part of the code’s semantics. Summaries might include a note like “Defines an interface User with fields id, name, email.” This helps understanding data structures. But again, only noteworthy types (especially those exported or central to functionality) need mention.
	•	Comments and Docstrings: AST parsing can retrieve comments, especially JSDoc. A well-written JSDoc may already summarize the code’s purpose. We can extract these and either use them verbatim or refine them (to avoid outdated info). Inline comments might explain tricky logic; those are harder to integrate automatically, but if we detect a significant comment (e.g., a // TODO or rationale comment near a complex algorithm), it could be included in a refined form. Ts-morph provides access to JSDoc tags (node.getJsDocs()) and even general comments if needed ￼.

Handling Large Files: For files over a certain size (e.g. > 500 lines or thousands of tokens), summarizing by AST extraction is especially valuable. We should prioritize global structure over details. Strategies:
	•	Focus on top-level definitions (exports, main classes/functions) first. In a 1000-line file that defines many functions, the summary should not attempt to describe every line – it should describe the module’s overall purpose and perhaps the most important components.
	•	Omit or collapse repetitive or low-level parts. For example, if there are many small helper functions, we might not list each—perhaps mention “includes utility functions for X” collectively.
	•	Preserve relationships: If function A calls function B in the same file as part of a workflow, the summary might just describe the workflow instead of each function separately. We might do a lightweight static analysis: e.g., detect the main function or an exported function’s calls to others to understand the overall flow.
	•	For very large files, an idea is hierarchical summarization: first summarize at a high level, and possibly have the option to get more detailed summaries per section or per function on demand. In Arela’s context, however, we likely want a single compact summary per file for context.

Public vs Private: Emphasize public API elements (exports or public class members) because those define the code’s contract. Private functions or internal logic can be left out unless they implement something uniquely significant (e.g., a complex algorithm that is the core of the module). This prioritization means the summary will lean towards what the code offers to its callers rather than how it internally works.

Semantic Relationships: While full program analysis (like building a call graph or dependency graph) might be beyond our scope for summarization, we can capture some relationships:
	•	If the code uses important external services (e.g., calls a database or an HTTP API), mention that: “This module fetches data from the GitHub API…”.
	•	If the code is used by other known modules (harder to know statically unless we invert the analysis), we might skip that for now, focusing on the code in isolation.
	•	Within the code, if there is a main orchestrator function that calls others, the summary can reflect that orchestration (“First does X, then Y, then returns Z” in broad strokes).
	•	We may consider using static analysis tools or the AST to detect patterns (like the presence of a loop over something, error handling, etc.) but these might be too granular for a high-level summary. Instead, rely on the developer-written hints (names, types, docs) to infer semantics.

In summary, extracting a skeletal outline of the code via the AST guides the summarization. We gather the names and signatures that carry semantic meaning, then feed those into an LLM (or template) to generate a fluent summary. This not only reduces tokens (we skip the bodies and only provide the “headers”), but also aligns with research findings that summaries based on function signatures can be highly effective ￼. The next section explores how we can prompt LLMs to produce quality summaries from this extracted information.

3. LLM Prompts for Code Summarization

Designing the right prompt is critical to get useful summaries from an LLM. We want prompts that guide the model to focus on the code’s purpose, not regurgitate code or get lost in trivial details. Several prompting strategies could be considered:
	•	Zero-shot Brief Prompt: A simple instruction like “Summarize this code in 2-3 sentences. Focus on what it does, not how it does it.” This direct prompt encourages brevity and high-level description. By explicitly telling the model to avoid implementation details (“not how”), we steer it toward the semantic summary. This approach is straightforward and works reasonably well if the model is powerful (e.g., GPT-4) and the code snippet is of manageable size.
	•	Structured Prompt: Providing a format can ensure the summary covers key aspects systematically. For example: *“Analyze the following code and provide:
	1.	Purpose: (one sentence describing the main responsibility)
	2.	Key Functions/Classes: (a bullet list of important functions or classes and their roles)
	3.	Dependencies: (list of important imports or external APIs used)
	4.	Public API: (what this module exports or how it can be used by others)”*.
This prompt yields a structured output. The advantage is that it forces the model to extract specific information (which we know from the AST), and present it clearly. It’s especially useful for larger files where a single blob of text might become unclear – instead, we get an organized summary. This was inspired by documentation style, ensuring no key area is missed. The risk is the model might produce a template even if some sections are not applicable (e.g., a file might not have imports, so the model might hallucinate some or say “none”). We should instruct it to omit or say “None” if something isn’t present, to maintain accuracy.
	•	Detailed Technical Prompt: For complex code, we might prefer a more descriptive summary. A prompt like: *“Provide a technical summary of this code including:
	•	Main responsibility of the code.
	•	Its input and output (data it processes or returns).
	•	Any side effects (e.g., file I/O, network calls, global state changes).
	•	Key algorithms or patterns used (if any, e.g., uses memoization, observer pattern).”*
This encourages the model to do a mini “code review” and mention important implementation details only if they are relevant to understanding behavior (e.g., it might mention “uses a DFS traversal” if the algorithm is central to its purpose). This style yields a richer summary, which might be 3-5 sentences or bullet points. It trades some brevity for completeness.

Few-shot vs Zero-shot: We can improve prompts by giving examples (few-shot), e.g., show a small function and a good summary of it, then ask it to do the same for the real code. Few-shot prompting can calibrate the style and ensure the model knows exactly what format we want. However, examples consume precious tokens. Since our goal is token efficiency, we might rely on well-crafted instructions (zero-shot) or at most one short example. If we design a consistent format (like the structured prompt above), the model often follows it without needing multiple examples, especially if using a system message or fine-tuning.

Chain-of-thought prompting: Another technique is to allow the model to reason step by step. For example, one could prompt: “First, list the major steps or components in the code. Next, summarize the purpose of each. Finally, combine them into an overall summary.” This is a form of chain-of-thought that might lead to a more accurate summary, because the model explicitly considers the code structure. However, doing this in one prompt risks the model writing out an overly long answer with the intermediate steps. A better approach might be an internal chain-of-thought: we could ask the model hidden questions or use functions (if the API allows) to have it analyze then summarize, but in a single user-facing answer we typically just want the end result. For our use, it might be overkill to do multi-turn reasoning within a single request due to complexity.

Consistency and Style: We should decide on a format that will be consistent across files. For human readability and for Meta-RAG’s usage, a short paragraph (or a structured list) that uniformly describes code is desirable. We might maintain a prompt library where different prompt templates are stored for different scenarios:
	•	A prompt for summarizing a single function (maybe a one-liner).
	•	A prompt for summarizing a module or larger file (the structured format).
	•	Perhaps a prompt variant for classes (to specifically list methods).

By testing these prompts on representative code samples (see Example Test Cases below), we can observe which yields the most useful output. Key things to evaluate:
	•	Does the summary stay factually correct? (LLMs sometimes hallucinate, e.g., inferring functionality that isn’t there – keeping it constrained by AST info helps.)
	•	Is it concise enough? (If not, we tweak instructions to emphasize brevity.)
	•	Does it capture semantics that would help answer questions about the code? (We can try asking the model or ourselves some questions using only the summary, to see if information is missing.)

Initial trials suggest:
	•	The brief freeform prompt is good for very small functions or when we only need a high-level gist.
	•	The structured prompt ensures thoroughness for modules, at the cost of a slightly longer output. It’s great for consistency (we know every summary will have a “Purpose” line, etc.).
	•	The technical prompt can produce detailed descriptions, which might be more than we need for context compression, but it could be useful if we later want to generate documentation.

For Arela’s needs (compressing context for an LLM), a concise summary with key points is ideal. Therefore, we might lean on the brief or structured prompts for automated summarization. We will test both and see which preserves answers to likely questions about the code. Ultimately, the prompt used in production could even be dynamically chosen: e.g., if a file is extremely large, use a more bullet-point format to ensure nothing critical is missed; if it’s small, a sentence or two might suffice.

4. Token Efficiency

A major motivation for code summarization in Arela is to save tokens in LLM prompts, thereby reducing costs and fitting more context. Here we consider how much savings we can get and the trade-offs:
	•	Compression Ratios: We target a 5× to 10× reduction in token count. For example, a 1000-line TypeScript file might be around 3000 tokens of code (rough estimate). A summary for that might be ~300 tokens, achieving a 10× compression. Smaller files (say 100 lines) might compress 5× (e.g., 500 code tokens to a 100-token summary). The ideal ratio may vary, but generally we want an order-of-magnitude fewer tokens.
	•	When to Summarize: Summarization has overhead (we must generate it, and there’s risk of omitting details). For very small code snippets (a few lines), it might not be worth summarizing at all; the raw code is short enough and unambiguous. But once a file grows beyond a threshold (perhaps ~50-100 lines or > 500 tokens), summarizing starts paying off. Our strategy can be:
	•	If file length < X, include code directly in context (or not compress much).
	•	If >= X, use the summarization pipeline.
	•	What is X? Possibly around 100-200 lines of code, but this we can fine-tune by experiments. The user’s suggestion is maybe >500 lines definitely summarize. We could start summarizing at lower thresholds to be safe.
	•	Information Loss vs Gain: By summarizing, we inevitably lose some information (exact variable names, specific logic). The aim is to keep all semantically important info. We accept that very detailed questions (like “on line 200, why did they use i <= 10 instead of < 10?”) cannot be answered from the summary – but such questions are rare for our use-case. We focus on questions like “What does this function do?” or “How does this component achieve X?”. For those, the summary should have >90% of the needed info. If we measure “information retention” as the ability to answer high-level questions, we want ~90-95% retention.
	•	Empirical Token Savings: We plan to test on real files from Arela (see Example Test Cases section). For each:
	•	Count original tokens (using e.g., the OpenAI cl100k_base tokenizer to simulate GPT-4 token counts).
	•	Generate a summary and count summary tokens.
	•	Compute compression ratio.
	•	Example target: If src/memory/hexi-memory.ts is 300 lines (~1000 tokens), maybe our summary is ~150 tokens (compression ~7×). We’ll verify such numbers.
	•	Case Study – Cursor’s approach: As noted earlier, Cursor’s AI assistant handles context limits by partially reading files and summarizing others. By default, it only reads the first 250 lines of a file and will summarize beyond that, to conserve context ￼. This kind of approach validates that after a certain point, including raw code has diminishing returns and summarization is needed. We might adopt a similar conservative strategy to ensure we never feed extremely large texts into the prompt.
	•	Edge Cases: Some files might be mostly data (e.g., a big JSON or a long list of constants). Summarizing those is tricky – you can’t really “summarize” a list of 100 constants other than saying “100 constants defined for X”. If such data is needed, perhaps those files should not be summarized but handled differently (maybe by sampling or skipping details). Another edge case: Generated code or minified code – these are usually not meaningful to summarize (e.g., a huge webpack bundle file). We should detect and possibly exclude or extremely compress those (“this file is a bundled/minified script”).
	•	Adaptive Summaries: We could attempt more aggressive compression for extremely large files. For instance, compress 10× normally, but if a file is huge (like 5000 lines), perhaps do a two-level summary (summary of each section then overall) to reach 20× compression without losing key points. This might be future enhancement; initially, a uniform summarization approach per file is simpler.

In summary, our goal is to maximize token savings while minimizing loss of critical information. We will quantify success by how well questions can be answered using only the summary. If we find that some answers are lost, we may adjust the summary length or content selection. The next section addresses how to evaluate the quality of these summaries formally.

5. Validation & Quality

Ensuring that the summarized code faithfully represents the original is crucial. We will employ both automated metrics and qualitative checks:
	•	String Similarity Metrics: Common NLP summarization metrics like BLEU, ROUGE, and METEOR have been used in code summarization research to compare generated summaries with reference summaries ￼ ￼. For example, BLEU measures n-gram overlap (0 to 1 score), ROUGE measures recall of n-grams, and METEOR considers precision/recall with synonyms ￼ ￼. In our case, we often don’t have a “reference” summary (unless we use existing docstrings as reference), so these metrics are harder to apply directly. They are more useful in a training scenario with labeled data.
	•	Semantic Similarity Metrics: We can use embeddings to measure if the summary captures the code’s semantics. For instance, BERTScore uses a pre-trained language model (like BERT or CodeBERT) to compute similarity between summary and reference ￼. There are code-specific embedding techniques too. An interesting new metric is SIDE (Summary Alignment to Code Semantics) ￼, which was mentioned in a 2024 study. SIDE scores how well a Java method’s summary aligns with its code on a scale [-1,1] (higher means better alignment). Such a metric specifically tries to gauge semantic faithfulness (though it’s designed for Java and method-level summaries).
	•	LLM-based QA Evaluation: One practical way to evaluate our summaries is to use an LLM itself. For example, take some code, generate a summary, then ask an LLM questions about the code’s behavior using only the summary. If the LLM can correctly answer (or if we as experts can), that indicates the summary retained the info. This is akin to “open-book exam” for the summary. Another variant: ask the LLM to identify differences between the summary and code, or to judge if the summary is accurate given the code. In fact, a recent line of research explores using LLMs as evaluators for code summaries ￼ (“Can Large Language Models Serve as Evaluators for Code Summarization?”). We must be cautious – LLMs might not perfectly judge correctness, but they can spot glaring omissions or hallucinations.
	•	Human Evaluation: Ultimately, for high confidence, a human (developer) should review some summaries. We could define criteria: Correctness (no false statements about the code), Completeness (capturing main points), Conciseness, and Clarity. Each summary can be rated or at least checked against the code. In the research world, it’s common to have developers rank summaries or decide if one summary is better ￼. We might do a small-scale internal evaluation on representative files.
	•	Avoiding Common Pitfalls: A known challenge is that word-overlap metrics (BLEU, ROUGE) don’t always correlate with human judgment for code. A model might generate a summary that’s worded differently but is actually better than the reference, yet gets a low BLEU. Conversely, it might get a high BLEU by copying some comment text but miss the point. Mastropaolo et al. (2023) noted that such metrics capture only one aspect of quality and not overall semantic correctness ￼. Therefore, we won’t rely solely on these scores. Instead, we’ll emphasize semantic evaluation.
	•	Acceptable Loss: We need to define what amount of detail loss is acceptable. For Arela’s use (context for Q&A), as long as the summary covers the major functionality, small omissions are acceptable. However, incorrect information is not acceptable – we’d rather the summary say less than say something wrong. Automatic detectors for inaccuracies are hard, but one strategy is to have the LLM itself double-check (for instance, after generating a summary, we could prompt: “Does this summary correctly describe the code?” and see if it catches issues).
	•	Iterative Refinement: We may incorporate feedback loops. For example, if an LLM (or user) asks a question that the summary cannot answer, that indicates a gap. We could update the summarization logic to include that info next time. In an automated pipeline, this could mean tuning the prompt or extraction rules. Perhaps in the future, an RLHF (reinforcement learning from human feedback) approach could refine the summarizer, but that’s beyond initial implementation.

In practice, we will validate on our example test cases:
	1.	Use the code and summary to answer predetermined questions (“What does this function return in scenario X?”, “Does it call external APIs?”, etc.).
	2.	Use metrics like BERTScore or embeddings cosine similarity between code and summary (by representing code as bag-of-words or doc embedding) to ensure the summary isn’t totally off.
	3.	Possibly run the code (if feasible) with a simple input to see if summary predicted the behavior correctly (for pure functions).

Maintaining semantic meaning is paramount. We prefer the summary to under-state rather than over-state. For instance, if the code sorts data using quicksort, the summary can just say “sorts the data” (not necessarily naming the algorithm, unless relevant to usage). If the code sends an email, the summary should mention that side effect. By aligning our extraction (Section 2) and prompting (Section 3) with these goals, we aim to maximize semantic fidelity. Over time, as we integrate into the Meta-RAG pipeline, we’ll gather more feedback on summary quality and can adjust accordingly.

6. Existing Solutions and Tools

It’s wise to survey existing solutions, both to potentially leverage them and to learn from their approaches:
	•	GitHub Copilot / OpenAI Codex: Copilot doesn’t explicitly summarize code; it generates code. However, if you ask it “// Summary of function X” it will attempt to produce a comment. Under the hood, it’s an LLM (Codex) that has seen many code-comment pairs. While we can’t use Copilot’s model directly, its existence proves that large models can do in-code summarization fairly well. OpenAI’s APIs (like GPT-4 or the newer GPT-4 Code Interpreter model) could be used to summarize code with proper prompting. The downside is cost and dependency on external API. We aim to implement summarization on our side possibly using smaller or open models for cost efficiency.
	•	Cursor AI (Code editor): Cursor uses context compression techniques in an editor environment. Specifically, it can index a codebase and use embeddings to find relevant pieces, and as noted, it will auto-summarize files when hitting context limits ￼. This suggests a two-phase approach: use a smaller model or heuristic to summarize, then feed summary to the main model. Our approach aligns with this. We might not have Cursor’s exact algorithm, but based on documentation, it likely picks out class and function definitions (similar to our AST extraction) to form summaries. We can draw inspiration but implement in-house.
	•	Open-source Summarization Models:
	•	CodeBERT and GraphCodeBERT: These are pre-trained models we might fine-tune or use. However, they are encoder-only (they produce embeddings) and would require a separate decoder to generate text ￼. Alternatively, we could use them to get vector representations for comparing code and summary as mentioned.
	•	CodeT5: There is a small (60M) and base (220M) version open-sourced by Salesforce. It can generate summaries if fine-tuned on CodeXGLUE’s dataset (which has code-documentation pairs for Java, Python, etc.). We could potentially fine-tune or use a pre-fine-tuned model if available. However, integrating a separate model might be complexity overhead if we can achieve good results with prompting GPT-4 or local LLMs.
	•	Code Llama / StarCoder: These are large code-specialized LLMs (7B to 15B parameters for StarCoder, up to 34B for Code Llama). They could be run locally (StarCoder) or through an API (some cloud for Code Llama). They might be cost-effective compared to API calls. For example, StarCoder can handle context up to 8K tokens and is trained on code and comments. We might test if StarCoder-15B can summarize a 300-line file reliably via prompting. If yes, it could be integrated as a local service (Ollama, etc., as the user notes).
	•	Parsing Tools: For AST extraction, we have:
	•	ts-morph: A high-level TypeScript AST library. It’s convenient for extracting details (we saw examples for functions, classes, etc.). We should note performance: ts-morph wraps the TypeScript compiler API. For very large projects or files, it can be slow to parse and create AST in memory ￼ ￼. However, since we only need to parse a file when summarizing (which might be a one-time or infrequent operation, possibly done at dev time or cached), performance is likely acceptable. We can optimize by parsing only once and reusing the AST if needed, or using the structure approach (which ts-morph supports) to avoid re-parsing on repeated operations ￼ ￼.
	•	Tree-sitter: A fast, lightweight parsing library in C with bindings for many languages. Tree-sitter could parse TypeScript/JavaScript quickly and give a syntax tree. However, extracting semantic info (like resolved types or symbol definitions) might be harder with tree-sitter because it’s mainly syntactic. Ts-morph, being built on TypeScript compiler, can give types and symbol resolution which might not be strictly necessary for summarization but can help (e.g., knowing a function’s return type or whether something is a type alias vs interface).
	•	@typescript-eslint/parser: Another parser that produces an AST (compatible with ESTree format) for TS. It’s used in ESLint. Could be used if we were comfortable navigating that AST directly. But ts-morph likely provides easier APIs.
	•	Documentation Generators: Tools like TypeDoc (for TS) or JSDoc might have some logic for extracting summaries (they usually take the first sentence of a JSDoc as a summary). While they don’t generate summaries, they show what information is typically considered summary-worthy (e.g., description of functions, classes, etc.). We can follow similar conventions.
	•	Other Projects: We found a GitHub project ai-code-summary ￼ which aggregates code files into Markdown summaries. It might be a simple implementation possibly using OpenAI API. While not necessarily state-of-art, it indicates interest in such tooling. There’s also research prototypes like Code2Doc etc., but many are not production-ready.

Using Existing Libraries:
We will definitely use a parser library (ts-morph or tree-sitter). ts-morph’s license (MIT) is permissive, so no issue. For summarization models, if we stick with OpenAI or Anthropic, that’s via API (cost but no license issue). Open-source models like StarCoder (OpenRAIL-M license) and Code Llama (Meta’s license) can be used for our purposes (likely internal tool). The decision might come down to speed/cost trade-off: e.g., running a 15B model locally might be slower but no token cost; calling GPT-4 is fast and high-quality but costs per token and relies on external API.

Commercial Insights: From the commercial side, the fact that companies are building such features suggests:
	•	Summaries should be kept up-to-date (maybe regenerated as code changes).
	•	Caching is important (to avoid re-summarizing unchanged code).
	•	Integrations with code search (embedding) might complement summarization (i.e., if a question is asked, one could either pull the summary or do a semantic search for relevant code).
	•	They likely had to deal with hallucinations: possibly by grounding the LLM with actual code context (we plan to do that by feeding AST info directly).

We did not find an off-the-shelf library that does exactly “summarize code for context length reduction” – this seems to be an emerging need addressed in bespoke ways (like Cursor’s way). So Arela’s implementation will be somewhat custom, but built on proven components (parsers, LLMs).

Finally, an interesting existing approach is using embeddings as an alternative to summarization: e.g., instead of summarizing long code, embed it and use vector search to see if it’s relevant. However, if the code is relevant, one then still needs to present it or summarize it to the model. We may combine approaches: for irrelevant code, no need to even summarize; for relevant code, summarization is our way to include it. This is exactly meta-RAG’s goal: retrieve relevant pieces, compress them, and feed to the Q&A LLM.

7. Implementation Strategy for Arela

With the research insights above, we propose the following implementation plan for integrating code summarization into Arela (Meta-RAG pipeline):

Architecture:
	1.	Integration Point: Code summarization will be a preprocessing step in our Meta-RAG pipeline. When ingesting repository files or when a query result includes a large code file, we will generate a summary of that file’s content to store in our knowledge index (or to use on the fly for answering).
	2.	On-Demand vs Precompute: We have a choice:
	•	Precompute Summaries: On repository ingestion, immediately parse and summarize all code files above a certain size. Store these summaries (perhaps in a summaries.json or in a vector store alongside embeddings). This makes retrieval fast – at query time, we already have summaries.
	•	On-Demand: Alternatively, only summarize a file when it’s needed (e.g., it was retrieved as relevant for a question but is too large to include fully). This delays computation to query time, which could add latency.
A hybrid approach is ideal: precompute for known large/important files (especially those likely to come up in queries like core modules), and allow on-demand for less common files to save upfront work. Since our timeline for research is short, we might start with on-demand (simpler to implement incrementally) and then add caching.
	3.	Caching & Invalidation: If we summarize a file, cache the result (in memory or on disk). We can identify a file by a hash of its content or last modified timestamp. If the file changes (in a new git commit, for instance), the summary should be invalidated and recomputed to avoid stale information. For a live coding environment integration, we could hook into file save events to refresh the summary.
	4.	Multi-language Support: Initially, focus on TypeScript/JavaScript (Arela’s primary language). But design the summarization module to be extensible. We can abstract an interface like summarizeCode(filePath, language). For Python, Go, etc., we’d plug in different AST extractors:
	•	For Python: use ast module (Python’s inbuilt AST) or tree-sitter with a Python grammar, and extract similar info (function defs, docstrings, classes).
	•	For Go: go/ast package, focusing on functions, structs, comments.
	•	We could leverage tree-sitter’s uniform interface for basic structure across languages. Tree-sitter can parse many languages into a similar node tree, but we would need custom logic per language to extract meaningful pieces (since each language has different keywords, etc.).
	•	In the near term, supporting TS/JS thoroughly will cover a lot. We note that many principles (summarize by focusing on definitions) carry over to other languages.
	5.	Performance Considerations: We aim for summarization to be reasonably fast. Parsing a file with ts-morph is usually a fraction of a second for files of a few hundred lines. Generating the summary via an LLM is the slower part (depending on model and length):
	•	If using GPT-4 or API, we might stay within a 1-3 second range per file summary (due to network latency). Summarizing, say, 10 files might take ~20 seconds which is acceptable if precomputed, but too slow if user is waiting at query time.
	•	If using a local model (like a 7B or 15B), generation might be slower (maybe 5-10 seconds for a summary on CPU, faster on GPU). We might restrict to smaller context or smaller models for summarization. Another idea: use GPT-3.5 (cheaper and faster) for summarization, and keep GPT-4 for the final Q&A. The summary doesn’t necessarily need the absolute top-notch language finesse, as long as it’s accurate. OpenAI’s gpt-3.5-turbo can be very cost-effective here.
	•	We should also consider rate limits if using an API when summarizing many files. If precomputing, we can space them out or batch if API supports.
	6.	Pipeline Flow:
	•	For each file to summarize: Parse AST -> produce intermediate representation (like a JSON with function names, etc.) -> feed into prompt -> get summary text -> store it.
	•	Possibly, we will implement a fallback: if AST parsing fails (e.g., syntax error or unsupported language), we can fallback to plain text prompt (“summarize this code snippet: [code]”). The quality might be lower but at least we have something. Or we skip summarizing that file.
	•	ts-morph specifics: We create a Project and sourceFile for each file. Use methods to collect:
	•	All exported functions, classes, constants.
	•	For each, get name, maybe type signature.
	•	Possibly get the first sentence of JsDoc if exists.
	•	We then construct a prompt context like: “File has X, Y, Z. [Maybe list them]. Summarize the file’s purpose.”
	•	Or directly, we could let the LLM read a semi-structured outline of the file. For example, feed it: “Function: updateCheck() – checks for updates (returns boolean)\nFunction: getLatestVersion() – calls npm registry…\nExported: updateCheck, getLatestVersion.” and then prompt to make a narrative summary. This ensures we only feed the relevant info, not entire code.
	•	We’ll maintain the prompt templates as discussed. Perhaps store them in a config or prompt library file so we can tweak easily without changing code.
	7.	Output format: The summary could be stored as markdown text (since it might contain lists, etc.). In the Meta-RAG context, these summaries might be concatenated or indexed. We should include in the summary text itself the file reference (e.g., “Summary of update-checker.ts: …”) so it’s clear which file it describes if multiple summaries are present. Or we store it as an object with filename metadata.
	•	If the summary is for internal use only (feeding to LLM), formatting matters less, but clarity and consistency still matter for debugging and possible user viewing.
	•	We might consider adding a marker that it’s a summary to avoid later confusion between summary text and actual code content in the knowledge base.

Example Implementation Steps:
	1.	Parsing & Extraction: Write a function using ts-morph to extract FileSummaryInfo (with fields like functions: [ {name, params, returnType, docComment} ], classes: [ {name, methods:[...], extends, implements, docComment} ], imports: [ ... ], exports: [ ... ]). This acts like an AST-to-data transformation.
	2.	Prompt Prep: Write a function to compose a prompt from FileSummaryInfo. Possibly, if using the structured prompt, we might directly fill in sections. For example:

Purpose: This file defines a function to check for updates and notify the user.
Key functions:
 - `checkForUpdates()`: checks the current version against the latest published version.
 - `notifyUser()`: (internal) displays an update notification.
Dependencies: uses `node-fetch` to call an external update API.
Public API: exports `checkForUpdates`.

This could be directly assembled without an LLM if we trust simple heuristics, but to get a nicer natural language flow, we feed it to an LLM.

	3.	LLM call: Use an LLM with a prompt template around the above info. For instance: “You are a code documenter. Here is some information about a TypeScript file: [insert structured info]. Write a concise summary of what this code does.” We must experiment with how much info to include. If we include too much (like all param names), the prompt might be long. Maybe just listing the top-level function names and their doc comments is enough context for the LLM.
	4.	Post-process: Ensure the output doesn’t contain code or too many specifics. If the LLM output is very long, we might truncate or instruct it to be shorter. We should also strip any bits that are uncertain or hallucinated. A basic sanity check: If the code has a known doc comment and the LLM output says something contradictory, we might prefer the doc comment’s content.
	5.	Caching: Save the summary with a key of file hash. Provide a command or script to update all summaries in one go if needed (e.g., yarn summarize-codebase).
	6.	Integration: When the Meta-RAG retrieval finds a code file relevant, it should retrieve the summary text instead of raw code (especially if raw code is beyond a size threshold). Or it could retrieve both but prefer summary for inclusion. Perhaps we store both in the index – the vector embedding might still come from the raw code (embedding of code might capture semantics too), but then use summary for the final answer context.
	7.	Testing: Use the Arela test files to validate the pipeline end-to-end. See if a query like “What does update-checker.ts do?” can be answered with the summary alone (it should).

Incremental Updates: As the user asked, how to handle file changes: whenever code is modified, we either automatically re-summarize (if running as part of a dev pipeline or CI) or at least mark the old summary as stale. If this is integrated in an IDE context, maybe summarization runs on file save for large files, updating a local summary. In a static documentation context, we’d update on new releases or commits.

Performance Target: Ideally, summarizing a single file should take < 3 seconds (target 1 second). If we precompute, this is fine. If on-demand, we might parallelize (summarize multiple files concurrently if needed and the LLM API allows). We also might consider summarizing only the top N relevant files at query time, not all at once. That keeps latency bounded.

Security & Privacy: Since code might be proprietary, if using external LLM APIs we have to ensure that’s allowed. If not, we’d stick to local models.

In conclusion, the implementation will involve building a summarization module (src/summarization/) that ties together AST parsing and LLM prompting. We will start with TypeScript support, use ts-morph for robust extraction, and OpenAI GPT (gpt-3.5 or GPT-4 via API) for initial development as it’s quick to get results. Later, we can explore using local models to reduce costs. This module will significantly improve Arela’s ability to handle large codebases by feeding the Q&A system distilled knowledge instead of raw code.

⸻

Success Criteria

To ensure this research and subsequent implementation are successful, we will use the following criteria:
	1.	Effective Compression: We achieve the desired token reduction (5-10×) on large files. For example, a 1000-token code file yields a ~100-200 token summary that still makes sense. We will measure and report these ratios.
	2.	Semantic Fidelity: The summaries maintain 90%+ of the relevant information. In practical terms, for a set of benchmark questions about each piece of code, the answers derived from the summary match those from the original code. We might use human judgment or LLM QA as discussed in Validation to estimate this. The presence of any serious misrepresentation in a summary would be a red flag.
	3.	Consistency: All summaries follow a coherent style and format, making it easy for users (and our system) to consume. Headings, bullet lists, or prose should be used consistently as decided.
	4.	Automated Quality Metrics: If possible, our summaries score well on code summarization metrics (e.g., if a reference exists, maybe ROUGE-L or METEOR in the same ballpark as human-written summaries in literature). More practically, an LLM evaluator should ideally rate our summaries as accurate.
	5.	Performance and Scalability: Summarization can be done within acceptable time and integrated without major slowdowns. If we precompute, the one-time cost is fine as long as it’s not hours. If on-demand, it should not noticeably delay answers.
	6.	Utility in Meta-RAG: The ultimate test is whether Arela can ingest more code into context via these summaries and thus answer higher-level questions that it couldn’t before (due to context length limits). For instance, if previously we couldn’t ask “Explain how memory is managed in Arela” because it spanned multiple large files, now we can, with the summaries of those files fitting in the prompt.

By meeting these criteria, we’ll know the summarization approach is working and worth expanding.

Example Test Cases

We will test the summarization pipeline on real files from the Arela codebase to validate performance and quality:
	1.	Small Utility (src/utils/update-checker.ts, ~140 lines):
	•	Original tokens: (to be counted, say ~500 tokens).
	•	Expected summary tokens: maybe ~50-80 tokens (a few sentences).
	•	We expect a one-liner about checking for updates. E.g., “Checks if a new version of Arela is available by querying the NPM registry, and informs the user if an update exists.”
	•	Questions to answer: “What does update-checker do?” (should be obvious from summary). “Does it notify the user or just check silently?” (summary should mention notification if present in code).
	•	This will test that even a small file’s summary doesn’t omit critical details (like the side effect of notifying).
	2.	Medium Component (src/meta-rag/classifier.ts, ~200 lines):
	•	Possibly a piece that classifies input (guessing by name).
	•	Summary might be 100-150 tokens. Perhaps structured: it might have multiple functions or a class.
	•	Check: Does the summary list the classification criteria or just generalize? We’d verify it captures the purpose (maybe “classifies queries to route them to different agents”) and mentions key methods.
	•	Question: “How does the classifier determine which route to take?” – we see if the summary hints at that (if code uses keywords or ML model, etc., the summary should mention the approach).
	3.	Large Module (src/memory/hexi-memory.ts, ~300 lines):
	•	Likely a more complex file dealing with memory management. 300 lines could be ~1000 tokens.
	•	We’d target a summary ~150 tokens with bullet points for key functions (if multiple) or paragraphs if one cohesive class.
	•	Focus: Ensure the summary mentions how memory is stored or retrieved (since that’s presumably the core). If it interacts with a database or filesystem, that must appear.
	•	Questions: e.g., “What data structure is used to store memory?” or “Does it persist data to disk or keep in-memory only?” – The summary should ideally include such info if apparent (like if it uses an array vs a file).
	4.	Complex Integration (src/context-router.ts, ~164 lines):
	•	Possibly coordinates context between modules, with multiple concerns.
	•	Summary maybe ~100 tokens.
	•	We’ll see if a structured output (“Purpose/Functions/…”) helps here to not miss things.
	•	Question: “What is the role of context-router in the system?” – expecting something like “It routes conversation context to appropriate handlers or subsystems”.
	•	Also, “What are its main functions?” – summary could list them.

For each of these, we will record:
	•	Original vs Summary Token Count: using a consistent tokenizer (likely tiktoken for GPT-4). Compute compression ratio.
	•	Information Retention Test: We can attempt to answer a few questions about each file using only the summary. Perhaps have an independent person (or another LLM instance) read the summary and ask them questions that normally require reading the code. If they answer correctly, the summary did its job.

We will tabulate the results in the research report or separate benchmarks document:
e.g.,

File	Code Tokens	Summary Tokens	Compression	Key Info Missing?
update-checker.ts	480	60	8×	No (summary ok)
classifier.ts	800	120	6.7×	Missing minor detail X?
… etc.				

These test cases will guide adjustments to our approach (perhaps our prompt or extraction rules) if we find the summary missed something important. They also serve as a proof-of-concept to stakeholders that this approach works on real code.

Conclusion and Next Steps

We have explored the landscape of code summarization and outlined a tailored approach for Arela. By leveraging AST-based extraction and modern LLM prompting techniques, we can drastically reduce token usage while preserving the meaning and utility of code in context. Summarization will enable Arela’s Meta-RAG system to include more of the codebase knowledge when answering questions, without running into context length limits.

Next Steps After Research:
	1.	Review and Refinement: Discuss this plan with the team, especially the decisions on prompt format and summarization thresholds. Incorporate any feedback (e.g., if a certain piece of information is crucial to always include in summaries that we didn’t consider).
	2.	Prototype Implementation: Start coding the summarization module (src/summarization/). Begin with one language (TS) and one simple prompt style, get it working end-to-end.
	3.	Prompt Tuning: Try the different prompt variants on the example files and possibly a couple more. Evaluate outputs qualitatively and choose one (or finalize a hybrid) that works best.
	4.	Benchmarking: Run the token counts and info retention tests as planned. Ensure we meet the compression and quality targets. If not, iterate (maybe the summary needs to be a bit longer or the prompt needs tweaking).
	5.	Integration into Pipeline: Modify the Meta-RAG retrieval/combination logic to use summaries. Possibly adjust the retrieval scoring if needed (e.g., if using embeddings of summaries vs code).
	6.	Documentation: Document how the summarization works, so others can maintain it. Include the prompt templates in our prompt library, and instructions on updating them.
	7.	Future Enhancements: Plan for multi-language support and more advanced features (like interactive summarization on user demand, or the ability to expand a summary into full code if needed). Also, keep an eye on improvements in LLMs (Claude 3, GPT-4 32k context, etc., which might reduce the need for summarization if context limits grow, but summarization will likely always help reduce cost).

By following this plan, Arela will gain a robust capability to “read” and convey large code sections succinctly, empowering both our AI and human users to navigate the codebase more effectively. This research-backed approach should significantly enhance Arela’s performance in code-heavy Q&A scenarios, marking a step forward in intelligent code understanding.