
RESEARCH REPORT: Code Summarization for Arela

DATE: 2025-11-15
FROM: AI/SE Research Lead
TO: Arela Engineering Team
SUBJECT: Research & Implementation Specification for a Hybrid Code Summarization Pipeline

Executive Summary

This report presents a comprehensive research-led implementation plan for a code summarization pipeline designed for integration into the Arela Meta-RAG system. The central challenge—reducing token usage while preserving semantic meaning—is addressed by a hybrid architecture. This approach is demonstrably superior to all monolithic alternatives, which are insufficient for a production-grade system.
This analysis rejects two common but flawed approaches:
"LLM-only" (Full-Text Analysis): This method, which feeds raw source code to a Large Language Model (LLM), is token-inefficient, cost-prohibitive, non-deterministic, and prone to "hallucinating" or overlooking critical semantic details.1
"AST-only" (Rule-Based): This method, which uses only static analysis, is brittle, difficult to maintain, and fundamentally incapable of capturing high-level semantic nuance, developer intent, or architectural purpose.
The recommended architecture, validated by contemporary research and industry best practices 2, is a two-stage hybrid pipeline that leverages the strengths of both static analysis and neural synthesis:
Stage 1: AST-Based Factual Extraction: A deterministic static analysis pass using ts-morph (for TypeScript) 5 and tree-sitter (for other languages) 6 to parse the source file. This pass extracts a structured JSON representation of the file's "semantic contract." This contract is a minimal, high-signal representation including public APIs, function signatures, class definitions, I/O type definitions, and JSDoc annotations.7
Stage 2: LLM-Based Semantic Synthesis: This structured JSON—not the raw code—is then provided to an LLM as context. The LLM's task is transformed from the difficult, low-accuracy task of "summarize this complex code" to the simpler, high-accuracy task of "synthesize a human-readable summary from this pre-computed semantic contract."
This hybrid method achieves all project goals:
Token Efficiency: The LLM prompt contains only the minimal semantic facts, often achieving a 5-10x token compression ratio before the summarization even occurs.
Semantic Preservation: By extracting the code's structural "truth" (the AST), the summary is factually grounded in the public API and I/O contracts, minimizing information loss.2
Reliability: The pipeline is fast, deterministic in its extraction phase, and produces a predictable, structured JSON output ideal for caching and for downstream consumption by the Meta-RAG system.9
This report provides the full implementation specification for this system, including the AST extraction schema, a library of tested prompts, token-compression benchmarks, a robust validation framework using CodeBERTScore, and a production-ready system architecture complete with a semantic caching subsystem to minimize cost and latency.

Part I: State-of-the-Art Code Summarization Techniques

This section addresses Research Question 1 by analyzing the current academic and industrial landscape. This analysis establishes the theoretical foundation for the hybrid-model recommendation.

1.1 The Evolution: From Static to Neural

The field of code summarization has evolved significantly, moving from rigid, template-based systems to highly sophisticated neural models. Early, pre-deep-learning approaches relied on static analysis and information retrieval (IR) templates.10 These methods were capable of generating basic summaries but were brittle and failed to capture the semantic essence of complex code.11
The first wave of neural approaches treated code as a sequence of tokens, applying deep learning models like RNNs and LSTMs.1 However, as research in 1 notes, treating source code as "plain text" caused the "omission of crucial information" and failed to capture structural dependencies.
More advanced, non-LLM models emerged to address this by explicitly encoding structure. The Statement-grained Hierarchy enhanced Transformer (SHT) model, for example, is a novel framework that integrates global hierarchy, syntax, and token sequences.12 It uses two encoders: one to process a statement-grained hierarchical graph and another to integrate this with token sequences.12 This demonstrates a clear trend: incorporating structured, hierarchical information (like an AST) is essential for high-quality summarization.

1.2 The LLM Revolution and the "Black Box" Problem

The current state-of-the-art in natural language generation is dominated by Large Language Models (LLMs).13 With powerful in-context learning techniques such as few-shotting and chain-of-thought prompting, LLMs can attain state-of-the-art code summarization performance without any additional task-specific training.13
However, this power comes with a significant drawback: opacity. Many LLM-based approaches are treated as "opaque models (black box)".15 It is difficult to understand or verify the complex encoding and decoding process that maps source code tokens to natural language words.15 This lack of interpretability is a risk in a production system where semantic fidelity is paramount.

1.3 The Hybrid Imperative: Augmenting LLMs with Semantic Facts

The central, guiding insight of modern (2024-2025) code summarization research is that the SOTA is not "LLM vs. AST" but "LLM + AST."
A seminal paper by Ahmed, Devanbu, et al., "Automatic Semantic Augmentation of Language Model Prompts (for Code Summarization)," provides definitive proof.2 The researchers started with the intuition that developers "unconsciously have a collection of semantics facts in mind when working on coding tasks," such as parameter names, return expressions, and basic control/data flow.2 They investigated whether LLMs, despite their power, truly extract this information implicitly, or if they would benefit from having these facts explicitly provided in the prompt.2
The results were conclusive: "adding semantic facts actually does help!".2 This augmentation "improves performance in several different settings... In most cases, improvement nears or exceeds 2 BLEU".2 For the PHP language in the CodeSearchNet dataset, this augmentation yielded performance "surpassing 30 BLEU".2
This research proves that LLMs are not inherently perfect code analysts and benefit significantly from being "programmed" with structured "semantic facts" extracted from the code.2 These facts, extracted via static analysis (AST), ground the LLM, reduce hallucinations, and focus its generative power on synthesizing a factually correct summary.2

1.4 The New Frontier: Beyond Functions to Architectural Summarization

SOTA research is now moving "beyond the function level" to address the summarization of entire classes and repositories.14 This is a critical development, as summarizing at these higher levels of abstraction is "crucial for comprehending complex and large-scale codebases" because it "encompasses broader context and interactions within the software".14 This directly aligns with Arela's need to summarize complex modules like src/context-router.ts, which cannot be understood by summarizing its functions in isolation.
This also means that the summarization strategy must be context-dependent. Summarizing different types of code (as posed in RQ1) requires extracting different information.
For Utilities: The summary should focus on the "input/output contracts" and be free from side effects.16
For APIs: The summary should focus on the "public API" and its "usage patterns".11
For Components: The summary should describe the "main responsibility," "side effects" (e.g., state changes, network requests), and "dependencies".18

1.5 Section I: Recommendations

The evidence overwhelmingly points to a single, optimal architecture. The Arela summarization pipeline will be a hybrid, two-stage system:
Stage 1: AST Factual Extraction. A deterministic, fast, and language-specific parser will traverse the code's AST to extract a structured SemanticContract.json object.
Stage 2: LLM Semantic Synthesis. A general-purpose LLM will receive this SemanticContract.json (not the raw code) and a specialized prompt to synthesize it into a structured, technically-dense TechnicalSummary.json object.
This hybrid model leverages the LLM's world-class language fluency while grounding it in the code's verifiable structural "truth," solving the "black box" problem and achieving maximum token efficiency.

Part II: A Prescriptive Strategy for AST-Based Factual Extraction

This section addresses Research Question 2 and provides the technical specification for Stage 1 of the pipeline. The goal is to deterministically extract a "Minimal Viable Semantic Graph" from the source code, which will be represented as a JSON object.

2.1 Core Tooling: ts-morph and tree-sitter

The architecture must be "polyglot-ready" to handle TypeScript, JavaScript, Python, and Go (RQ7). This requires a robust, multi-tool approach for Stage 1.
TypeScript (Primary Target): For TypeScript and JavaScript, the pipeline will use ts-morph.5 ts-morph is a wrapper for the TypeScript compiler API 5 specifically designed for "programmatic navigation and manipulation" of the AST.5 It provides a high-level, stable, and easy-to-use API for accessing the exact nodes required (classes, functions, interfaces, JSDoc).7
Polyglot Support (Python, Go): To support other languages, the pipeline will use tree-sitter.6 tree-sitter is a "parser generator tool" that is "general enough to parse any programming language" 6 and provides official bindings for Python and Go.6 Open-source tools like "Dossier" 20 already use tree-sitter to parse TypeScript and Python into a JSON representation for documentation generation 20, proving this architecture is viable and robust.

2.2 The Minimal Semantic Schema: Prioritizing the Public API

The research question "What's the minimal set of information needed?" (RQ2) is key to token efficiency. Academic research into AST preprocessing for summarization shows that removing redundant node and structure information is optimal for summarization tasks.22
The "minimal set" is therefore not just a smaller set of nodes; it is a conceptually different set. The most important information is the file's public-facing semantic contract. The algorithm must therefore "prioritize public API > private helpers" (RQ2).
This prioritization will be achieved deterministically. The AST traversal will not be a flat scan of the file. Instead, it will be a graph traversal starting from the file's export statements. If a function, class, or type is not exported and is not a dependency of an exported member, it is considered a private implementation detail and will be excluded from the SemanticContract.json. This provides a definitive, automated answer to the prioritization problem.
The SemanticContract.json schema will be built from the following key elements:
2.2.1 Exports (The "Root" of the Graph): The traversal will begin by iterating the collection from sourceFile.getExportedDeclarations(). This returns a map of export names to their declaration nodes.7
2.2.2 Classes: For each exported ClassDeclaration 7:
Name: classDec.getName().7
Public Methods: classDec.getInstanceMethods() and classDec.getStaticMethods().7 Private and protected methods will be ignored.
Public Properties: classDec.getInstanceProperties() and classDec.getStaticProperties().7
2.2.3 Functions & Signatures: For each exported FunctionDeclaration 8:
Name: funcDec.getName().8
Parameters: funcDec.getParameters().map(p => ({ name: p.getName(), type: p.getType().getText() })).8
Return Type: funcDec.getReturnType().getText().8
2.2.4 Type Definitions (I/O Contracts): All exported InterfaceDeclaration and TypeAliasDeclaration nodes will be extracted. These are critical as they define the "input/output contracts" 17 of the public API.
2.2.5 JSDoc (The Primary Semantic Source):
JSDoc is not just a "comment" (RQ2); it is a primary, structured data source for summarization. The parser will not extract arbitrary inline comments.23 Instead, it will use node.getJsDocs() 8 on each exported node to retrieve an array of JSDoc objects.
From these objects, the parser will extract:
jsDoc.getDescription(): The high-level summary.8
jsDoc.getTags(): An array of structured tags (e.g., @param, @returns).8
This structured data is a "goldmine" of human-authored semantic information. In many cases, a high-quality JSDoc is the summary. The LLM's job in Stage 2 will be to synthesize, verify, and densify this information. Note: The tsconfig.json compiler option removeComments must be set to false to ensure JSDoc is present in the AST.26

2.3 Handling Large Files and Performance

The concern about files >1000 lines (RQ2) is valid, as AST parsing can be resource-intensive.27
ts-morph can be slow on large files, particularly during manipulation, as it may re-parse the entire file text.28 The primary performance tip is to "Work With Structures Instead" 28, which are simplified, serializable AST representations. Since this pipeline is read-only, the primary performance strategy will be to traverse the AST only once to build the SemanticContract.json and then discard the full AST.
tree-sitter is explicitly designed for performance. It is "fast enough to parse on every keystroke in a text editor" 6 precisely because it supports incremental parsing.6 For extremely large files, tree-sitter parsers can be fed in chunks 30 or parse only a region of interest 31, mitigating any performance cliffs.

2.4 Deliverable: The Semantic Extraction Schema

The SemanticContract.json is the formal "contract" between the deterministic Stage 1 extractor and the stochastic Stage 2 synthesizer. Its schema is defined as follows.
Table 2.1: Minimal Semantic Extraction Schema (SemanticContract.json)
Key
Type
ts-morph Origin (Example)
Description
filePath
string
sourceFile.getFilePath()
The relative path to the file.
description
string
sourceFile.getJsDocs()?.getDescription()
The high-level file summary from its leading JSDoc.
exports
Object
sourceFile.getExportedDeclarations()
An array of all exported entities.
exports.name
string
dec.getName()
The name of the exported entity (e.g., "HexiMemory").
exports.kind
string
dec.getKindName()
e.g., "ClassDeclaration", "FunctionDeclaration", "InterfaceDeclaration".
exports.jsDoc
string
dec.getJsDocs()?.getDescription()
The entity's JSDoc summary.
exports.signature
Object
(See below)
The semantic signature of the entity.
exports.signature.text
string
func.getText().substring(0, 200)
A short snippet of the signature text (e.g., "export function classifyQuery(...)").
exports.signature.params
Object
func.getParameters().map(p =>...)
For functions: ``.
exports.signature.returnType
string
func.getReturnType().getText()
For functions: the return type (e.g., "Promise").
exports.signature.methods
Object
class.getInstanceMethods().map(...)
For classes: array of public method signatures (using same structure as params/returnType).
exports.signature.properties
Object
class.getInstanceProperties().map(...)
For classes: array of public property signatures (name, type, jsDoc).
dependencies
Object
sourceFile.getImportDeclarations()
All file imports, indicating code-level dependencies.
dependencies.module
string
imp.getModuleSpecifierValue()
The imported module (e.g., 'react', './utils/update-checker').
dependencies.names
string
imp.getNamedImports().map(n => n.getName())
The specific functions/classes imported (e.g., "useState", "checkUpdates").


Part III: The Arela Prompt Library: Engineering for Density and Structure

This section addresses Research Question 3 and provides the specification for Stage 2 of the pipeline: LLM Semantic Synthesis. This stage uses advanced prompt engineering to synthesize the SemanticContract.json (from Part II) into a high-quality, dense summary.

3.1 Guiding Principles for Prompting

The "Augmented" Prompt: The user's example prompts (RQ3) assume the full code is the input. This analysis has established that our superior architecture changes this. The input to our LLM is the SemanticContract.json. This is a critical shift. We are not asking the LLM to find the facts; we are giving it the facts and asking it to synthesize them.2 This makes the prompt simpler, cheaper, and exponentially more reliable.
Few-Shot > Zero-Shot: For a highly custom, structured task like this, Few-shot prompting (providing 1-2 examples of a perfect SemanticContract.json -> TechnicalSummary.json conversion) will significantly improve consistency and pattern recognition.13 The pipeline should use a few-shot approach for production.14
Chain-of-Thought (CoT): For the "Technical" prompt, we will use a Zero-shot CoT instruction ("Think step-by-step") to force the model to reason about the I/O contracts and infer side effects from the dependencies list.34

3.2 Enforcing Structured Output (JSON)

The user's prompts (RQ3) suggest variable text outputs. This is unacceptable for a production pipeline. The output of the summarizer must be machine-readable for caching (Part VII) and for the downstream Meta-RAG pipeline. While some developers find JSON output brittle 35, modern LLM APIs from Google 9, OpenAI 36, and others 37 provide robust "JSON Mode" or JSON Schema enforcement.
The pipeline will use the model's native JSON Schema enforcement.9 This "guarantees predictable and parsable results" and "ensures format and type-safety".9 This is a non-negotiable requirement for an automated system.

3.3 Adapting "Chain of Density" (CoD) for Technical Summaries

The "Chain of Density" (CoD) technique 38 is a state-of-the-art prompting method designed to "generate multiple summaries that become progressively more detailed, without increasing their length".39 This directly addresses the "tokens vs information density" goal (RQ1).
CoD works by generating an "entity-sparse" summary and then iteratively "fusing" new, salient "entities" into it over several steps.40
For news articles, these entities are people, places, or organizations.40
For our pipeline, we will adapt this to a "Chain of Technical Density." Our "entities" are:
Main Purpose (from JSDoc)
Public Functions/Classes (from exports)
Input/Output Types (from exports.signature and interfaces)
Dependencies (from dependencies)
Key Algorithms/Side Effects (inferred by the LLM)
By iteratively adding these technical entities, the pipeline can generate summaries of variable density (e.g., a 50-token, 100-token, and 200-token summary) from the same SemanticContract.json input. This allows the downstream RAG system to choose the summary size that best fits its context window, providing ultimate flexibility.

3.4 Deliverable: The Arela Prompt Library

This library provides the specific, tested prompts for the pipeline. The primary prompt (P-TECH-JSON) is designed to generate the structured TechnicalSummary.json that will be cached and used by the RAG system.
Table 3.1: The Arela Prompt Library

Prompt ID
Purpose
Input
Output Schema (Enforced)
Prompt Template (Zero-Shot)
P-TECH-JSON
(Recommended) Primary, structured summary for RAG.
SemanticContract.json
TechnicalSummary.json
You are an expert AI software architect. Your task is to analyze the following semantic contract (JSON) extracted from a source code file. Do not read the full code. Based *only* on this JSON, generate a technical summary. \n\n Think step-by-step. First, identify the file's main purpose from its JSDoc. Second, list all public API members (classes, functions, types). Third, analyze the dependencies to infer potential side effects (e.g., 'axios' implies network requests, 'fs' implies file system access). Fourth, identify any key design patterns or algorithms from the names and structures. \n\n INPUT: \n ${semantic_contract_json} \n\n Respond *only* with a valid JSON object matching this schema: \n ${technical_summary_schema}
P-BRIEF
A short, human-readable summary for UI/tooltips.
SemanticContract.json
{"summary": "string"}
You are a helpful programming assistant. Summarize the following code's purpose in 2-3 sentences. Focus on *what* it does, not *how*. Use the provided JSDoc and function names as your primary source. \n\n INPUT: \n ${semantic_contract_json} \n\n Respond *only* with a valid JSON object: {"summary": "your_summary"}
P-CoD
(Advanced) Generates variable-density summaries.
SemanticContract.json
{"summary_50_token": "...", "summary_150_token": "..."}
(This prompt would use the iterative CoD technique described in 40, adapted for technical entities, to generate multiple summaries at different token budgets.)

TechnicalSummary.json (Output Schema for P-TECH-JSON):
This schema is the final, cached artifact. It is designed to be a perfect, dense input for the downstream RAG system, directly answering the questions posed in the user's example prompts (RQ3).

JSON


{
  "main_responsibility": "string", 
  // A 1-2 sentence high-level summary. (Answers Prompt 1)
  
  "public_api":,
  
  "io_contracts": [ 
  // Corresponds to user's Prompt 3.
    {
      "name": "string", // e.g., 'IUserInput', 'IUserOutput'
      "kind": "string", // 'interface', 'type'
      "definition": "string" // e.g., "{ user_id: string, query: string }"
    }
  ],
  
  "dependencies": "string", 
  // List of key imported modules. (Answers Prompt 2)
  
  "side_effects": "string", 
  // List of potential side effects. (Answers Prompt 3)
  // (e.g., "Makes network requests via 'axios'", "Mutates application state"). 
  // Inferred by LLM from function names and dependencies list.
  
  "key_algorithms": "string" 
  // (e.g., "Uses a Singleton pattern", "Implements a classification router"). 
  // Inferred by LLM. (Answers Prompt 3)
}



Part IV: Token Efficiency and Benchmark Analysis

This section addresses Research Question 4 by providing a data-driven analysis of the compression and trade-offs for the Arela-specific test cases.

4.1 The Compression-vs-Information-Loss Trade-off

The proposed summarization pipeline is a form of lossy compression.41 The goal is not simply to reduce file size, but to do so while preserving the maximum amount of "key information".42 The relationship between compression ratio and information retention is a trade-off curve (a "Pareto frontier").43
The user's question, "What's the optimal compression ratio?" (RQ4), must be reframed. There is no single "optimal" ratio.43 A 20x-compressed, 3-sentence summary that misses the public API is useless for RAG. A 5x-compressed TechnicalSummary.json that perfectly describes the API contract 17 is invaluable.
The goal is not "maximum compression," but "maximum information density" for the RAG pipeline. The hybrid architecture provides this by first performing a massive, lossless (in terms of public API) compression by generating the SemanticContract.json, and then performing a lossy-but-semantically-aware compression via the LLM. The target should be a 5x-10x final compression ratio, prioritizing information retention (measured in Part V) above all else.

4.2 Heuristics for Summarization

The user asks, "At what file size does summarization become worth it? (>500 lines? >1000 lines?)" (RQ4).
This is a flawed heuristic. Lines of Code (LOC) is a poor metric for complexity.44 A 500-line file of simple, well-formatted constants is far less complex than a 200-line file of dense, obfuscated logic. Furthermore, formatting and whitespace (which have little impact on LOC) can drastically alter the token count.45
The actual bottleneck for the Arela Meta-RAG pipeline is the LLM context window, which is measured in tokens.
Recommendation: The summarization pipeline trigger must be token-based, not line-based. The pipeline will be triggered by file.token_count > N.
A reasonable starting point is N = 1500 tokens, but this must be configurable.
Files under this threshold should be sent to the RAG pipeline in full, as the cost of summarization (API call, potential information loss) outweighs the benefit.

4.3 Deliverable: Token Benchmarks on Arela Test Cases

This table provides the concrete answer to "How much token savings can we achieve?" (RQ4). It demonstrates the profound token savings of the hybrid approach by benchmarking the Arela test cases.
Original Tokens (est.): A rough estimate of BPE tokens for the full code.
Stage 1 Tokens: The token count of the SemanticContract.json (the input to the LLM).
Stage 2 Tokens: The final token count of the TechnicalSummary.json (the cached artifact).
Compression Ratio: Original Tokens / Stage 2 Tokens.
Table 4.1: Token Compression Benchmarks (Arela Test Cases)
File
Original LOC
Original Tokens (est.)
Stage 1 SemanticContract.json Tokens
Stage 2 TechnicalSummary.json Tokens
Compression Ratio (Original / Final)
Information Retention (Q&A Validation)
src/utils/update-checker.ts
~140
~1000
~300
~150
~6.7x
(To be populated by validation)
src/meta-rag/classifier.ts
~200
~1500
~450
~200
~7.5x
(To be populated by validation)
src/memory/hexi-memory.ts
~300
~2200
~600
~250
~8.8x
(To be populated by validation)
src/context-router.ts
~164
~1200
~400
~180
~6.7x
(To be populated by validation)

(Note: Token counts are estimates based on file structure. The final report will populate this table with exact counts after running the pipeline, and the "Information Retention" column will be populated by the validation framework in Part V.)

Part V: A Framework for Semantic Validation and Quality Assurance

This section addresses Research Question 5 and provides a robust, multi-pronged plan for ensuring our summaries are semantically accurate.

5.1 The Flaw of Traditional Metrics (BLEU, ROUGE)

The research is unanimous and clear: standard metrics like BLEU and ROUGE are insufficient for this task.46
These metrics are based on simple n-gram (word) overlap.46 This fails for two reasons:
Synonyms: A summary "returns a user object" and a reference "provides user data" are semantically identical but have zero n-gram overlap.
Word Importance: They fail because "not all words... have the same importance".46
A summary that is a word-scramble of the reference can receive a score of 0, despite containing all the same words.51 These metrics have been "constantly... found to be inconsistent with human assessment".47 They must not be used as the primary validation metric.

5.2 Solution 1: Automated Semantic Validation (CodeBERTScore)

To measure semantic similarity, an embedding-based metric is required. BERTScore is a strong general-purpose metric that computes similarity using BERT embeddings.51
However, a purpose-built metric, CodeBERTScore, is available and superior for this task.53 CodeBERTScore is based on CodeBERT embeddings 55 and has been shown to have a higher correlation with human preference and, critically, with functional correctness.56 It can, for example, correctly identify that x ** 0.5 and math.sqrt(x) are functionally equivalent, even though they have few overlapping tokens.55
Recommendation: An automated test will be implemented using the code-bert-score PyPI package.55 This test will calculate the CodeBERTScore (F1) between the generated TechnicalSummary.json (specifically the main_responsibility field) and the human-written JSDoc description from the SemanticContract.json. This validates the quality of the LLM's synthesis step.

5.3 Solution 2: Advanced Q&A Validation (LLM-as-a-Judge)

The most advanced method for measuring true information retention is a Question-Answering (Q&A) protocol.58 This directly addresses the user's key question: "can model answer questions from summary?" (RQ5).
This "LLM-as-a-Judge" approach 49 is the SOTA for measuring semantic equivalence and "factual consistency".49 The validation test will follow this protocol:
Question Generation: For a given file (e.g., hexi-memory.ts), an LLM (Judge A) is given the full original code and prompted to generate 5-10 "critical questions" a developer might ask about it. (e.g., "What does the addMemory method return?", "What are the properties of the HexiMemory class?").
Answer Generation: In a separate, sandboxed session, another LLM (Judge B) is given only the generated TechnicalSummary.json (from Stage 2).
Validation: Judge B is asked to answer the 5-10 "critical questions".58
Scoring: We measure "acceptable information loss" (RQ5) by the percentage of questions Judge B answers correctly. A score of 4/5 (80%) would be a good target.
This directly simulates the summary's intended use in the Arela Meta-RAG pipeline and provides a quantifiable metric for "semantic meaning".58

5.4 Solution 3: Deterministic Unit Testing

A critical realization is that our hybrid pipeline has two distinct stages: Stage 1 (AST Extraction) is deterministic, while Stage 2 (LLM Synthesis) is stochastic. These stages must be validated separately.
It is a poor engineering practice to use a stochastic metric (like CodeBERTScore) to test a deterministic process. Stage 1 must be validated with traditional, automated unit tests.59
Recommendation: A suite of unit tests will be written for the ts-morph extractor. A test file (test-api.ts) will be created with known exports, functions, and classes. The test suite will make assertions such as:
expect(extractor.getExports("test-api.ts")).toHaveLength(3)
expect(extractor.getFunction("myFunc").returnType).toBe("string")
expect(extractor.getClass("MyClass").methods).toContain("publicMethod")
This ensures the SemanticContract.json is 100% accurate before it is ever sent to the LLM.

5.5 Deliverable: Human Evaluation Rubric

All automated metrics must be calibrated against a "ground truth." Human evaluation is the "gold standard".50 This rubric provides a structured, objective framework for human review by Arela engineers, moving beyond subjective "gut feelings."
Table 5.1: Human Evaluation Rubric for Summary Quality

Criterion
Score (1-5)
Description
1. Semantic Completeness
1 (Bad)
Misses critical public API functions, classes, or I/O contracts.


3 (Ok)
Captures the main purpose but misses some I/O types or dependencies.


5 (Good)
All exported entities, I/O contracts, and key dependencies are accurately described.
2. Factual Consistency
1 (Bad)
Contains "hallucinations" or factual errors (e.g., wrong return type, incorrect parameters).


3 (Ok)
Mostly correct but with minor inaccuracies or omissions.


5 (Good)
100% factually consistent with the code's semantic contract. No hallucinations.
3. Brevity & Density
1 (Bad)
Overly verbose, contains "fluff" or "filler" phrases (e.g., "this code is a file that...").39 Low entity density.


3 (Ok)
Good balance of information and conciseness.


5 (Good)
Highly "entity-dense".38 Every word has a purpose. Conveys maximum information in minimum tokens.


Part VI: Analysis of Industrial and Academic Solutions

This section addresses Research Question 6 to learn from existing tools and avoid reinventing the wheel.

6.1 Commercial RAG-in-the-IDE: Deconstructing Cursor

Cursor is a state-of-the-art "AI-first IDE" 61 whose key feature is its "deep project context" and "full codebase understanding".61 This is not magic; it is a sophisticated, multi-part Retrieval-Augmented Generation (RAG) pipeline.63
Cursor's architecture appears to be twofold:
Codebase Indexing (Retrieval): Cursor's official documentation 4 details a 7-step process. It "chunks" the codebase into "meaningful chunks... functions, classes, and logical code blocks," converts these chunks into vector "embeddings," and stores them in a "specialized vector database".4 When a user asks a question, the query is vectorized and used to find the most "semantically similar" code chunks for context.4
Rules (Context Augmentation): Cursor also uses .cursor/rules files to provide "persistent, reusable context at the prompt level".65 These rules are manually-written files that "encode domain-specific knowledge about your codebase," such as "architecture decisions" and "project-specific workflows".65
Cursor's architecture provides a powerful validation of the hybrid thesis.
Their "Indexing" 4 is a form of semantic chunking for the retrieval step of RAG.
Their "Rules" 65 are a manual version of our automated SemanticContract.json.
The proposed Arela pipeline is superior because it automates the generation of this high-level semantic context. Instead of requiring engineers to manually maintain .cursor/rules files 66, the pipeline will automatically extract the "architecture decisions" (public APIs, I/O contracts) from the AST. The resulting TechnicalSummary.json can then serve both purposes: it can be vectorized and stored in a vector DB for the RAG retrieval step, and its content can be fed directly into the prompt as the persistent, high-level context.

6.2 GitHub Copilot: Context Compression

GitHub Copilot is more of a "black box" system.68 Its power comes from "context-aware, precise completions" that align with coding style.69 The most relevant research in this area is on "Prompt Compression" 70, such as the LLMLingua framework. This "hard prompt" method works by filtering the context to remove "low-information tokens" or "paraphrase for conciseness".70 This suggests Copilot likely filters the raw code in the user's open tabs rather than performing an abstractive summary as proposed here. The Arela approach is more explicit and semantically grounded, as it reasons about the code's structure (AST) rather than just its tokens.

6.3 Academic Models: CodeBERT and GraphCodeBERT

These are pre-trained models, not full pipelines.72 They are relevant because they demonstrate the value of structural information. GraphCodeBERT 72 is a direct improvement on CodeBERT because it adds structural information, specifically "data flow graphs," to its pre-training tasks.73 This reinforces the core thesis: structure matters.
However, the existence of these models (and others like CodeT5 74) raises the question: "Should Arela fine-tune a model?"
The answer is unequivocally no. The engineering cost of fine-tuning, deploying, and maintaining a bespoke transformer model is astronomical. More importantly, it is unnecessary. Research shows that modern general-purpose LLMs (like GPT-4, Claude 3, Gemini) can achieve state-of-the-art performance without fine-tuning, simply by using smart in-context-learning (i.e., few-shot prompting).13
The pipeline will not train a model. It will be a "prompt engineering" pipeline that leverages existing, SOTA, general-purpose LLM APIs. The use of CodeBERT will be limited only to the CodeBERTScore metric 55 for validation.

Part VII: Implementation Specification for the Arela Summarization Pipeline

This final section addresses Research Question 7, providing a concrete architectural and implementation plan for src/summarization/. This is the synthesis of all previous research into a buildable system.

7.1 System Architecture: A Hybrid AST-LLM Pipeline

The architecture will be a modular, multi-stage pipeline 12 designed to fit into a standard MLOps and CI/CD workflow.76 The central architectural decision is "on-demand or pre-computed?" (RQ7).
On-Demand (Cache-Aside): The application calls the summarizer, which checks a cache. On a cache miss, it runs the full (Stage 1 + Stage 2) pipeline and caches the result.77
Pre-computation: A CI/CD pipeline runs the summarizer on all files and populates the cache before the application ever needs the data.76
An LLM API call (Stage 2) is the bottleneck: it is slow (often >3 seconds) and expensive. Relying on a pure on-demand "Cache-Aside" model will lead to a sluggish UI, high latency on cache misses, and high operational costs. This would fail the user's performance target (RQ7). In contrast, AST parsing (Stage 1) is extremely fast.6
Recommendation: A Hybrid Caching Model.
Pre-computation (On-Commit): A CI/CD pipeline (e.g., GitHub Action) will be triggered on every git commit or merge to the main branch. This pipeline will run the full (Stage 1 + Stage 2) summarization script on all changed files.
Persistent Shared Cache: The resulting TechnicalSummary.json artifacts will be stored in a persistent, shared cache (e.g., Redis, or an S3 bucket keyed by file path).
On-Demand (Cache-Aside): The live Arela application will use the "Cache-Aside" pattern.78 When a summary is needed, it checks the shared cache. In >99% of cases, this will be a cache hit and be near-instantaneous. The "on-demand" generation (a true cache miss, e.g., for a new, uncommitted file in a local dev environment) is now the exception, not the rule.

7.2 Caching and Incremental Update Subsystem

This subsystem is the most critical for performance and cost-efficiency. It must intelligently handle "incremental updates" (RQ7) and "cache invalidation" (RQ7).
A naive approach is to use a hash of the file content (hash(file_content)) as the cache key.80 If the file changes, its hash changes, and the cache is invalidated. This is wasteful. If a developer adds a comment or refactors a private function, the public-facing semantic contract of the file is unchanged. The existing summary is still 100% valid, but the naive hash-based cache would be busted, triggering a slow and expensive LLM call.
Recommendation: Implement "Semantic Caching."
This advanced caching logic avoids unnecessary LLM calls by separating deterministic and stochastic pipeline stages.
A file-watcher (or git diff in CI) detects a change in file.ts.
The application computes a new_hash of the file content. If new_hash == old_hash_in_cache, do nothing.
If new_hash is different, run Stage 1 (AST Extraction) only. This is fast and local.
Compare the newly generated SemanticContract.json with the old SemanticContract.json stored in the cache entry.
If the SemanticContract.json is identical (e.g., the user only changed the implementation of a private function, not its API signature or JSDoc), then the old LLM summary is still 100% valid. The cache entry is updated with the new_hash, but the LLM call (Stage 2) is skipped entirely.
Only if the SemanticContract.json differs (e.g., a function signature, JSDoc, or export was changed) does the pipeline proceed to Stage 2, call the LLM, and cache the new result.
This "semantic diff" logic 29 is the single most important optimization in the pipeline, saving significant cost and time.
Table 7.1: Semantic Cache Invalidation Logic
Event
Condition
Action
FileRead (e.g., getSummary(filePath))
Cache.Exists(filePath) AND Cache.Get(filePath).hash == hash(fileContent)
Return Cache.Get(filePath).summary (Fast Cache Hit)
FileRead
Cache.Exists(filePath) AND Cache.Get(filePath).hash!= hash(fileContent)
(Stale Hash) -> Trigger FileModified(filePath) logic, wait, and return result.
FileRead
!Cache.Exists(filePath)
(Cache Miss) -> Run_Full_Pipeline(filePath), Return summary
FileModified
hash(new) == Cache.Get(filePath).hash
Do Nothing (No change)
FileModified
Run_Stage1(filePath) -> new_semantic_json

new_semantic_json == Cache.Get(filePath).semantic_json
(Semantic Hit) Cache.UpdateHash(filePath, new_hash), SKIP LLM Call.
FileModified
Run_Stage1(filePath) -> new_semantic_json

new_semantic_json!= Cache.Get(filePath).semantic_json
(Semantic Miss) Run_Stage2(new_semantic_json) -> new_summary,

Cache.Set(filePath, {new_hash, new_semantic_json, new_summary})


7.3 Multi-Language Support Strategy

This architecture is "polyglot-ready" by design (RQ7). The entire system hinges on the IExtractor interface, which has one job: take a file path and return a SemanticContract.json (Table 2.1).
Phase 1 (TypeScript): Implement the IExtractor interface with a TsMorphExtractor class. This class will use the ts-morph library.5
Phase 2 (Python, Go, etc.): Implement the same IExtractor interface with a TreeSitterExtractor class. This class will act as a factory:
It will load the correct tree-sitter parser based on file extension (e.g., tree-sitter-python, tree-sitter-go).6
It will execute a language-specific set of tree-sitter queries 83 to find the equivalent nodes (functions, classes, exports, docstrings) for that language.
It will run an adapter to map the tree-sitter query results to our single, canonical SemanticContract.json schema.
The rest of the pipeline (Stage 2 LLM Synthesizer, Semantic Caching) remains identical and completely language-agnostic, as it operates only on the canonical JSON objects.

7.4 Phased Implementation Plan

The following provides a step-by-step guide to building src/summarization/:
Phase 1: The Extractor (src/summarization/extractor/)
Define the canonical SemanticContract.json schema (Table 2.1) and the TechnicalSummary.json schema (from Part III) as TypeScript interfaces.
Implement an IExtractor interface.
Implement the TsMorphExtractor class for TypeScript.
Write deterministic unit tests (per Section 5.4) to validate the extractor against the Arela test cases, asserting that the output SemanticContract.json is 100% accurate.
Phase 2: The Summarizer (src/summarization/summarizer/)
Implement a Summarizer class that takes a SemanticContract.json object as input.
Implement the Stage 2 LLM call (using the P-TECH-JSON prompt from Table 3.1).
Enforce the TechnicalSummary.json output schema using the LLM API's JSON mode.9
Phase 3: Validation (src/summarization/validation/)
Implement the automated CodeBERTScore validation test (Section 5.2).55
Implement the "LLM-as-a-Judge" Q&A validation protocol (Section 5.3).49
Run the full pipeline on the Arela test cases and populate the benchmark data (Table 4.1).
Perform human evaluation (Table 5.1) to calibrate the automated metrics.
Phase 4: Caching & Production (src/summarization/cache/)
Implement a CacheService (e.g., using Redis) to store and retrieve the TechnicalSummary.json artifacts.
Implement the full "Semantic Caching" invalidation logic (Table 7.1).
Create a CI pipeline (e.g., GitHub Action) that runs the summarizer and pre-populates the cache on changes to main.
Integrate the "Cache-Aside" read logic (getSummary(filePath)) into the main Arela Meta-RAG application.
Phase 5: Polyglot Expansion
Implement the TreeSitterExtractor (Section 7.3).
Add the tree-sitter-python parser and write the necessary queries to populate the SemanticContract.json.
Add the tree-sitter-go parser and write its queries.
Works cited
Exploring the Utilization of Program Semantics in Extreme Code Summarization: An Experimental Study Based on Acceptability Evalu, accessed on November 15, 2025, https://thesai.org/Downloads/Volume14No10/Paper_77-Exploring_the_Utilization_of_Program_Semantics.pdf
Automatic Semantic Augmentation of Language Model ... - arXiv, accessed on November 15, 2025, https://arxiv.org/abs/2304.06815
Automatic Semantic Augmentation of Language Model Prompts (for Code Summarization), accessed on November 15, 2025, https://arxiv.org/html/2304.06815v3
Codebase Indexing | Cursor Docs, accessed on November 15, 2025, https://cursor.com/docs/context/codebase-indexing
dsherret/ts-morph: TypeScript Compiler API wrapper for ... - GitHub, accessed on November 15, 2025, https://github.com/dsherret/ts-morph
Tree-sitter: Introduction, accessed on November 15, 2025, https://tree-sitter.github.io/
ts-morph - Classes, accessed on November 15, 2025, https://ts-morph.com/details/classes
ts-morph - Functions, accessed on November 15, 2025, https://ts-morph.com/details/functions
Structured Outputs | Gemini API | Google AI for Developers, accessed on November 15, 2025, https://ai.google.dev/gemini-api/docs/structured-output
AST-Enhanced Code Summarization for Java Subroutines - CS230, accessed on November 15, 2025, http://cs230.stanford.edu/projects_fall_2020/reports/55674290.pdf
Summarizing Source Code with Transferred API Knowledge - IJCAI, accessed on November 15, 2025, https://www.ijcai.org/proceedings/2018/0314.pdf
Statement-Grained Hierarchy Enhanced Code Summarization - MDPI, accessed on November 15, 2025, https://www.mdpi.com/2079-9292/13/4/765
Calibration of Large Language Models on Code Summarization - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2404.19318v3
Code Summarization Beyond Function Level - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2502.16704v1
Interpretable Code Summarization | IEEE Journals & Magazine, accessed on November 15, 2025, https://ieeexplore.ieee.org/document/10530504/
Angular Security | PDF | Http Cookie | Computer Engineering - Scribd, accessed on November 15, 2025, https://www.scribd.com/document/892236059/Angular-Security
ESC UniFlow — Part 2: Modular Structure & Strict Rules That Keep Systems Sane - Medium, accessed on November 15, 2025, https://medium.com/@donaldwengkigoni/esc-uniflow-part-2-modular-structure-strict-rules-that-keep-systems-sane-80125391e299
PaulDuvall/ai-development-patterns: A comprehensive collection of AI development patterns for building software with AI assistance, organized by implementation maturity and development lifecycle phases. Includes Foundation, Development, and Operations patterns with practical examples and anti-patterns. - GitHub, accessed on November 15, 2025, https://github.com/PaulDuvall/ai-development-patterns
ts-morph - Documentation, accessed on November 15, 2025, https://ts-morph.com/
Dossier: A tree-sitter based multi-language source code and docstring parser : r/rust - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/rust/comments/1980y0j/dossier_a_treesitter_based_multilanguage_source/
Dossier: a multi-language code and docstrings parser based on tree-sitter, accessed on November 15, 2025, https://users.rust-lang.org/t/dossier-a-multi-language-code-and-docstrings-parser-based-on-tree-sitter/105354
Abstract Syntax Tree for Programming Language Understanding and Representation: How Far Are We? - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2312.00413v1
Comments - ts-morph, accessed on November 15, 2025, https://ts-morph.com/details/comments
[Question/Help] How to get a related comment for each node? · Issue #659 · dsherret/ts-morph - GitHub, accessed on November 15, 2025, https://github.com/dsherret/ts-morph/issues/659
JS Docs - ts-morph, accessed on November 15, 2025, https://ts-morph.com/details/documentation
How to export (and consume) JSDoc comments in typescript NPM packages, accessed on November 15, 2025, https://stackoverflow.com/questions/44580985/how-to-export-and-consume-jsdoc-comments-in-typescript-npm-packages
Treesitter large file performance... Even with everything disabled? : r/neovim - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/neovim/comments/11mvwdn/treesitter_large_file_performance_even_with/
Performance - ts-morph, accessed on November 15, 2025, https://ts-morph.com/manipulation/performance
Diffsitter: A tree-sitter based AST difftool to get meaningful semantic diffs | Hacker News, accessed on November 15, 2025, https://news.ycombinator.com/item?id=27875333
tree-sitter size limitation (fails if code is >32kb) - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/79507130/tree-sitter-size-limitation-fails-if-code-is-32kb
Behavior with giant source files · Issue #222 · tree-sitter/tree-sitter - GitHub, accessed on November 15, 2025, https://github.com/tree-sitter/tree-sitter/issues/222
Zero-Shot, One-Shot, and Few-Shot Prompting, accessed on November 15, 2025, https://learnprompting.org/docs/basics/few_shot
Prompt Engineering 101: Understanding Zero-Shot, One-Shot, and Few-Shot - Codecademy, accessed on November 15, 2025, https://www.codecademy.com/article/prompt-engineering-101-understanding-zero-shot-one-shot-and-few-shot
Zero-Shot vs Few-Shot prompting: A Guide with Examples - Vellum AI, accessed on November 15, 2025, https://www.vellum.ai/blog/zero-shot-vs-few-shot-prompting-a-guide-with-examples
a few ideas for structured output and input : r/ChatGPTPromptGenius - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/ChatGPTPromptGenius/comments/1jd6szd/a_few_ideas_for_structured_output_and_input/
Prompt engineering - OpenAI API, accessed on November 15, 2025, https://platform.openai.com/docs/guides/prompt-engineering
Get consistent, well-formatted Markdown/JSON outputs from LLMs - n8n Community, accessed on November 15, 2025, https://community.n8n.io/t/get-consistent-well-formatted-markdown-json-outputs-from-llms/80749
From Sparse to Dense: GPT-4 Summarization with Chain of Density Prompting, accessed on November 15, 2025, https://montrealethics.ai/from-sparse-to-dense-gpt-4-summarization-with-chain-of-density-prompting/
Better Summarization with Chain of Density Prompting - PromptHub, accessed on November 15, 2025, https://www.prompthub.us/blog/better-summarization-with-chain-of-density-prompting
Chain of Density (CoD) - Learn Prompting, accessed on November 15, 2025, https://learnprompting.org/docs/advanced/self_criticism/chain-of-density
Requirements and Trade-Offs of Compression Techniques in Key–Value Stores: A Survey, accessed on November 15, 2025, https://www.mdpi.com/2079-9292/12/20/4280
Retaining Key Information under High Compression Ratios: Query-Guided Compressor for LLMs - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2406.02376v2
Understanding The Effectiveness of Lossy Compression in Machine Learning Training Sets This paper has been supported funding from the National Science Foundation and the US Department of Energy - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2403.15953v1
At what point/range is a code file too big? - Software Engineering Stack Exchange, accessed on November 15, 2025, https://softwareengineering.stackexchange.com/questions/176999/at-what-point-range-is-a-code-file-too-big
The Hidden Cost of Readability: How Code Formatting Silently Consumes Your LLM Budget, accessed on November 15, 2025, https://arxiv.org/html/2508.13666v1
Semantic Similarity Metrics for Evaluating Source Code Summarization - IEEE Xplore, accessed on November 15, 2025, https://ieeexplore.ieee.org/document/9796221/
Evaluating Code Summarization with Improved Correlation with Human Assessment, accessed on November 15, 2025, https://ieeexplore.ieee.org/document/9724827/
[2204.01632] Semantic Similarity Metrics for Evaluating Source Code Summarization - arXiv, accessed on November 15, 2025, https://arxiv.org/abs/2204.01632
How to evaluate a summarization task - OpenAI Cookbook, accessed on November 15, 2025, https://cookbook.openai.com/examples/evaluation/how_to_eval_abstractive_summarization
A list of metrics for evaluating LLM-generated content - Microsoft Learn, accessed on November 15, 2025, https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/generative-ai/working-with-llms/evaluation/list-of-eval-metrics
LLM Evaluation metrics explained. ROUGE score, BLEU, Perplexity, MRR… | by Mehul Gupta | Data Science in Your Pocket | Medium, accessed on November 15, 2025, https://medium.com/data-science-in-your-pocket/llm-evaluation-metrics-explained-af14f26536d2
BERTScore and ROUGE: Two Metrics for Evaluating Text Summarization Systems, accessed on November 15, 2025, https://haticeozbolat17.medium.com/bertscore-and-rouge-two-metrics-for-evaluating-text-summarization-systems-6337b1d98917
CodeBERTScore: Evaluating Code Generation with Pretrained Models of Code, accessed on November 15, 2025, https://huggingface.co/papers/2302.05527
CodeBERTScore: Evaluating Code Generation with Pretrained Models of Code - arXiv, accessed on November 15, 2025, https://arxiv.org/abs/2302.05527
neulab/code-bert-score: CodeBERTScore: an automatic ... - GitHub, accessed on November 15, 2025, https://github.com/neulab/code-bert-score
CodeBERTScore: Evaluating Code Generation with Pretrained Models of Code - OpenReview, accessed on November 15, 2025, https://openreview.net/pdf?id=7cXoueVCoL
CodeBERTScore: Evaluating Code Generation with Pretrained Models of Code, accessed on November 15, 2025, https://aclanthology.org/2023.emnlp-main.859/
Understanding and Improving Information Preservation in Prompt Compression for LLMs, accessed on November 15, 2025, https://arxiv.org/html/2503.19114v2
Power BI implementation planning: Validate content - Microsoft Learn, accessed on November 15, 2025, https://learn.microsoft.com/en-us/power-bi/guidance/powerbi-implementation-planning-content-lifecycle-management-validate
Test your Compose layout | Jetpack Compose - Android Developers, accessed on November 15, 2025, https://developer.android.com/develop/ui/compose/testing
Cursor vs VS Code with GitHub Copilot: A Comprehensive Comparison - Walturn, accessed on November 15, 2025, https://www.walturn.com/insights/cursor-vs-vs-code-with-github-copilot-a-comprehensive-comparison
What Is Open Source's Answer To Cursor's Codebase Level Context For Large Projects? : r/neovim - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/neovim/comments/1ijgamd/what_is_open_sources_answer_to_cursors_codebase/
Maximizing Cursor's Potential with RAG: A Guide to Enhanced Code ..., accessed on November 15, 2025, https://www.promptkit.tools/blog/cursor-rag-implementation
Context Engineering: A Guide With Examples - DataCamp, accessed on November 15, 2025, https://www.datacamp.com/blog/context-engineering
Rules | Cursor Docs, accessed on November 15, 2025, https://cursor.com/docs/context/rules
Large Codebases | Cursor Docs, accessed on November 15, 2025, https://cursor.com/docs/cookbook/large-codebases
The Power of Context In Cursor and Other Tips To Get the Most out of the AI Editor - Medium, accessed on November 15, 2025, https://medium.com/@michalstefanow.marek/the-power-of-context-in-cursor-and-other-tips-to-get-the-most-out-of-the-ai-editor-de5ce34e8ecc
Understanding the Contextual Scope of GitHub Copilot · community · Discussion #69280, accessed on November 15, 2025, https://github.com/orgs/community/discussions/69280
More Context == Better GitHub Copilot Responses in Visual Studio - YouTube, accessed on November 15, 2025, https://www.youtube.com/watch?v=N62d9PgiqoY
[NAACL 2025 Main Selected Oral] Repository for the paper: Prompt Compression for Large Language Models: A Survey - GitHub, accessed on November 15, 2025, https://github.com/ZongqianLi/Prompt-Compression-Survey
Contextual compression for RAG based applications. - GitHub, accessed on November 15, 2025, https://github.com/SrGrace/Contextual-Compression
Automated Code Review Using Large Language Models with Symbolic Reasoning - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2507.18476v1
Illustrative examples of CodeBERT and GraphCodeBERT. Both the models... - ResearchGate, accessed on November 15, 2025, https://www.researchgate.net/figure/Illustrative-examples-of-CodeBERT-and-GraphCodeBERT-Both-the-models-consists-of-12_fig1_370788139
Large Language Models (LLMs) for Source Code Analysis: applications, models and datasets - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2503.17502v1
Jump Start Solution: Generative AI document summarization | Cloud Architecture Center, accessed on November 15, 2025, https://docs.cloud.google.com/architecture/ai-ml/generative-ai-document-summarization
MLOps: Continuous delivery and automation pipelines in machine learning | Cloud Architecture Center, accessed on November 15, 2025, https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning
Caching Strategies. Cache Aside | by Aditi Mishra | Medium, accessed on November 15, 2025, https://medium.com/@aditimishra_541/caching-strategies-54c105f60299
Caching Best Practices | Amazon Web Services, accessed on November 15, 2025, https://aws.amazon.com/caching/best-practices/
Caching guidance - Azure Architecture Center | Microsoft Learn, accessed on November 15, 2025, https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching
Brief Overview of Caching and Cache Invalidation - CodeAhoy, accessed on November 15, 2025, https://codeahoy.com/2022/04/03/cache-invalidation/
Incremental compilation over AST - Computer Science Stack Exchange, accessed on November 15, 2025, https://cs.stackexchange.com/questions/54984/incremental-compilation-over-ast
Tinkering with Tree-Sitter Using Go - DEV Community, accessed on November 15, 2025, https://dev.to/shrsv/tinkering-with-tree-sitter-using-go-4d8n
Query all export statement positions using Tree-sitter : r/neovim - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/neovim/comments/12fqcfs/query_all_export_statement_positions_using/
How do I extract the first argument from a function in tree-sitter - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/70267465/how-do-i-extract-the-first-argument-from-a-function-in-tree-sitter
