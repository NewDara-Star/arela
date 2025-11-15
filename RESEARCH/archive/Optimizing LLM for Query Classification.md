
The Arela Context Router: A Phased Strategy for High-Speed, High-Accuracy Query Classification


Executive Summary: Recommended Solution for the Arela Context Router

The current implementation of Arela's query classifier, based on llama3.1:8b, fails to meet production requirements on two critical axes: its 3.8-second latency is unusable for a real-time system, and its 54% accuracy is insufficient for reliable routing.
This report provides a comprehensive, three-phase plan to transition this component from a failing prototype to a production-grade classifier. The analysis concludes that the 3.8s latency is not an inference-speed problem but a "cold-start" (model loading) problem, which is immediately solvable with a single configuration change. The 54% accuracy failure is a direct result of a simplistic, zero-shot prompt that provides no context, causing the model to default to the "FACTUAL" class.
Recommended Model:
The primary recommendation is to replace llama3.1:8b with Qwen 2.5: 3B. This model is explicitly optimized for high-fidelity instruction-following and, most critically for this task, reliable structured JSON output.1 This specialization makes it superior to the otherwise strong Llama 3.2: 3B for this specific classification use case.
Recommended Prompt Strategy:
The 54% accuracy will be remediated by replacing the zero-shot prompt with an advanced template incorporating:
Detailed Class Definitions: Providing clear keywords and contrastive examples to define the boundaries between ambiguous classes.
Few-Shot Exemplars: Utilizing the system's own test suite examples to provide In-Context Learning (ICL), anchoring the abstract definitions to concrete query patterns.5
Chain-of-Thought (CoT): Forcing the model to provide step-by-step analysis within the JSON output, which demonstrably improves accuracy on ambiguous tasks.8
Path to <500ms Latency:
Latency will be solved through a two-pronged approach:
Code-Level Optimization: Implementing the keep_alive: -1 parameter in the Ollama TypeScript API call.9 This keeps the model "warm" (loaded in memory), eliminating the 3.8s cold-start latency and revealing the true, sub-second inference speed.
Model-Level Optimization: Using the Q5_K_M GGUF quantization.12 This 5-bit quantization provides the optimal balance, retaining near-100% of the model's classification fidelity while delivering a significant speedup over 8-bit or full-precision versions.
Path to >85% Accuracy:
A three-phase implementation plan is recommended to achieve and exceed the 85% accuracy target:
Phase 1 (Quick Win): Implement Qwen 2.5: 3B with the new advanced prompt and the keep_alive fix. This will immediately achieve the <1s latency target and is projected to exceed 80% accuracy.
Phase 2 (Optimization): Begin logging all queries. Implement an Embedding-based k-Nearest Neighbor (k-NN) classifier 14 as a fast-path (<50ms) router, with the LLM acting as a fallback for high-ambiguity queries.15
Phase 3 (Production-Grade): Use the logged queries from Phase 2 to fine-tune a distilbert model.17 This is the industry-standard endgame: a <100ms, >95% accurate, and highly robust solution.

Part 1: Optimal Model Selection for On-Device Classification

This section addresses the selection of a new base model, moving from the current 8B parameter baseline to the 1-4B parameter range recommended for this task.

1.1. Analysis of the 8B Parameter Failure: A Tool Mismatch

The current llama3.1:8b model's failure is a product of two distinct issues. The 3.8s latency is not, as it may appear, the model's inference time. Rather, it is the "cold-start" time—the time required to load the 8B model, which consumes 7.6 GB of GPU memory 19, from disk into the Apple Silicon M1/M2's Unified Memory. This is an implementation flaw, which will be resolved in Part 3.
The 54% accuracy, however, is a more fundamental problem. Llama-3.1 8B is a highly capable, general-purpose model with a strong MMLU score of 66.7 19, and it shows impressive improvements over Llama-2.20 Its failure on this task is not due to a lack of "intelligence," but a mismatch for the task's constraints.
The task is a narrow, rigid, 5-class classification. The 8B model is trained for broad, complex reasoning. When presented with the current simple, ambiguous zero-shot prompt, it has no domain-specific context. It sees a query like "What imports auth?" and correctly identifies it as a factual question. It lacks the context to know that within the Arela system, this query maps to the "ARCHITECTURAL" class. This ambiguity causes the model to "over-think" the simple instruction and default to the broadest, safest category: "FACTUAL."
A large, general-purpose model is the wrong tool. It is less likely to strictly adhere to a rigid classification schema than a smaller, more nimble model that has been specifically instruction-tuned. This task requires a specialized "reflex," not a general-purpose "brain."

1.2. Head-to-Head Candidate Analysis (1-4B Parameter Range)

The analysis will now focus on the 1-4B parameter models recommended in the project's own prior research.

1.2.1. Candidate: Llama 3.2: 3B (The Safe All-Rounder)

Analysis: This 3B model offers an exceptional reasoning-to-size ratio. It requires only 3.4 GB of VRAM and achieves an MMLU score of 63.4, only slightly below the 8B model's 66.7.19 Meta has explicitly designed the Llama 3.2 series for lightweight applications 21 and optimized it for multilingual dialogue and instruction-tuning.22 Meta has also released its own optimized quantization schemes, which reduce model size by 56% and speed up inference 2-4x.23
Verdict: This is a strong, safe, and highly viable candidate. It possesses more than enough reasoning capacity to understand the nuance between the five classes, provided it is guided by a high-quality prompt.

1.2.2. Candidate: Qwen 2.5: 3B (The Specialist)

Analysis: The Qwen 2.5 series, including the 3B model, is explicitly cited in its documentation for "significant improvements in instruction following" and, most critically, "generating structured outputs especially JSON".1 This aligns perfectly with the two primary technical constraints of the Arela classifier: 1) accurate classification and 2) reliable JSON output. While Llama 3.2: 3B is a strong general reasoner (Constraint 1), Qwen 2.5: 3B is specifically optimized for both high-fidelity instruction-following and reliable JSON generation.1
Verdict: This is the Primary Recommendation. A model that is less likely to break the JSON structure is inherently more reliable in production, as it reduces a major source of potential parsing errors in the TypeScript backend. Its specific optimizations make it a superior and less risky choice for this exact use case.

1.2.3. Candidate: Phi-3-Mini (3.8B) (The High-Risk Option)

Analysis: The 3.8B parameter Phi-3-Mini 25 is well-known for its excellent on-device speed. On Apple Silicon, it can reportedly achieve 18-37 tokens/sec on a base M1 chip.27 However, despite this speed, a key source provides a strong negative review for RAG-like tasks, stating that the model "completely confuses facts, mixes things up" and "makes Llama look good".28
Verdict: Rejected. A classifier's primary virtue must be reliability and consistency. The risk of the model "confusing" categories, as suggested in 28, is too high for a production system where accuracy is a key success criterion.

1.2.4. Candidate: DeepSeek-R1 (1.5B) (The Wrong Tool)

Analysis: This is a specialized reasoning model, often used in distilled forms.29 It excels at complex, multi-step tasks like mathematics, on which it achieved 97.3% on the MATH-500 benchmark, and code generation.32
Verdict: Rejected. This is a tool mismatch. The Arela task is semantic intent classification, not multi-step reasoning.

1.3. Benchmark Synthesis: Performance on Apple Silicon

The 3.8s latency of the current 8B model is a cold-start problem. The true latency is the "warm" inference speed. On Apple Silicon, this performance is exceptionally strong. A larger Qwen 2.5: 7B model, for instance, achieves ~27 tokens/sec on an M1 Pro.33 The llama.cpp engine, which Ollama uses as its backend, shows M2 Ultra prompt processing (PP) speeds at over 1200 tokens/sec and token generation (TG) at 94 tokens/sec.34
These figures, however, can be misleading. Standard tokens/sec benchmarks measure generation (e.g., writing a long paragraph). The Arela task is classification. For this use case, the entire answer (the class) is determined during the prompt processing (PP) phase. The "generation" (TG) phase is merely the model "typing out" the 30-50 tokens of JSON it has already computed.
Because the answer is so short and deterministic (a fixed JSON schema), the time to first token (TTFT) is nearly identical to the total time. The total latency for a warm 3B model will be dominated by the prompt processing time, which, based on benchmarks 34, will be well under the 500ms target. The generative t/s speed is almost irrelevant.

1.4. Table 1: Model Benchmark Comparison (1-4B Parameter Range)

The following table provides a single, consolidated view to justify the final model recommendation by comparing the baseline against the viable alternatives.

Model
Size (Params)
Disk Size (Q5_K_M)
Est. M1 Pro Warm Latency
Key Strengths
Key Weaknesses
Verdict
llama3.1:8b (Baseline)
8B
~7.6 GB (f16) 19
~3.8s (cold) / ~800ms (warm)
High general reasoning 19
Too slow, high VRAM, poor instruction-following on narrow tasks, "over-thinks" 19
❌ Rejected
llama3.2:3b
3B
~3.4 GB 19
<500ms
Excellent reasoning-to-size ratio 19, safe all-rounder
Not specialized in JSON output
✅ Recommended Alt
qwen2.5:3b
3B
~3.5 GB
<500ms
Superior instruction-following 35, explicitly optimized for structured JSON output 1
None for this task
✅ Primary Rec
phi-3-mini:3.8b
3.8B
~4.0 GB
<400ms 27
Very fast on-device 27
Reports of high "confusion" and factual errors 28
❌ Rejected


1.5. Final Model Recommendation

Primary Recommendation: Qwen 2.5: 3B
Why: It is the only model in the class that is explicitly optimized for the two most critical, non-negotiable requirements: high-quality instruction-following and reliable, structured JSON generation.1 This directly mitigates production risks.
Ollama Command: ollama pull qwen2.5:3b
Secondary Recommendation: Llama 3.2: 3B
Why: If Qwen 2.5: 3B proves unable to capture the classification nuances, Llama 3.2: 3B is the fallback. Its strong general reasoning 19 will be able to handle a complex prompt.
Ollama Command: ollama pull llama3.2:3b

Part 2: Advanced Prompt Engineering for Classification Accuracy

This section provides the "software" to run on the new "hardware," a new prompt template designed to fix the 54% accuracy and specific misclassifications (e.g., ARCH -> FACTUAL).

2.1. Deconstructing the 54% Accuracy Failure

The current prompt is zero-shot, providing only abstract definitions ("Structure-focused") with no concrete examples. This is a "Context-Free" failure. The model lacks the crucial domain-specific context of the Arela RAG system. It cannot, and should not be expected to, know the subtle difference between a general factual question ("What is JWT?") and a codebase-specific factual question ("What imports auth?"). The current prompt actively trains the model to make this error. The solution is to provide this missing context via In-Context Learning (ICL), which is the formal term for few-shot prompting.7

2.2. The "Few-Shot" Foundation: Providing Context

The single most effective way to improve the model's performance is to provide 1-2 high-quality examples for each of the five classes.5 This technique anchors the abstract class definitions to concrete query patterns 7, allowing the model to learn the style and pattern of the desired input-output pairs.6 The Arela system's own test suite examples are the perfect source for this.

2.3. Solving Ambiguity: Chain-of-Thought (CoT) and Class Definitions

The core problem is ambiguity (e.g., ARCH vs. FACT), which causes the model to jump to the default "FACTUAL" class. This will be remediated by adding a Chain-of-Thought (CoT) instruction.8 The prompt will instruct the model to "Think step-by-step" and, critically, to place this reasoning inside the final JSON object in the "reasoning" field.
This forced intermediate reasoning step breaks the ambiguity. The model cannot just output a class; it must first generate an internal monologue (e.g., "The query 'What imports auth?' uses the keyword 'imports,' which maps to ARCHITECTURAL. It is not a general knowledge question. Therefore, it is ARCHITECTURAL."). This process makes the model "show its work" and dramatically improves its ability to resolve ambiguity correctly.

2.4. Fixing the "Factual" Bias: Exemplar Distribution

The model's tendency to default to "FACTUAL" is a classic distribution bias 37 or default-class bias.38 The model assumes this is the most common or safest choice. This bias will be fixed in two ways:
Equal Exemplar Distribution: The new prompt will provide an equal distribution of exemplars 37—1-2 examples for all five classes. This teaches the model that all classes are equally likely.
Explicit Instruction: The prompt will include a direct instruction to counter the bias: "Do not default to FACTUAL. If a query matches keywords for another type (e.g., 'my preferred' for USER, 'why did we' for HISTORICAL), you must select that type."

2.5. Why to Avoid Negative Examples (A Key Correction)

The user's research plan suggested using "NOT" examples (e.g., "PROCEDURAL is NOT factual"). This approach is counter-productive. LLMs are notoriously poor at processing negation.40 Providing negative examples can confuse the model or, paradoxically, reinforce the very pattern one is trying to avoid.41
The correct approach is not "A is not B," but "A is X, while B is Y." This contrastive pair explicitly teaches the boundary.
Bad (Negative): FACTUAL is NOT about code structure.
Good (Contrastive): FACTUAL is about concepts (e.g., 'How does JWT work?'). ARCHITECTURAL is about code structure (e.g., 'What imports auth.ts?').

2.6. Optimized Prompt Template (Deliverable)

This is the full, optimized prompt template that should be implemented in Phase 1. It synthesizes all the techniques above: role-prompting, guaranteed JSON output, Chain-of-Thought, and contrastive few-shot exemplars.

Code snippet


You are an expert query classifier for the Arela Meta-RAG system. Your task is to classify a user's query into one of five distinct types.

You MUST return a single, valid JSON object with the schema:
{"type": "TYPE", "confidence": 0.0-1.0, "reasoning": "Your step-by-step analysis."}

Think step-by-step to determine the correct type:
1.  Analyze the user's query.
2.  Compare its intent and keywords against the definitions below.
3.  Pay close attention to the contrastive examples to resolve ambiguity.
4.  Provide your step-by-step analysis in the "reasoning" field.
5.  Select the single best "type" and provide a "confidence" score.

---


1.  **PROCEDURAL**:
    *   **Intent**: The user wants to DO, CREATE, or CONTINUE an action or task.
    *   **Keywords**: "implement", "continue", "add", "create", "build", "make", "refactor".
    *   **Example Query**: "Continue working on the authentication"
    *   **Example JSON**: {"type": "PROCEDURAL", "confidence": 0.9, "reasoning": "The query uses the keyword 'Continue', indicating a task-oriented action. This is a PROCEDURAL request."}

2.  **FACTUAL**:
    *   **Intent**: The user is seeking general KNOWLEDGE or an EXPLANATION of a concept.
    *   **Keywords**: "what is", "how does", "explain", "describe", "what's the".
    *   **Contrast**: This is for *concepts* ("What is JWT?"), not *code structure* ("What imports auth.ts?").
    *   **Example Query**: "How does bcrypt work?"
    *   **Example JSON**: {"type": "FACTUAL", "confidence": 1.0, "reasoning": "The query uses 'How does...work', seeking an explanation of a concept. This is a standard FACTUAL request."}

3.  **ARCHITECTURAL**:
    *   **Intent**: The user is asking about the CODE STRUCTURE, dependencies, or file relationships.
    *   **Keywords**: "show dependencies", "imports", "structure", "calls", "uses", "diagram", "file structure".
    *   **Contrast**: This is for *code structure* ("What imports auth.ts?"), not *concepts* ("What is auth?").
    *   **Example Query**: "What imports the auth module?"
    *   **Example JSON**: {"type": "ARCHITECTURAL", "confidence": 0.9, "reasoning": "The query uses the keyword 'imports' and asks about a specific code module ('auth module'), indicating a request about code structure. This is ARCHITECTURAL."}

4.  **USER**:
    *   **Intent**: The user is asking about their *own* preferences, expertise, or habits.
    *   **Keywords**: "my preferred", "my expertise", "what do I like", "my setup".
    *   **Contrast**: This is *personal* to the user ("What's my preferred framework?"), not *general* ("What is a framework?").
    *   **Example Query**: "What is my preferred testing framework?"
    *   **Example JSON**: {"type": "USER", "confidence": 1.0, "reasoning": "The query uses the phrase 'my preferred', indicating a request for personal user data. This is a USER request."}

5.  **HISTORICAL**:
    *   **Intent**: The user is asking about *past* decisions, rationale, or project history.
    *   **Keywords**: "what decisions were made", "why did we", "history", "rationale", "when did we".
    *   **Contrast**: This is about *past rationale* ("Why did we choose Postgres?"), not *current state* ("What database are we using?").
    *   **Example Query**: "Why did we choose PostgreSQL?"
    *   **Example JSON**: {"type": "HISTORICAL", "confidence": 0.9, "reasoning": "The query uses 'Why did we choose', asking for the rationale behind a past decision. This is a HISTORICAL request."}

---


Query: "{query}"





Part 3: High-Speed Inference: A Strategy for <500ms Latency

This section details the technical optimizations required to meet the sub-second speed target within the Ollama/TypeScript environment.

3.1. Latency Source #1: Model Loading (The "Cold Start" Problem)

Problem: The 3.8s latency with llama3.1:8b.
Root Cause: This latency is not inference. It is the time required for Ollama to load the 4.9GB model 26 into the M1/M2's Unified Memory. By default, Ollama unloads models from memory after a short timeout (e.g., 5 minutes) to free up resources.
Solution: The keep_alive Parameter: The Ollama API provides a keep_alive parameter in its /api/chat and /api/generate endpoints.9 This parameter instructs Ollama how long to keep a model in memory after the request is complete.
Implementation (TypeScript): By setting keep_alive to a negative number (-1) or a very long duration ("24h"), the model will be kept "warm" (loaded in memory) indefinitely.9 The first query will still pay the 3.8s load-time cost, but every subsequent query will be sub-second.
Code Example (ollama-js):
TypeScript
import ollama from 'ollama';

const response = await ollama.chat({
  model: 'qwen2.5:3b-q5_k_m', // Swapped to recommended model and quantization
  messages:,
  options: {
    keep_alive: -1 // This is the critical optimization
  }
});


Impact: This one-line change will drop the average latency from 3.8s to <1s immediately for all but the first query.

3.2. Latency Source #2: Model Size (Inference Speed)

Problem: Even a "warm" 8B model may be too slow. The 3B model will be significantly faster 19, but it can be optimized further.
Solution: Strategic Quantization (GGUF): Quantization is a technique that reduces the precision of the model's weights (e.g., from 16-bit floats to 4-bit integers), making it smaller on disk and much faster to run on a CPU/GPU.45
Analysis of Quantization Levels:
f16 (Full precision): Too slow and large.
Q8_0 (8-bit): High quality, close to f16, but still large and may not meet the <500ms target.13
Q4_K_M (4-bit): The "safe default".13 Very fast, small size.
Q5_K_M (5-bit): The "sweet spot" for high-fidelity tasks.
Optimal Strategy: The Arela task is classification, which is sensitive to semantic nuance. Aggressive quantization (e.g., to Q4 or below) can degrade this semantic understanding, even if it is "good enough" for general chat.47 Analysis of GGUF formats shows that Q5_K_M "is consistently the safest GGUF format, retaining >95% accuracy" and is the "default recommendation when speed and fidelity must be balanced".12 It offers a "noticeable quality gain" over Q4_K_M.13
Action: Do not use the default 4-bit quant. The marginal increase in size for Q5_K_M is well worth the significant gain in accuracy and reliability for this classification task.
ollama pull qwen2.5:3b-q5_k_m (Note: The exact tag may vary; check the Ollama library for the 5-bit, K-quant, Medium version).

3.3. Latency Source #3: Text Parsing (Response Handling)

Problem: The current prompt asks for JSON. The model generates JSON as text. The Node.js backend then has to JSON.parse() this text. This process is brittle and can fail if the model adds "Here is your JSON..." or trailing characters, adding latency and unreliability.
Solution: Enforcing Structured Output: The Ollama API supports a format: "json" parameter.42 This forces the model's output to be guaranteed valid JSON, eliminating parsing failures.
Implementation (TypeScript + Zod): The most robust way to implement this in the Arela stack is to define the output schema using zod 49, convert it to a JSON schema, and pass that schema directly to the Ollama API.
Code Example 49:
TypeScript
import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// 1. Define your Zod schema
const ClassificationSchema = z.object({
  type: z.enum(),
  confidence: z.number().min(0.0).max(1.0),
  reasoning: z.string().describe("Step-by-step reasoning for the classification."),
});

// 2. Convert to JSON schema (as a plain object)
const jsonSchema = zodToJsonSchema(ClassificationSchema);

// 3. Make the API call
const response = await ollama.chat({
  model: 'qwen2.5:3b-q5_k_m',
  messages:,
  format: jsonSchema, // Pass the schema object here
  options: {
    keep_alive: -1
  }
});

// 4. Parse the guaranteed-valid JSON
// The response.message.content is now a guaranteed valid JSON string
const classification = ClassificationSchema.parse(JSON.parse(response.message.content));
console.log(classification.type); // e.g., "ARCHITECTURAL"
console.log(classification.reasoning); // e.g., "The query uses the keyword 'imports'..."



Part 4: Comparative Analysis of Alternative Classification Architectures

This section addresses the third research question, looking beyond the immediate zero-shot LLM solution. A zero-shot LLM is an excellent prototyping tool for classification. However, for a 5-class problem with high-throughput, low-latency requirements, it is not the industry-standard production solution. The long-term plan should be to migrate to a more specialized, efficient, and robust architecture.

4.1. Architecture 1: Hybrid Heuristic Classifier (Fast Path / Low Accuracy)

Concept: A two-stage pipeline. Stage 1 uses fast regex/keyword matching (e.g., ^What is -> FACTUAL). If no keyword matches, Stage 2 falls back to the LLM classifier.15
Analysis: This approach is extremely fast (<10ms) for obvious queries. However, it is highly brittle. The entire problem facing the Arela classifier is ambiguity (e.g., "What imports auth?"), which regex cannot solve. This architecture would simply fail to classify all the difficult queries, forcing a fallback to the LLM anyway. It adds significant complexity and maintenance overhead for minimal gain. This is not recommended.

4.2. Architecture 2: Embedding-Based Similarity (k-NN) (The "Smart" Path)

Concept: This method classifies a new query by comparing its "meaning" (embedding) to a library of pre-classified examples.
Implementation:
Offline: Create 20-30 high-quality examples for each of the 5 classes (100-150 total).
Offline: Use a lightweight, fast embedding model (e.g., all-MiniLM-L6-v2 53) to convert these 150 examples into 150 vectors. Store them in memory.
Runtime: When a new query arrives, embed only that query using the same model.
Runtime: Use a cosine similarity function 54 to find the k-nearest neighbors (e.g., k=3) from the 150 stored vectors.14
Runtime: Classify the new query based on the majority vote of its neighbors.
Analysis: This is an excellent strategy. It is extremely fast (<50ms), as it only requires one embedding operation and a vector search. It is highly accurate for semantic intent 56 and easy to implement in TypeScript.54 Its main drawback is that it doesn't provide a "reasoning" field, which the LLM solution does.

4.3. Architecture 3: Fine-Tuned Small Classifier (The "Pro" Solution)

Concept: This is the industry-standard, "endgame" solution. A specialized, small transformer model is fine-tuned on a large, custom dataset of labeled queries.
Implementation:
Data Collection: Log all queries from Phase 1 & 2 until 1,000+ labeled examples are collected.
Model Choice: distilbert-base-uncased.17 This model is designed for classification, is very small (~260MB), and trains quickly.58
Training: Fine-tune this model on the 5-class dataset using a library like Hugging Face transformers.
Analysis: This solution provides the best of all worlds. It is extremely fast (<100ms), delivers the highest possible accuracy (>95% is achievable), and is the most robust and maintainable solution over the long term. Its only prerequisite is the collection of a high-quality, labeled dataset.

4.4. Table 2: Architecture Trade-Off Analysis

The following table provides a clear "crawl-walk-run" path for the classifier's architecture, justifying the phased plan in Part 5.
Architecture
Est. Latency (Warm)
Est. Accuracy
Implementation Effort
Maintainability
Recommended Phase
Zero-Shot LLM (Current)
llama3.1:8b (3.8s)
54%
Low
N/A (Failing)
Phase 0
Zero-Shot LLM (New)
qwen2.5:3b (<500ms)
~80-85%
Low (1 day)
Medium (Prompt tuning)
Phase 1
Ensemble (k-NN + LLM)
k-NN (<50ms)
>90%
Medium (3 days)
Low (Add new k-NN examples)
Phase 2
Fine-Tuned Classifier
distilbert (<100ms)
>95%
High (1 week + data)
Low (Retrain on new data)
Phase 3 (Endgame)


Part 5: Phased Implementation and Fallback Strategy

This section provides the concrete, actionable roadmap that ties all research together, designed to fit the 2-3 week timeline.

5.1. Phase 1: Quick Wins (Target: <1s, ~80% Accuracy) - (Days 1-3)

Objective: Get to a "good enough" state. Fix the latency and the worst of the inaccuracy.
Actions:
Model: ollama pull qwen2.5:3b-q5_k_m.
Prompt: Implement the Optimized Prompt Template from Part 2.6 in the TypeScript backend.
Code (Speed): Add keep_alive: -1 9 to the ollama.chat() or ollama.generate() call.
Code (Reliability): Implement format: jsonSchema using zod and zod-to-json-schema 49 to guarantee parseable output.
Logging: This is the most critical step. Begin logging every single query and the model's classified response (including the reasoning field) to a database. This data is the raw material for Phase 3.

5.2. Phase 2: Optimization & Ensemble (Target: <200ms, >90% Accuracy) - (Weeks 1-2)

Objective: Drastically reduce latency for common queries and improve accuracy by implementing the k-NN architecture.
Actions:
Manual Labeling: An engineer reviews the logs from Phase 1, correcting any misclassifications.
k-NN Classifier: Implement the Embedding-Based Similarity (k-NN) classifier from Part 4.2.
Use all-MiniLM-L6-v2 53 via a TypeScript embedding library.
Use 100-150 of the best-labeled examples from the logs as the "memory" for the k-NN.
Ensemble Router: Modify the classifier service to be an ensemble 15:
TypeScript
async function classifyQuery(query: string) {
  // k-NN is fast, run it first
  const knnResult = await kNNClassifier.classify(query);

  // If confidence is high, return immediately
  if (knnResult.confidence > 0.90) {
    return knnResult; // <50ms response
  }

  // Else, fallback to the slower, "smarter" LLM
  const llmResult = await llmClassifier.classify(query); // <500ms response
  return llmResult;
}



5.3. Phase 3: Production-Grade Solution (Target: <100ms, >95% Accuracy) - (Week 3+)

Objective: Replace the entire complex ensemble with a single, tiny, ultra-fast, and hyper-accurate model.
Actions:
Data: By now, the logging system should have collected 1,000+ high-quality labeled queries.
Train: Use the Hugging Face transformers library 17 to fine-tune a distilbert-base-uncased model for sequence classification 57 on the 5 classes.
Deploy: Export this fine-tuned model (e.g., to ONNX format) and run it in the Node.js backend using a library like transformers.js.
Final State: The classifier service is now a single, local function call to this new model. It will be faster, more accurate, and consume fewer resources than the Phase 2 LLM, and it will be completely independent of Ollama for this task.

5.4. Fallback and Error Handling Strategy

Problem: The system must be robust to classification failure or high ambiguity.
Solution: The routing logic must account for uncertainty.
Actions:
Modify Schema: Add a "UNKNOWN" option to the z.enum([...]) in the ClassificationSchema (Part 3.3).
Modify Prompt: Add the following instruction to the prompt: "If the query is highly ambiguous and does not fit any type, or you have low confidence, return the type "UNKNOWN"."
Routing Logic: The Meta-RAG system's router must check for this:
TypeScript
const classification = await Classifier.classifyQuery(query);

if (classification.type === "UNKNOWN" |



| classification.confidence < 0.60) {
// Fallback Strategy: Route to general-purpose layers
routeToLayers(["Vector", "Project"]);
} else {
// Standard routing
const layers = getLayersForType(classification.type);
routeToLayers(layers);
}
```
Benefit: This strategy prevents low-confidence classifications from being misrouted. A less-optimized, general-context response (from querying the Vector and Project layers) is always preferable to a completely incorrect, narrowly-scoped response from a failed classification. This makes the entire system more robust.
Works cited
Qwen/Qwen2.5-3B - Hugging Face, accessed on November 15, 2025, https://huggingface.co/Qwen/Qwen2.5-3B
Qwen2.5: A Party of Foundation Models! | Qwen, accessed on November 15, 2025, https://qwenlm.github.io/blog/qwen2.5/
qwen2.5:3b - Ollama, accessed on November 15, 2025, https://ollama.com/library/qwen2.5:3b
Qwen/Qwen2.5-1.5B-Instruct - Hugging Face, accessed on November 15, 2025, https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
Prompt Engineering 101: Understanding Zero-Shot, One-Shot, and Few-Shot - Codecademy, accessed on November 15, 2025, https://www.codecademy.com/article/prompt-engineering-101-understanding-zero-shot-one-shot-and-few-shot
The Few Shot Prompting Guide - PromptHub, accessed on November 15, 2025, https://www.prompthub.us/blog/the-few-shot-prompting-guide
Zero-Shot, One-Shot, and Few-Shot Prompting, accessed on November 15, 2025, https://learnprompting.org/docs/basics/few_shot
Chain of Thought Prompting Guide - PromptHub, accessed on November 15, 2025, https://www.prompthub.us/blog/chain-of-thought-prompting-guide
FAQ - Ollama, accessed on November 15, 2025, https://docs.ollama.com/faq
Ollama JavaScript library - GitHub, accessed on November 15, 2025, https://github.com/ollama/ollama-js
Ollama model keep in memory and prevent unloading between requests (keep_alive?), accessed on November 15, 2025, https://stackoverflow.com/questions/79526074/ollama-model-keep-in-memory-and-prevent-unloading-between-requests-keep-alive
Benchmarking Quantized LLMs: What Works Best for Real Tasks? - Ionio, accessed on November 15, 2025, https://www.ionio.ai/blog/llm-quantize-analysis
The Practical Quantization Guide for iPhone and Mac (GGUF: Q4_K_M vs Q5_K_M vs Q8_0) - Enclave AI - Private, Local, Offline AI Assistant for MacOS and iOS, accessed on November 15, 2025, https://enclaveai.app/blog/2025/11/12/practical-quantization-guide-iphone-mac-gguf/
Use language embeddings for zero-shot classification and semantic search with Amazon Bedrock | Artificial Intelligence, accessed on November 15, 2025, https://aws.amazon.com/blogs/machine-learning/use-language-embeddings-for-zero-shot-classification-and-semantic-search-with-amazon-bedrock/
Intent-Driven Natural Language Interface: A Hybrid LLM + Intent Classification Approach | by Anil Malkani | Data Science Collective | Medium, accessed on November 15, 2025, https://medium.com/data-science-collective/intent-driven-natural-language-interface-a-hybrid-llm-intent-classification-approach-e1d96ad6f35d
Benchmarking hybrid LLM classification systems | Pathways - Voiceflow, accessed on November 15, 2025, https://www.voiceflow.com/pathways/benchmarking-hybrid-llm-classification-systems
DistilBERT Fine-tuning - Kaggle, accessed on November 15, 2025, https://www.kaggle.com/code/nadzmiagthomas/distilbert-fine-tuning
Text classification - Hugging Face, accessed on November 15, 2025, https://huggingface.co/docs/transformers/v4.17.0/tasks/sequence_classification
LLama 3.2 1B and 3B: small but mighty! | by Jeremy K | The Pythoneers - Medium, accessed on November 15, 2025, https://medium.com/pythoneers/llama-3-2-1b-and-3b-small-but-mighty-23648ca7a431
Llama-2 vs. Llama-3: a Tic-Tac-Toe Battle Between Models | Towards Data Science, accessed on November 15, 2025, https://towardsdatascience.com/llama-2-vs-llama-3-a-tic-tac-toe-battle-between-models-7301962ca65d/
Understanding the Differences Between Meta Llama 3.2 3B, Llama 3.2 11B, and Llama 3.3 70B - AgentX, accessed on November 15, 2025, https://www.agentx.so/post/understand-meta-llama-versions
meta-llama/Llama-3.2-3B-Instruct - Hugging Face, accessed on November 15, 2025, https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct
Meta Llama 3.2 Lightweight Quantized Models: 1B and 3B - Unomena, accessed on November 15, 2025, https://www.unomena.com/insights/meta-llama-3-2-lightweight-quantized-models-1b-3b
Introducing quantized Llama models with increased speed and a reduced memory footprint, accessed on November 15, 2025, https://ai.meta.com/blog/meta-llama-quantized-lightweight-models/
Models - OpenRouter, accessed on November 15, 2025, https://openrouter.ai/models
Multimodal LLMs on a Mac M1: A Quick Test | by Prashant Dandriyal | Medium, accessed on November 15, 2025, https://prashantdandriyal.medium.com/multimodal-llms-on-a-mac-m1-a-quick-test-5397bd33a6b6
The Best Local LLMs To Run On Every Mac (Apple Silicon) - ApX Machine Learning, accessed on November 15, 2025, https://apxml.com/posts/best-local-llm-apple-silicon-mac
Are Llama 3.2 and Phi 3.1 mini 3B any good for LongRAG or for document Q&A? - Medium, accessed on November 15, 2025, https://medium.com/@billynewport/are-llama-3-2-and-phi-mini-any-good-for-longrag-or-for-document-q-a-35cedb13a995
DeepSeek R1: open source reasoning model | LM Studio Blog, accessed on November 15, 2025, https://lmstudio.ai/blog/deepseek-r1
DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning - arXiv, accessed on November 15, 2025, https://arxiv.org/pdf/2501.12948
Fine-Tuning DeepSeek R1 Reasoning on Medical Chain of Thought Dataset - Medium, accessed on November 15, 2025, https://medium.com/@anicomanesh/fine-tuning-deepseek-r1-reasoning-on-the-medical-chain-of-thought-dataset-922407121cc2
DeepSeek R1 vs OpenAI o1: Which One is Faster, Cheaper and Smarter? - Analytics Vidhya, accessed on November 15, 2025, https://www.analyticsvidhya.com/blog/2025/01/deepseek-r1-vs-openai-o1/
Tested local LLMs on a maxed out M4 Macbook Pro so you don't have to : r/ollama - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/ollama/comments/1j0by7r/tested_local_llms_on_a_maxed_out_m4_macbook_pro/
Performance of llama.cpp on Apple Silicon M-series #4167 - GitHub, accessed on November 15, 2025, https://github.com/ggml-org/llama.cpp/discussions/4167
Your best 3b model? Llama 3.2, kwen 2.5 or Phi 3.5? : r/LocalLLaMA - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/LocalLLaMA/comments/1giy3pt/your_best_3b_model_llama_32_kwen_25_or_phi_35/
Chain-of-Thought Prompting | Prompt Engineering Guide, accessed on November 15, 2025, https://www.promptingguide.ai/techniques/cot
Biases - Prompt Engineering Guide, accessed on November 15, 2025, https://www.promptingguide.ai/risks/biases
Prompt Optimization with Two Gradients for Classification in Large Language Models - MDPI, accessed on November 15, 2025, https://www.mdpi.com/2673-2688/6/8/182
How to Reduce Bias in AI with Prompt Engineering - Ghost, accessed on November 15, 2025, https://latitude-blog.ghost.io/blog/how-to-reduce-bias-in-ai-with-prompt-engineering/
Fine tuning using negative examples? - API - OpenAI Developer Community, accessed on November 15, 2025, https://community.openai.com/t/fine-tuning-using-negative-examples/328448
Best way to pass negative examples to models using Langchain? - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/LangChain/comments/1f8vp0s/best_way_to_pass_negative_examples_to_models/
API Reference - Ollama English Documentation, accessed on November 15, 2025, https://ollama.readthedocs.io/en/api/
Local by Default: Why Mac Developers Should Run LLMs with Ollama (and When Not To) | by Erik Kleiman | Medium, accessed on November 15, 2025, https://medium.com/@hekleiman/local-by-default-why-mac-developers-should-run-llms-with-ollama-and-when-not-to-add342d9eb11
Ollama chat Node request to extend the 5 mins timeout [GOT CREATED] - n8n Community, accessed on November 15, 2025, https://community.n8n.io/t/ollama-chat-node-request-to-extend-the-5-mins-timeout-got-created/43952
Demystifying LLM Quantization Suffixes: What Q4_K_M, Q8_0, and Q6_K Really Mean, accessed on November 15, 2025, https://medium.com/@paul.ilvez/demystifying-llm-quantization-suffixes-what-q4-k-m-q8-0-and-q6-k-really-mean-0ec2770f17d3
Sustainable LLM Inference for Edge AI: Evaluating Quantized LLMs for Energy Efficiency, Output Accuracy, and Inference Latency - arXiv, accessed on November 15, 2025, https://arxiv.org/html/2504.03360v1
Q4, Q5, Q8… why? : r/LocalLLaMA - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/LocalLLaMA/comments/1bltyis/q4_q5_q8_why/
Structured Outputs - Ollama's documentation, accessed on November 15, 2025, https://docs.ollama.com/capabilities/structured-outputs
Structured outputs · Ollama Blog, accessed on November 15, 2025, https://ollama.com/blog/structured-outputs
Ollama generate endpoint parameters | by Laurent Kubaski - Medium, accessed on November 15, 2025, https://medium.com/@laurentkubaski/ollama-generate-endpoint-parameters-bdf9c2b340d1
Effortlessly Generate Structured Information with Ollama, Zod, and ModelFusion | by Lars Grammel | CodeX, accessed on November 15, 2025, https://lgrammel.medium.com/effortlessly-generate-structured-information-with-ollama-zod-and-modelfusion-9788471b0b5e
A Comparative Performance Analysis of Regular Expressions and an LLM-Based Approach to Extract the BI-RADS Score from Radiological Reports | medRxiv, accessed on November 15, 2025, https://www.medrxiv.org/content/10.1101/2025.06.01.25328636v1.full-text
sentence-transformers/all-MiniLM-L6-v2 - Hugging Face, accessed on November 15, 2025, https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
How to Implement a Cosine Similarity Function in TypeScript for Vector Comparison, accessed on November 15, 2025, https://alexop.dev/posts/how-to-implement-a-cosine-similarity-function-in-typescript-for-vector-comparison/
cosine-similarity · GitHub Topics, accessed on November 15, 2025, https://github.com/topics/cosine-similarity?l=typescript&o=asc&s=updated
vector-similarity · GitHub Topics, accessed on November 15, 2025, https://github.com/topics/vector-similarity
juandalibaba/finetuning-distilbert-for-classification - Hugging Face, accessed on November 15, 2025, https://huggingface.co/juandalibaba/finetuning-distilbert-for-classification
DistilBERT - Hugging Face, accessed on November 15, 2025, https://huggingface.co/docs/transformers/en/model_doc/distilbert
Building a Text Classification Model using DistilBERT | by Prakash Ramu - Medium, accessed on November 15, 2025, https://medium.com/@prakashram1327/building-a-text-classification-model-using-distilbert-703c1409696c
