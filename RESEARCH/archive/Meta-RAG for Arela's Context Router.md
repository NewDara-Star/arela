
Arela's Context Router: An Implementation Blueprint for an Adaptive Tri-Memory RAG System


1. Executive Summary

This report outlines a production-ready architecture for evolving Arela's AI Technical Co-Founder from a simple Retrieval-Augmented Generation (RAG) system to an intelligent, adaptive context router. The user's stated goal of "Meta-RAG" aligns with an advanced, industry-proven architecture known as Agentic RAG or Adaptive RAG.1 This architecture moves beyond static retrieval to implement a dynamic workflow that can understand, route, verify, and self-correct—precisely matching Arela's requirements.
Strategic Recommendation: A Hybrid "Build/Buy" Strategy
The optimal path for Arela to achieve its performance goals within the v4.2.0 timeline is a hybrid approach:
"Buy" (Leverage Framework): Adopt LangGraph as the core orchestration framework. Its native support for stateful, cyclic workflows is purpose-built for the required "verify and refine" logic, which is complex to build from scratch.4
"Build" (Custom Components): Develop custom, high-performance nodes within LangGraph that interface directly with Arela's proprietary tri-memory system (Vector, Graph, Governance).
"Local-First" Core: The entire routing, verification, and refinement loop will be powered by a small, fast, local Large Language Model (LLM) (e.g., Llama-3.2-1B or llama3.2:3b-instruct-fp16) deployed via Ollama.6 This satisfies the <500ms overhead, cost, and privacy constraints.
Feasibility and Return on Investment (ROI)
This architecture is production-ready, with mature open-source implementations available.7 The ROI is substantial and directly targets Arela's key objectives:
Quality (Target: 30%+): By intelligently routing queries (e.g., sending procedural "how-to" questions to the Graph Memory) and fusing results, the system will provide vastly more relevant context for complex, non-factual queries.
Hallucination (Target: 50%+): The "Quality Verification" node acts as a guardrail, checking context before it is sent to the final generator.9 This pre-generation check is the primary mechanism for reducing hallucinations, as it prevents the generator from being fed irrelevant or "void" context.10
The Critical Prerequisite: Vector Index Migration
To meet the <500ms latency requirement, the existing 46MB JSON-based "index" must be migrated. A raw JSON file is a data store, not a high-speed index.11 This report outlines a one-time ingestion process to convert this file into a local, file-based FAISS (Facebook AI Similarity Search) vector store.13 This is a non-negotiable step for a production-grade system and is fully compatible with the "local-first" and "no-heavy-database" constraints.
Phased Implementation Plan
A 4-phase plan is proposed to de-risk the implementation for v4.2.0:
Phase 1: Foundation: Build the LangGraph skeleton and the Ollama-based Query Classifier.
Phase 2: Retriever Integration: Implement the FAISS migration and build the three custom retriever nodes for the tri-memory system.
Phase 3: Intelligence: Implement the Reciprocal Rank Fusion (RRF) algorithm and the "verify-and-refine" self-correction loop.
Phase 4: Testing & Optimization: Benchmark the system against a "golden set" of queries using frameworks like RAGAs.15
This architecture provides a clear path to building a significant competitive differentiator, moving Arela's tool from a simple search-bot to a genuine reasoning engine.

2. Technical Deep Dive: Architecting the Adaptive Context Router


2.1. The Evolution: From RAG to Agentic RAG

The term "Meta-RAG" is academically ambiguous, with various papers using it to describe different concepts, such as meta-analysis-based re-ranking 16, "Meta-Knowledge Summaries" for query augmentation 17, or "Meta-Path" retrieval for graph structures.19
Arela's functional requirement—a system that intelligently classifies queries, routes them to different tools, verifies the output, and refines its own strategy—is a textbook example of what the industry and recent research define as Agentic RAG or Adaptive RAG.1
Understanding this distinction is the key to a successful implementation:
Traditional RAG: A static, linear pipeline: Query $\rightarrow$ Retrieve (Top-K) $\rightarrow$ Augment $\rightarrow$ Generate.20 This is Arela's current system, which fails on complex or procedural queries that are not well-served by simple semantic similarity.
Self-RAG: A more advanced RAG that introduces self-reflection and correction within the pipeline.21 It uses special tokens or "critique" nodes to check for relevance, grounding, and answer quality, enabling it to iteratively filter documents or refine its answer.5 This maps to Arela's "Quality Verification" and "Iterative Refinement" requirements.
Agentic RAG: The most advanced form, where an LLM-powered agent acts as the "operating system" for the RAG process. This agent uses cognitive patterns like planning (deciding what to do), tool use (executing retrievals), and reflection (evaluating the results) to dynamically manage a workflow.22
Arela's "Meta-RAG" is an Agentic RAG system. The Query Classifier is the agent's planner. The Strategy Router is the agent's tool-use capability (where the three memories are the "tools"). The Quality Verifier and Iterative Refiner are the agent's reflection and self-correction loops.9
By framing the system this way, we can leverage mature agentic frameworks—specifically LangGraph—instead of building a complex, cyclical state machine from scratch.

2.2. Core Architecture: The LangGraph Adaptive Router

The proposed architecture is a Stateful Graph built using the LangGraph framework.4 LangGraph extends LangChain by allowing for the creation of cyclic graphs, which is essential for the self-correction loop. The system will be composed of Python nodes and conditional edges that operate on a shared GraphState object.
Core Architectural Flow:
Start: A query enters the graph.
classify_query (Node): The query is passed to a small, local Ollama LLM. This node determines the intent and outputs a list of strategies (e.g., ["vector", "graph"]).
route_retrieval (Conditional Edge): This is the main router. Based on the strategy list from the classifier, this edge directs the workflow to one or more retrieval nodes.
retrieve_vector / retrieve_graph / retrieve_audit (Nodes): These three custom nodes run in parallel. Each node is a specialized tool that queries one of Arela's memory systems.
fuse_results (Node): The (potentially heterogeneous) lists of results from the active retrievers are collected. This node uses Reciprocal Rank Fusion (RRF) to merge them into a single, re-ranked list of context.
verify_context (Node): The fused context and the original query are passed to the small Ollama LLM. This "guardrail" node checks for relevance and outputs a JSON object (e.g., {"score": "yes"}).
decide_to_refine (Conditional Edge): This edge checks the output of the verifier and a loop_count in the GraphState.
If score == "yes" $\rightarrow$ END.
If score == "no" AND loop_count < max_iterations $\rightarrow$ reformulate_query.
If score == "no" AND loop_count >= max_iterations $\rightarrow$ END.
reformulate_query (Node): If retrieval failed, this node calls the small Ollama LLM to rewrite the original query (e.g., "how to build" $\rightarrow$ "code examples for").24
Cycle: The reformulate_query node transitions back to route_retrieval, and the process repeats with the new query.
END: The graph finishes, returning the final, verified context and the original query. This payload is now "safe" to send to any large generator LLM (Layer 3) for final answer synthesis.

2.3. Component 1: The Query Classifier (The "Intent" Engine)

This component is the "brain" of the router. It must be fast and accurate.
Requirement: Classify a query into types (Factual, Conceptual, Comparative, Procedural, Temporal) to select the right memory system. Must be <500ms and run locally.
Option 1: Non-LLM (Embedding-Based Routing): This method involves creating "route embeddings"—embedding example phrases for each category (e.g., "how to," "what is," "when did")—and using cosine similarity to match the user's query.25
Pros: Extremely fast, potentially <10ms.
Cons: Brittle. It fails on ambiguous queries. A query like "Why did the 'auth' service change last week and how does it affect the 'payment' service?" is simultaneously Temporal, Conceptual, and Procedural. A simple similarity match will fail to capture this.
Option 2: Small Local LLM (Recommended): This method uses a fast, local LLM in JSON output mode.26
Implementation: Use ChatOllama with Llama-3.2-1B or llama3.2:3b-instruct-fp16.6 The prompt will instruct the model to return a JSON object containing a list of strategies.
Pros: Far more accurate. It can correctly identify ambiguous, multi-strategy queries and return {"strategies": ["graph", "audit", "vector"]}. This flexibility is essential for the system's success.
Cons: Higher latency than embeddings (likely 100-200ms), but this is well within the <500ms budget.
The classifier's output will be based on a schema mapping query types to the memory systems.
Table 1: Query Classification and Routing Schema
Query Type
Description
Example Query
Primary Memory System(s)
Factual
"What is" or "Who is" query.
"What is the 'useAuth' hook?"
Vector Memory
Procedural
"How to" or "Why does" query.
"How do I add a new payment provider?"
Graph Memory
Comparative
"X vs Y" or "difference between."
"What's the difference between the v1 and v2 auth APIs?"
Vector Memory + Graph Memory
Temporal
"When" or "what changed" query.
"What decisions were made about the DB schema last week?"
Governance Memory
Ambiguous
Spans multiple types.
"Why did the 'auth' service change?"
Vector + Graph + Governance


2.4. Component 2: The Strategy Router & Tri-Memory Retrieval

This component executes the plan from the classifier by calling the specialized retriever nodes.
Strategy A: Vector Memory (Dense + Sparse)
The JSON Index Migration: The 46MB JSON file is a critical performance blocker.11 A raw file cannot be queried; it can only be loaded and parsed, which is far too slow for a <500ms target.
Migration Path (One-Time Script):
Write a Python script to parse the 46MB JSON file.
Convert the relevant text content into Document objects (using LangChain or LlamaIndex loaders).13
Use a high-quality local embedding model (e.g., nomic-embed-text-v1.5 7) to create vector embeddings for each document.
Store these embeddings in a local, file-based FAISS index.13 The resulting index.faiss file can be loaded instantly from disk.
Retrieval Node: The retrieve_vector node will load the FAISS index. It is strongly recommended to implement a Hybrid Retriever by also indexing the text with a sparse, keyword-based algorithm like BM25.28 This allows the retriever to match both semantic meaning (e.s., "authentication function") and specific keywords (e.g., "useAuthHook"), which dense retrieval often misses.30
Strategy B: Graph Memory (The Language-Agnostic Core)
Critical Constraint: The "no AST parsing" requirement 31 makes the SQLite Graph Memory the single most important component for handling complex, procedural queries. Without parsing, the system cannot "read" the code structure; it can only read the pre-built graph.
Implementation (Lightweight GraphRAG): This implementation will follow the pattern of "Lightweight GraphRAG with SQLite".33
Schema: The SQLite DB must contain tables like entities (id, name, type, filePath, code_snippet) and relationships (sourceId, targetId, type).33
Meta-Path Retrieval: A full graph traversal is too slow. The solution is to adopt the "Pseudo-Knowledge Graph" (PKG) approach.19 In this model, common, meaningful paths (meta-paths) are pre-calculated and stored as text attributes on the nodes. For example, a function node could have an attribute meta_paths: "called_by: [api_controller_A]; calls:".
Retrieval Node: The retrieve_graph node will not perform complex traversal. Instead, it will use the sqlite-vec extension 33 to perform a semantic vector search directly on the name, code_snippet, and meta_paths text columns of the entities table. This provides the power of GraphRAG (finding nodes based on their relationships) without the computational overhead, perfectly matching the "lightweight" and "no-AST" constraints.
Strategy C: Governance Memory (Temporal)
Implementation: This will be the simplest retriever node. The retrieve_audit function will be a custom Python function that connects to the audit log (likely another SQLite DB or log file) and performs basic SQL LIKE queries for keywords or date-range filters to answer temporal queries.

2.5. Component 3: Heterogeneous Result Fusion

The Problem: The three retrievers (and the hybrid vector retriever) will produce 3-4 ranked lists of documents with completely different and incompatible scoring mechanisms (e.g., cosine similarity, BM25 scores, SQL matches).38
The Solution: Reciprocal Rank Fusion (RRF): RRF is a simple, non-LLM algorithm that is perfectly suited for this task.30 It is score-agnostic; it only uses the rank of each document in each list.
Algorithm: The fuse_results node will implement the RRF formula. For each unique document retrieved, its new score is calculated by summing its score from each list:
$$RRF_{Score}(doc) = \sum_{list \in lists} \frac{1}{k + rank_{list}(doc)}$$
rank_{list}(doc) is the document's position in that retriever's list (e.g., 1st, 2nd, 3rd).
k is a constant (a good default is $k=60$) that diminishes the impact of lower-ranked items.41
This algorithm naturally surfaces documents that are "consistently relevant" across multiple retrieval strategies, providing a highly-fused and reliable context.

2.6. Component 4: The Quality Verifier (The "Guardrail")

This node is the core of the self-correction loop and the primary defense against hallucination.
Objective: Verify if the fused context from the RRF node is actually relevant to the user's query before passing it to the expensive Layer 3 generation LLM.42
Metrics: This node evaluates Context Relevance: "Does the retrieved context contain the information needed to answer the query?".10
Implementation (Small LLM-as-Grader): This node uses the same local Ollama model as the classifier.7
Node: verify_context(state)
Prompt: Given the Query: "{query}" and the Context: "{context}". Does the context contain information to answer the query? Respond with a JSON object: {"score": "yes" | "no", "reason": "..."}.
This check adds minimal latency (e.g., 100-200ms) but is the key to cost-savings and quality. It stops the system from wasting time and money (and risking a hallucination) by sending irrelevant context to a powerful generator. This step is the primary driver for achieving the 50%+ hallucination reduction goal.

2.7. Component 5: The Iterative Refiner (The Self-Correction Loop)

This component activates when the Quality Verifier fails.
Trigger: The verify_context node returns {"score": "no"}.9
Implementation (Query Reformulation): The graph transitions to the reformulate_query node.24
Node: reformulate_query(state)
Prompt: The user asked: "{query}". The last retrieval failed. Reformulate this query to be more specific or to search for a related concept. Respond with a JSON object: {"new_query": "..."}.
The GraphState is updated, and the graph cycles back to the route_retrieval node to try again with the new query.
Stopping Criteria: An un-bounded loop is a production-killer. The system must have strict stopping criteria.48
Quality Threshold: The loop stops if verify_context returns {"score": "yes"}.
Max Iterations: A loop_count is added to the GraphState. The loop is hard-limited to a max_iterations = 1 (i.e., one initial pass, one refinement). This bounds the worst-case routing latency and prevents infinite loops, striking a balance between accuracy and performance.

3. Implementation Plan (Phased Rollout for v4.2.0)

This plan is designed for a phased, agile rollout to integrate the Adaptive Context Router by v4.2.0.

Phase 1: Foundation (Classifier & Router Scaffolding)

Timeline: 3 Days
Objective: Build the core LangGraph skeleton and the "brain" of the router.
Tasks:
Setup Environment: Initialize the project with langchain, langgraph, ollama, faiss-cpu, langchain-nomic (for embeddings), and scikit-learn (for BM25).7
Define GraphState: Create the Python TypedDict for the GraphState.7 This state must include question, classified_strategies (list), retrieved_docs (dict of lists), fused_docs (list), verification_score (str), and loop_count (int).
Build Classifier Node: Implement the classify_query node using ChatOllama with llama3.2:3b-instruct-fp16.7 Prompt it to return JSON matching the schema in Table 1.
Stub Retrievers: Create placeholder functions for retrieve_vector, retrieve_graph, and retrieve_audit that return mock data.
Build Graph Skeleton: Assemble the StateGraph, set the conditional entry point (route_question), and connect the nodes, allowing the graph to run (but not retrieve real data).

Phase 2: Retriever Integration (The Tri-Memory Connectors)

Timeline: 5 Days
Objective: Connect the router to the three live memory systems.
Tasks:
Vector Memory (Migration): Write the one-time ingestion script. Load the 46MB JSON, chunk the text, generate embeddings (e.g., NomicEmbeddings 7), and save the index.faiss file and a docstore.json (for ID-to-text mapping).13
Vector Memory (Node): Implement the retrieve_vector node. This node will load the FAISS index, initialize a BM25Retriever on the texts, and perform a hybrid search.
Graph Memory (Node): Implement the retrieve_graph node. Use Python's sqlite3 library to connect to the existing graph DB.51 Implement the semantic search query using sqlite-vec functions on the node/meta-path text descriptions.33
Governance Memory (Node): Implement the retrieve_audit node using sqlite3 to perform LIKE and date-range queries on the audit log.

Phase 3: Intelligence (Fusion, Verification & Refinement)

Timeline: 4 Days
Objective: Implement the self-correction and fusion logic that makes the system "smart."
Tasks:
Implement Fusion: Create the fuse_results node. Implement the Reciprocal Rank Fusion (RRF) algorithm in pure Python (see Section 5.4 for code).41
Implement Verifier: Build the verify_context node, calling the same small Ollama model used in Phase 1.7
Implement Refiner: Build the reformulate_query node.24
Wire the Loop: Implement the final conditional edge, decide_to_refine. This function will check the verification_score and loop_count from the GraphState to route to reformulate_query or END, enforcing the max_iterations = 1 stopping criteria.50

Phase 4: Testing & Optimization

Timeline: 3 Days
Objective: Validate performance, accuracy, and latency against benchmarks.
Tasks:
Generate Test Dataset: A high-quality test set is non-negotiable for evaluation. Use a framework like RAGAs' TestsetGenerator 52 or a custom script 53 to generate a "golden set" of 100+ (query, expected_context, expected_answer) triplets from the codebase. This dataset must include procedural, comparative, and temporal queries.
Benchmark Router Accuracy: Evaluate the classify_query node against the golden set. The metric is "Percent of queries where the correct retrieval strategy (or strategies) was selected." Target >85%.54
Benchmark End-to-End RAG: Use a framework like RAGAs 15 or DeepEval 55 to measure the full pipeline. The key metrics are:
Context Relevance: (Are the retrieved chunks relevant?) 10
Faithfulness: (Does the answer stick to the context?) 44
Answer Relevance: (Does the answer address the query?) 10
Latency Profiling: Profile each node (classifier, retriever, verifier) on a standard developer laptop. Optimize any step exceeding its budget and confirm the total routing overhead (all steps except generation) is <500ms.

4. Comparative Analysis & Strategic Decisions


4.1. Build (Custom) vs. Buy (Frameworks): LlamaIndex vs. LangGraph

A common decision point is choosing between LlamaIndex and LangChain/LangGraph. While the frameworks are converging, their core philosophies are different and have direct implications for Arela.
LlamaIndex: Excels as a "data framework".56 Its primary strength is in building sophisticated data ingestion and retrieval pipelines.57 It provides numerous advanced indexing strategies (e.g., hierarchical, graph) "out-of-the-box".58 It is best suited for scenarios where the main challenge is getting data out of complex sources.
LangChain/LangGraph: Excels as an "agent framework".59 Its primary strength is in orchestrating agentic workflows.4 LangGraph, specifically, is a library for building stateful, multi-agent applications that can cycle and self-correct. It is built for complex reasoning paths, not just complex data sources.
Arela's core problem is not ingestion (the tri-memory system is a given). The problem is the reasoning path: "classify, route to 3 custom tools, fuse, verify, and loop."
LangGraph is the superior tool for this specific task because its StateGraph model maps 1:1 with the required Adaptive RAG architecture.5 LlamaIndex can build agents, but LangGraph is purpose-built for the robust, cyclic, stateful logic Arela requires.
Recommendation: Use LangGraph for the top-level agentic orchestration. Use components from langchain-community (e.g., document loaders, text splitters, Ollama integration) as the "parts" inside the LangGraph nodes.
Table 2: Framework Comparison for Arela's Use Case

Feature
LlamaIndex
LangGraph (LangChain)
Recommendation
Core Metaphor
Data Index / Query Engine 56
State Machine / Agent
LangGraph
Self-Correction Loops
Possible, but less natural.
Native. Designed for cycles.5
LangGraph
Tri-Memory Integration
Good. Custom tools possible.
Excellent. Full control over custom nodes.
LangGraph
Ollama/Local Support
Good.57
Excellent.4
Tie
Control vs. Simplicity
More high-level APIs (simpler).
More low-level control (more powerful).
LangGraph


4.2. Local Models (Ollama) vs. Cloud APIs (GPT-4)

This architecture does not force a choice; it enables a hybrid system that uses the right model for the right task.
Layer 1 (Router/Verifier): Must be a Small Local Model.
The tasks of classification and yes/no verification are simple. They do not require a massive model.
Models like Llama-3.2-1B 6, llama3.2:3b-instruct-fp16 7, or Cohere's Command-R 61 are ideal. Command-R is particularly noteworthy as it is specifically optimized for RAG, tool use, and citations.62
Using an Ollama-served model for these "micro-tasks" is the only way to meet the <500ms latency, <$0.01 cost, and local-first/privacy constraints. A round-trip to a cloud API for each verification step would be prohibitively slow and expensive.
Layer 3 (Generator): Use Any Model.
The Adaptive Context Router is model-agnostic. Its final output (the fused_docs) can be sent to any generator: a large local model (Llama-3.1-70B) for full privacy or a powerful cloud API (GPT-4o, Claude 3 Opus) for maximum quality.
This hybrid approach provides the "best of both worlds": fast, cheap, private routing combined with high-quality, powerful generation.

4.3. The JSON Index Constraint: A Non-Negotiable Migration

The requirement to "work with existing JSON-based RAG index" must be clarified. As noted, a 46MB JSON file is not an index.11
The Problem: Any attempt to "work with" the raw file (e.g., loading 46MB into memory, chunking, and embedding per-query) will fail the <500ms latency goal by orders of magnitude.
The Solution: The "local-first" constraint does not mean "raw-file-only." It means "no external server dependency."
The Migration Path: The Phase 2 implementation plan includes a one-time ingestion script. This script will run once, parse the JSON, create embeddings, and save a local index.faiss file.13
On all subsequent runs, the retrieve_vector node will simply load this file from the developer's local disk. This is instantaneous and has no network dependency.
This approach is the only architecturally sound way to provide high-speed semantic search on local, file-based data.

5. Core Code Implementations (Python/LangGraph)

This section provides key Python code examples to serve as a blueprint for the implementation.

5.1. Example 1: The LangGraph StateGraph Definition

This code defines the shared state and the graph. This is the core of the Adaptive RAG system.7

Python


import operator
from typing import TypedDict, List, Dict, Annotated

from langchain_core.messages import BaseMessage

# The GraphState is the shared memory for all nodes
class GraphState(TypedDict):
    question: str
    classified_strategies: List[str]
    retrieved_docs: Dict[str, List[dict]] # Stores results per-retriever
    fused_docs: List[dict]
    generation: str
    verification_score: str
    # 'messages' is for the final generation step (not router)
    messages: Annotated, operator.add]
    # 'loop_count' is the critical stopping criteria
    loop_count: int
    
# (Node and edge functions: classify_query, retrieve_vector, etc. defined here)

# Initialize the graph
workflow = StateGraph(GraphState)

# Add all nodes
workflow.add_node("classify_query", classify_query_node)
workflow.add_node("retrieve_vector", retrieve_vector_node)
workflow.add_node("retrieve_graph", retrieve_graph_node)
workflow.add_node("retrieve_audit", retrieve_audit_node)
workflow.add_node("fuse_results", fuse_results_node)
workflow.add_node("verify_context", verify_context_node)
workflow.add_node("reformulate_query", reformulate_query_node)

# Set the entry point
workflow.set_entry_point("classify_query")

# Add conditional edges for the main router
workflow.add_conditional_edges(
    "classify_query",
    route_retrieval, # A function that checks state['classified_strategies']
    {
        "vector": "retrieve_vector",
        "graph": "retrieve_graph",
        "audit": "retrieve_audit",
        "fuse": "fuse_results" # For multi-strategy
    }
)

# Connect retrievers to the fusion step
workflow.add_edge("retrieve_vector", "fuse_results")
workflow.add_edge("retrieve_graph", "fuse_results")
workflow.add_edge("retrieve_audit", "fuse_results")

# This is the self-correction loop
workflow.add_edge("fuse_results", "verify_context")
workflow.add_conditional_edges(
    "verify_context",
    decide_to_refine, # Checks 'verification_score' and 'loop_count'
    {
        "refine": "reformulate_query",
        "end": END
    }
)
workflow.add_edge("reformulate_query", "classify_query") # Cycle back

# Compile the graph
app = workflow.compile()



5.2. Example 2: The Query Classifier Node (Ollama)

This node uses a small local LLM with Pydantic/JSON output to get structured data.7

Python


from langchain_ollama.chat_models import ChatOllama
from langchain_core.pydantic_v1 import BaseModel, Field

# Define the structured output
class QueryStrategies(BaseModel):
    """The retrieval strategies for a given query."""
    strategies: List[str] = Field(..., description="List of strategies from [vector, graph, audit].")

# Initialize the local LLM in JSON mode
local_llm = ChatOllama(
    model="llama3.2:3b-instruct-fp16",
    format="json",
    temperature=0
)

structured_llm = local_llm.with_structured_output(QueryStrategies)

CLASSIFIER_PROMPT = """
You are an expert at routing a user's query about a software codebase.
Classify the query into one or more of the following retrieval strategies:
- 'vector': For factual or conceptual questions. (e.g., "What is React?")
- 'graph': For procedural or structural questions. (e.g., "How does auth work?")
- 'audit': For temporal questions about changes. (e.g., "What changed last week?")

Return a list of all strategies that are relevant.
Query: {question}
"""

def classify_query_node(state: GraphState):
    """Classifies the query and updates the state."""
    question = state["question"]
    prompt = CLASSIFIER_PROMPT.format(question=question)
    
    # Call the LLM for structured output
    result = structured_llm.invoke(prompt)
    
    return {
        "classified_strategies": result.strategies,
        "loop_count": 0 # Initialize loop count
    }



5.3. Example 3: Custom SQLite GraphRAG Retriever (Pseudocode)

This node connects to the SQLite DB and uses sqlite-vec for semantic search on graph nodes.33

Python


import sqlite3
# Assume 'sqlite_vec' is registered with the connection

def retrieve_graph_node(state: GraphState):
    """Performs semantic search on the SQLite graph nodes."""
    if "graph" not in state["classified_strategies"]:
        return {"retrieved_docs": {**state.get("retrieved_docs", {}), "graph":}}

    question = state["question"]
    
    # This query uses the sqlite-vec extension to find the top 5 entities
    # whose 'semantic_description' (e.g., node name + meta-paths)
    # is most similar to the query embedding.
    QUERY_SQL = """
    SELECT 
        e.id, 
        e.name, 
        e.filePath, 
        e.code_snippet, 
        v.distance
    FROM vec_entities v
    JOIN entities e ON e.id = v.rowid
    WHERE v.semantic_description MATCH?
    ORDER BY v.distance
    LIMIT 5;
    """
    
    # 1. Generate embedding for the question (using the same local model)
    # query_embedding = embed_model.embed_query(question)
    
    # 2. Connect to the DB and execute the query
    # conn = sqlite3.connect("arela_graph.db")
    # cursor = conn.cursor()
    # results = cursor.execute(QUERY_SQL, (query_embedding,)).fetchall()
    # conn.close()
    
    # 3. Format results as documents
    # graph_docs = [
    #    {"id": row, "content": f"{row} in {row}: {row}", "rank": i} 
    #    for i, row in enumerate(results)
    # ]

    # (Mock data for example)
    graph_docs = [{"id": "g1", "content": "function: useAuth, path: /auth/hook.js", "rank": 1}]

    return {"retrieved_docs": {**state.get("retrieved_docs", {}), "graph": graph_docs}}



5.4. Example 4: Reciprocal Rank Fusion (RRF) Function

This is a pure Python function to implement the fuse_results node. It is fast, simple, and requires no LLM.41

Python


def reciprocal_rank_fusion(list_of_ranked_lists: List[List[dict]], k: int = 60):
    """
    Performs RRF on a list of retrieval results.
    Assumes each item in the inner lists is a dict with 'id' and 'content'.
    """
    scores = {}
    doc_store = {}

    # Iterate through each retriever's list
    for ranked_list in list_of_ranked_lists:
        for i, doc in enumerate(ranked_list):
            doc_id = doc['id']
            rank = i + 1
            
            if doc_id not in scores:
                scores[doc_id] = 0
                doc_store[doc_id] = doc['content'] # Store content once
            
            # Add the RRF score
            scores[doc_id] += 1.0 / (k + rank)

    # Sort by the final RRF score
    sorted_doc_ids = sorted(scores.keys(), key=lambda id: scores[id], reverse=True)
    
    # Create the final, fused document list
    fused_docs = [
        {"id": doc_id, "content": doc_store[doc_id], "score": scores[doc_id]}
        for doc_id in sorted_doc_ids
    ]
    return fused_docs

def fuse_results_node(state: GraphState):
    """Fuses all retrieved documents using RRF."""
    all_lists = [v for v in state["retrieved_docs"].values() if v]
    fused = reciprocal_rank_fusion(all_lists)
    
    # Format for the verifier
    context_for_verifier = "\n\n---\n\n".join(
       }):\n{doc['content']}" for i, doc in enumerate(fused[:5])]
    )
    
    return {
        "fused_docs": fused,
        "fused_context_string": context_for_verifier # Pass clean context
    }



5.5. Example 5: The Quality Verifier & Conditional Edge

This code implements the "verify" node and the conditional logic ("decide") that enables the self-correction loop.7

Python


# Use the same local_llm from the classifier
# local_llm = ChatOllama(model="llama3.2:3b-instruct-fp16", format="json", temperature=0)

VERIFIER_PROMPT = """
You are a relevance grader. Given a Query and a Context,
respond with a JSON object with two keys:
1. "score": "yes" if the context is relevant, "no" if it is not.
2. "reason": A brief one-sentence explanation.

Query: {question}

Context:
{context}
"""

def verify_context_node(state: GraphState):
    """Verifies the relevance of the fused context."""
    question = state["question"]
    context = state["fused_context_string"]
    
    prompt = VERIFIER_PROMPT.format(question=question, context=context)
    
    # Call the LLM
    # result_json = llm.invoke(prompt).content
    # score = json.loads(result_json).get("score", "no")
    
    # (Mock data for example)
    score = "yes" # Assume it passed for this example
    
    return {
        "verification_score": score,
        "loop_count": state["loop_count"] + 1
    }

def decide_to_refine(state: GraphState):
    """The conditional edge that decides to loop or end."""
    score = state["verification_score"]
    count = state["loop_count"]
    
    # Hard limit of 1 refinement (loop_count will be 2)
    MAX_ITERATIONS = 2
    
    if score == "yes":
        return "end"
    elif count < MAX_ITERATIONS:
        return "refine" # Triggers the reformulation node
    else:
        return "end" # Max iterations reached, stop anyway



6. Risk Assessment & Mitigation Strategies


Risk 1: Classifier Inaccuracy

Problem: The classify_query node (Section 2.3) mis-classifies a query, sending a "procedural" query to the "vector" memory, resulting in poor context.
Mitigation: Multi-Strategy Routing and RRF. This architecture is resilient to classifier errors. The classifier is designed to output a list of strategies, not a single one. For any ambiguous query, it should be prompted to return ["vector", "graph"]. The Reciprocal Rank Fusion (RRF) node (Section 2.5) is the built-in mitigation. If the vector retriever returns 5 irrelevant documents, they will all have low ranks. When the graph retriever returns 5 highly relevant documents, the RRF algorithm will naturally place them at the top of the fused list.

Risk 2: Latency Overhead & Infinite Loops

Problem: The self-correction loop (Section 2.7) adds too much latency, violating the <500ms overhead target, or gets stuck in a "reformulation-failure" cycle.48
Mitigation: Strict Stopping Criteria. The implementation in Section 5.5 includes two hard criteria.50 The loop is terminated if:
The verify_context node succeeds.
A hard max_iterations limit is reached (e.g., 1 refinement).
This bounds the worst-case latency. If one pass (classify + retrieve + fuse + verify) takes ~400ms, the worst-case single-refinement loop will be <1s, which is acceptable for a "hard" query.

Risk 3: "No-AST" Graph Quality

Problem: The language-agnostic graph (built from Infomap, file imports, etc.) is low-fidelity. It may not capture the true structural dependencies (e.g., a specific function call), leading to poor retrieval for procedural queries.
Mitigation: Semantic Meta-Path Search. This architecture mitigates this risk by not relying on graph traversal. By adopting the "Pseudo-Knowledge Graph" approach (Section 2.437) and pre-storing meta-paths as text, the system leans on the strength of the semantic search (via sqlite-vec 33). The query "how does auth work" is semantically close to a node's text description "function: 'verifyToken', calls:", even if the graph itself is sparse.

Risk 4: Total Retrieval Failure

Problem: The user asks a query (e.g., "how to use the new 'XYZ' feature") that is not in any memory system. The classifier works, the retrievers find nothing, the verifier fails, the refiner tries, and the second pass also fails.64
Mitigation: Graceful Fallback at the Generation Layer. This is a failure mode the router must support. In this scenario, the decide_to_refine edge will hit max_iterations and route to END. The GraphState will contain an empty fused_docs list. The final (Layer 3) generator LLM must have a system prompt robustly designed to handle this: "You are an AI assistant. Answer the user's query using only the provided context. If no context is provided, state that you do not have information on that topic in the current codebase." This prevents a "void" hallucination and correctly reports the failure to the user.

7. References


Key Academic Papers

**** Agentic Retrieval-Augmented Generation (Agentic RAG): A survey defining the core principles of using autonomous AI agents with agentic design patterns (reflection, planning, tool use) to dynamically manage retrieval strategies and refine contextual understanding.
21
Self-RAG: Learning to retrieve, generate, and critique through self-reflection: The foundational paper on "Self-RAG," which introduces the concept of a "critique" or "verification" step within the RAG pipeline to assess retrieval quality and generation grounding, enabling iterative self-correction.
17
Data-centric RAG workflow with Meta Knowledge Summary (MK Summary): An academic paper (arXiv:2408.09017) describing a "prepare-then-rewrite" RAG framework where "Meta Knowledge Summaries" are generated from document clusters to guide query augmentation.
19
Pseudo-Knowledge Graph: Meta-Path Guided Retrieval and In-Graph Text for RAG-Equipped LLM (arXiv:2503.00309): Defines "meta-path retrieval" where graph paths are pre-computed and stored as node attributes, allowing for efficient, lightweight relational reasoning without complex traversal.
48
Iterative RAG and Stopping Criteria (arXiv:2510.14337): A paper on "Stop-RAG" that casts iterative retrieval as a Markov decision process, motivating the need for intelligent stopping criteria (e.g., max iterations, quality thresholds) to balance latency and accuracy.

Key Implementation Guides and Frameworks

3
LangGraph Framework: The core open-source library (from LangChain) for building stateful, multi-agent applications. Its support for cycles is essential for implementing the "verify-and-refine" loop.
7
Local Adaptive RAG with LangGraph and LLaMA3: A key tutorial demonstrating the exact "Adaptive RAG" pattern (routing, fallback, self-correction) using LangGraph and a local Ollama model (llama3.2).
9
Self-RAG Implementation with LangGraph: A guide from DataCamp on building the Self-RAG architecture (retrieve, grade documents, generate, check hallucinations) using LangGraph's state machine.
8
Agentic RAG for Dummies (GitHub): An open-source implementation of an Agentic RAG system using LangGraph, conversation memory, and human-in-the-loop clarification, with support for Ollama.
33
Lightweight GraphRAG with SQLite: A set of articles and implementations demonstrating how to build a GraphRAG system using a simple SQLite database (without heavy graph DBs) and the sqlite-vec extension for semantic search on nodes.
30
Reciprocal Rank Fusion (RRF): A standard, score-agnostic algorithm for fusing multiple ranked retrieval lists. Used by hybrid search engines to combine dense (semantic) and sparse (keyword) results.
6
Llama 3.2 1B Model: Documentation for Meta's lightweight 1-billion parameter model, suitable for on-device, low-latency tasks such as classification and summarization, making it ideal for the router/verifier nodes.
61
Cohere Command-R & R+ Models: A family of models available via Ollama that are specifically optimized for production RAG and tool-use tasks, including advanced RAG with citations.
13
FAISS (Facebook AI Similarity Search): A library for efficient, local, file-based similarity search, enabling the migration of the JSON index to a high-speed local vector store.
10
RAG Evaluation (RAGAs): An open-source framework (RAGAs) and collection of best practices for evaluating RAG pipelines, focusing on metrics like Context Relevance, Faithfulness, and Answer Relevance.
52
RAG Testset Generation: Documentation for synthetically generating "golden set" evaluation datasets for RAG systems from existing documents.
Works cited
[2501.09136] Agentic Retrieval-Augmented Generation: A Survey on Agentic RAG - arXiv, accessed on November 14, 2025, https://arxiv.org/abs/2501.09136
A tutorial on building local agent using LangGraph, LLaMA3 and Elasticsearch vector store from scratch, accessed on November 14, 2025, https://www.elastic.co/search-labs/blog/local-rag-agent-elasticsearch-langgraph-llama3
LlamaIndex vs LangGraph: How are They Different? - ZenML Blog, accessed on November 14, 2025, https://www.zenml.io/blog/llamaindex-vs-langgraph
Local Agentic RAG with LangGraph and Llama 3.2 | by Zilliz | Medium, accessed on November 14, 2025, https://medium.com/@zilliz_learn/local-agentic-rag-with-langgraph-and-llama-3-2-257b73b0511d
Conceptual guide | 🦜️ Langchain, accessed on November 14, 2025, https://js.langchain.com/v0.2/docs/concepts/
Llama 3.2: Revolutionizing edge AI and vision with open, customizable models - Meta AI, accessed on November 14, 2025, https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/
Langgraph adaptive rag local - GitHub Pages, accessed on November 14, 2025, https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_adaptive_rag_local/
GiovanniPasq/agentic-rag-for-dummies: A minimal Agentic ... - GitHub, accessed on November 14, 2025, https://github.com/GiovanniPasq/agentic-rag-for-dummies
Self-Rag: A Guide With LangGraph Implementation | DataCamp, accessed on November 14, 2025, https://www.datacamp.com/tutorial/self-rag
Evaluate the reliability of Retrieval Augmented Generation applications using Amazon Bedrock | Artificial Intelligence, accessed on November 14, 2025, https://aws.amazon.com/blogs/machine-learning/evaluate-the-reliability-of-retrieval-augmented-generation-applications-using-amazon-bedrock/
Indexing json Files : r/Rag - Reddit, accessed on November 14, 2025, https://www.reddit.com/r/Rag/comments/1fie5ge/indexing_json_files/
How to approach JSON based RAG - DeepLearning.AI Community, accessed on November 14, 2025, https://community.deeplearning.ai/t/how-to-approach-json-based-rag/508547
Build a JSON-Based RAG Pipeline with FAISS & OpenAI — Step-by ..., accessed on November 14, 2025, https://www.youtube.com/watch?v=T17G-KewCb4
Need help in converting json to nodes and store in FAISS vector database · run-llama llama_index · Discussion #15715 - GitHub, accessed on November 14, 2025, https://github.com/run-llama/llama_index/discussions/15715
Evaluating RAG Applications with RAGAs | by Leonie Monigatti | TDS Archive - Medium, accessed on November 14, 2025, https://medium.com/data-science/evaluating-rag-applications-with-ragas-81d67b0ee31a
[2510.24003] META-RAG: Meta-Analysis-Inspired Evidence-Re-Ranking Method for Retrieval-Augmented Generation in Evidence-Based Medicine - arXiv, accessed on November 14, 2025, https://arxiv.org/abs/2510.24003
Meta Knowledge for Retrieval Augmented Large Language Models, accessed on November 14, 2025, https://arxiv.org/abs/2408.09017
Meta Knowledge for Retrieval Augmented Large Language Models - arXiv, accessed on November 14, 2025, https://arxiv.org/html/2408.09017v1
arxiv.org, accessed on November 14, 2025, https://arxiv.org/html/2503.00309v1
RAG (Retrieval Augmented Generation) on Databricks, accessed on November 14, 2025, https://docs.databricks.com/aws/en/generative-ai/retrieval-augmented-generation
Towards Agentic RAG with Deep Reasoning: A Survey of RAG-Reasoning Systems in LLMs - arXiv, accessed on November 14, 2025, https://arxiv.org/pdf/2507.09477
Reasoning RAG via System 1 or System 2: A Survey on Reasoning Agentic Retrieval-Augmented Generation for Industry Challenges - arXiv, accessed on November 14, 2025, https://arxiv.org/html/2506.10408v1
Retrieval-Augmented Generation (RAG): | BEKO Solutions, accessed on November 14, 2025, https://beko-solutions.si/wp-content/uploads/2025/07/BEKO-Insights_RAG-Systems-Whitepaper_Final.pdf
Retrieval-Augmented Generation: A Comprehensive Survey of Architectures, Enhancements, and Robustness Frontiers - arXiv, accessed on November 14, 2025, https://arxiv.org/html/2506.00054v1
Embedding-based Routing (EBR) - Agentic Design | Agentic Design ..., accessed on November 14, 2025, https://agentic-design.ai/patterns/routing/embedding-based-routing
Improve Retrieval Augmented Generation Through Classification | A-CX, accessed on November 14, 2025, https://www.a-cx.com/improving-retrieval-augmented-generation/
RAG – How I moved from Re-ranking to Classifier-based Filtering - Reddit, accessed on November 14, 2025, https://www.reddit.com/r/Rag/comments/1f3b4sc/rag_how_i_moved_from_reranking_to_classifierbased/
Types of Retrieval in RAG - Medium, accessed on November 14, 2025, https://medium.com/@upadhya.saumya/types-of-retrieval-in-rag-bb4e4a914e7c
Top 3 RAG Retrieval Strategies: Sparse, Dense, & Hybrid Explained - YouTube, accessed on November 14, 2025, https://www.youtube.com/watch?v=r0Dciuq0knU
Advanced RAG Techniques for High-Performance LLM Applications ..., accessed on November 14, 2025, https://neo4j.com/blog/genai/advanced-rag-techniques/
Why don't we store the syntax tree instead of the source code?, accessed on November 14, 2025, https://softwareengineering.stackexchange.com/questions/119095/why-dont-we-store-the-syntax-tree-instead-of-the-source-code
AST Enables Code RAG Models to Overcome Traditional Chunking Limitations - Medium, accessed on November 14, 2025, https://medium.com/@jouryjc0409/ast-enables-code-rag-models-to-overcome-traditional-chunking-limitations-b0bc1e61bdab
Code Graph RAG by er77: An AI Engineer's Deep Dive - Skywork.ai, accessed on November 14, 2025, https://skywork.ai/skypage/en/code-graph-ai-engineer/1977920346872287232
How to Build Lightweight GraphRAG with SQLite - DEV Community, accessed on November 14, 2025, https://dev.to/stephenc222/how-to-build-lightweight-graphrag-with-sqlite-53le
Stephen Collins - Medium, accessed on November 14, 2025, https://medium.com/@stephenc211
Pseudo-Knowledge Graphs for Better RAG | by Devashish Datt Mamgain - Towards AI, accessed on November 14, 2025, https://pub.towardsai.net/pseudo-knowledge-graphs-for-better-rag-447e4d477f79
Pseudo-Knowledge Graph: Meta-Path Guided Retrieval and ... - arXiv, accessed on November 14, 2025, https://arxiv.org/abs/2503.00309
[2509.02837] HF-RAG: Hierarchical Fusion-based RAG with Multiple Sources and Rankers - arXiv, accessed on November 14, 2025, https://www.arxiv.org/abs/2509.02837
Using a Knowledge Graph to Implement a RAG Application - DataCamp, accessed on November 14, 2025, https://www.datacamp.com/tutorial/knowledge-graph-rag
Hybrid Retrieval in RAG: Going Beyond Vector Search for Actionable Results | Medium, accessed on November 14, 2025, https://medium.com/@clearmindrocks/hybrid-retrieval-in-rag-going-beyond-vector-search-for-actionable-results-940be6036435
Implementing Reciprocal Rank Fusion (RRF) in Python, accessed on November 14, 2025, https://safjan.com/implementing-rank-fusion-in-python/
Retrieval Augmented Generation (RAG) for LLMs - Prompt Engineering Guide, accessed on November 14, 2025, https://www.promptingguide.ai/research/rag
A complete guide to RAG evaluation: metrics, testing and best practices - Evidently AI, accessed on November 14, 2025, https://www.evidentlyai.com/llm-guide/rag-evaluation
RAG Evaluation Metrics: Best Practices for Evaluating RAG Systems - Patronus AI, accessed on November 14, 2025, https://www.patronus.ai/llm-testing/rag-evaluation-metrics
Evaluation of Retrieval-Augmented Generation: A Survey - arXiv, accessed on November 14, 2025, https://arxiv.org/html/2405.07437v2
The Ultimate Guide to Agentic RAG | by Pawan Kumar - Medium, accessed on November 14, 2025, https://pawan-kumar94.medium.com/the-ultimate-guide-to-agentic-rag-e3cc1e94804e
Advanced RAG: Architecture, Techniques, Applications and Use Cases and Development, accessed on November 14, 2025, https://www.leewayhertz.com/advanced-rag/
[2510.14337] Stop-RAG: Value-Based Retrieval Control for Iterative ..., accessed on November 14, 2025, https://www.arxiv.org/abs/2510.14337
New stopping criteria for iterative root finding - PubMed, accessed on November 14, 2025, https://pubmed.ncbi.nlm.nih.gov/26064544/
Closed Loop Retrieval-Augmented Generation (RAG) for Content-based Recommendations in E-commerce - Lund University Publications, accessed on November 14, 2025, https://lup.lub.lu.se/student-papers/record/9208151/file/9208153.pdf
A Beginner's Guide to SQLite: The Lightweight Database Solution, accessed on November 14, 2025, https://stephencollins.tech/posts/beginners-guide-to-sqlite
Generate Synthetic Testset for RAG - Ragas, accessed on November 14, 2025, https://docs.ragas.io/en/stable/getstarted/rag_testset_generation/
Generate synthetic data for evaluating RAG systems using Amazon Bedrock, accessed on November 14, 2025, https://aws.amazon.com/blogs/machine-learning/generate-synthetic-data-for-evaluating-rag-systems-using-amazon-bedrock/
An Overview on RAG Evaluation | Weaviate, accessed on November 14, 2025, https://weaviate.io/blog/rag-evaluation
Extensive Research into Knowledge Graph Traversal Algorithms for LLMs : r/Rag - Reddit, accessed on November 14, 2025, https://www.reddit.com/r/Rag/comments/1ok8mjr/extensive_research_into_knowledge_graph_traversal/
LangChain vs LlamaIndex (2025) – Which One is Better? - Database Mart, accessed on November 14, 2025, https://www.databasemart.com/blog/langchain-vs-llamaindex
Question-Answering (RAG) | LlamaIndex Python Documentation, accessed on November 14, 2025, https://developers.llamaindex.ai/python/framework/use_cases/q_and_a/
Agents | LlamaIndex Python Documentation, accessed on November 14, 2025, https://developers.llamaindex.ai/python/framework/use_cases/agents/
Llamaindex vs Langchain: What's the difference? - IBM, accessed on November 14, 2025, https://www.ibm.com/think/topics/llamaindex-vs-langchain
Introducing Llama 3.2 models from Meta in Amazon Bedrock: A new generation of multimodal vision and lightweight models | AWS News Blog, accessed on November 14, 2025, https://aws.amazon.com/blogs/aws/introducing-llama-3-2-models-from-meta-in-amazon-bedrock-a-new-generation-of-multimodal-vision-and-lightweight-models/
command-r - Ollama, accessed on November 14, 2025, https://ollama.com/library/command-r
command-r-plus - Ollama, accessed on November 14, 2025, https://ollama.com/library/command-r-plus
Command-R is scary good at RAG tasks : r/LocalLLaMA - Reddit, accessed on November 14, 2025, https://www.reddit.com/r/LocalLLaMA/comments/1c29e7w/commandr_is_scary_good_at_rag_tasks/
RAG: Fundamentals, Challenges, and Advanced Techniques | Label Studio, accessed on November 14, 2025, https://labelstud.io/blog/rag-fundamentals-challenges-and-advanced-techniques/
RAG Failure Points and Optimization Strategies: A Deep Dive | by Ajay Verma | Medium, accessed on November 14, 2025, https://medium.com/@ajayverma23/rag-failure-points-and-optimization-strategies-a-deep-dive-b39ceb7d11c5
Stop-RAG: Value-Based Retrieval Control for Iterative RAG - arXiv, accessed on November 14, 2025, https://arxiv.org/html/2510.14337v1
Relevance scoring in hybrid search using Reciprocal Rank Fusion (RRF) - Microsoft Learn, accessed on November 14, 2025, https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking
Fine-tuning Llama 3.2 and Using It Locally: A Step-by-Step Guide | DataCamp, accessed on November 14, 2025, https://www.datacamp.com/tutorial/fine-tuning-llama-3-2
