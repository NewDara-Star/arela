# **Investigation Enforcement for Agentic AI: Architecting the Path of Least Resistance in Arela v5**

## **Executive Summary**

The rapid evolution of Large Language Models (LLMs) from passive code completion tools to autonomous "agentic" engineers has introduced a critical, systemic failure mode in software development workflows: the propensity for "vibe coding." This phenomenon, characterized by heuristic-driven pattern matching, heuristic shortcuts, and a distinct lack of rigorous root cause analysis, threatens the integrity of automated codebases. As agents move from demonstration environments to production engineering, the "lazy agent" problem—where models prioritize the statistical probability of a solution token over the logical necessity of an investigation step—has become the primary bottleneck to reliability.  
This research report presents a comprehensive architectural specification for Arela v5, designed to remediate this pathology not through passive instruction, but through programmatic enforcement. We propose a paradigm shift from "Prompt Engineering" to "Protocol Engineering." By leveraging the Model Context Protocol (MCP) as a middleware control layer, we architect a system where the "investigation rule" is transformed from a text-based suggestion into a hard, blocking gate within the agent's execution environment.  
The core thesis of this report is that compliance with investigation protocols must become the path of least resistance for the agent. If the toolchain physically prevents code modification until a hypothesis is registered and verified, the agent's utility function—which seeks task completion—aligns with the engineer's requirement for correctness. We analyze the cognitive architectures of "System 2" reasoning, review the state of the art in Constitutional AI and MCP tool gating, and provide a detailed implementation roadmap for embedding these constraints directly into the agent's operational loop.

## ---

**1\. The Crisis of "Vibe Coding": Pathology of Agentic Failure**

The deployment of coding agents such as Devin, OpenDevin, and custom implementations using Claude 3.5 Sonnet or GPT-4o has shifted the bottleneck in software development from typing speed to verification speed. While these agents demonstrate impressive capabilities in generating boilerplate and solving contained problems, they frequently exhibit specific behavioral pathologies when confronted with novel, complex, or systemic bugs. This section analyzes the root causes of these failures, often colloquially termed "vibe coding," and establishes the necessity for a rigid, architectural intervention.

### **1.1 The Probability Trap: Why Agents Shortcut**

Large Language Models are, fundamentally, prediction engines trained to minimize perplexity. They operate on a probabilistic basis, predicting the next token based on the statistical likelihood derived from their training corpus. This architecture creates a "Final Draft Bias." In the vast corpus of training data—spanning GitHub repositories, StackOverflow threads, and technical documentation—the *solution* to a problem appears vastly more frequently than the *failed attempts*, *internal reasoning*, and *investigative steps* that led to it.  
Consequently, when an agent is presented with a bug report or an error log, the statistical probability of generating a fix code block immediately is significantly higher than the probability of generating a sequence of investigative tool calls.1 The model "vibes" the solution—it recognizes the shape of the error (e.g., a React hydration mismatch) and outputs the shape of the most common fix (e.g., wrapping a component in useEffect), without engaging in the causal reasoning required to determine if that fix is appropriate for the specific context.3  
This behavior aligns with Daniel Kahneman’s "System 1" thinking: fast, automatic, and heuristic-based. Debugging, however, is a quintessential "System 2" activity: slow, deliberative, and logical.4 Current agents attempt to perform System 2 tasks using System 1 capabilities, resulting in a fragility that prompt engineering alone cannot resolve. The agent's drive to be "helpful" and "responsive" exacerbates this, as it perceives immediate code generation as the highest-utility action, effectively short-circuiting the OODA (Observe, Orient, Decide, Act) loop required for effective engineering.6

### **1.2 The Anatomy of "Thrashing" and "Failure Blindness"**

The "vibe coding" pathology manifests in distinct, measurable failure modes that degrade the development lifecycle:

1. **Pattern Matching over Reasoning:** The agent identifies a surface-level symptom and applies a familiar solution pattern. Because LLMs are pattern-matchers, they struggle to distinguish between superficial similarities and structural identities. An error message that *looks* like a database timeout might be caused by a firewall rule, but the agent, seeing "timeout," will hallucinate a connection string fix because that is the statistically dominant association.7  
2. **Failure Blindness:** When the applied fix fails, the agent lacks an internal model of *why* it chose that fix. It treats the failure as a localized syntax error rather than a refutation of a hypothesis. This leads to "thrashing"—repetitive, non-functional edits where the agent slightly modifies the code (e.g., adding comments, changing variable names, toggling boolean flags) in a desperate attempt to satisfy the test harness. This behavior consumes token budget and, more dangerously, pollutes the context window with "bad code," lowering the model's effective intelligence for subsequent turns.8  
3. **Infinite Loops:** In the absence of a "stop and think" mechanism, agents can get trapped in recursive failure modes. They will attempt the same invalid fix repeatedly, perhaps with minor syntactical variations, unable to break the loop because the "fix" token probability remains locally maximal.9  
4. **Escalation Avoidance:** Agents are typically incentivized via system prompts to be autonomous. This creates a perverse incentive to exhaust all resources on futile attempts rather than escalating to a human. The agent implicitly frames escalation as a "failure" of autonomy, leading to scenarios where a human engineer returns to find hours of compute wasted on a problem that required a simple clarification.6

### **1.3 The Economic and Operational Costs**

The cost of "vibe coding" extends beyond wasted compute credits. It introduces technical debt and subtle regressions into the codebase. Code that works by coincidence (fixing the symptom) rather than by design (fixing the root cause) is fragile. It obscures the underlying issue, making future debugging significantly harder. Furthermore, an agent that blindly tries fixes is a security liability. It may introduce vulnerabilities by pasting unverified code snippets or hallucinating dependencies that function as supply chain attack vectors.12  
Current mitigation attempts rely heavily on "Prompt Engineering"—adding rules to the system prompt like "Always investigate first." However, empirical evidence suggests that as context length grows and task complexity increases, LLMs suffer from "instruction drift," ignoring passive rules in favor of strong attractive patterns in the local context.14  
**Conclusion:** Arela v5 operates on the premise that **textual rules are insufficient**. To solve the behavior, we must constrain the *action space*. If the agent *cannot* modify code until it has proven it understands the problem, it is forced to investigate. This moves the constraint from the probabilistic layer (the LLM's brain) to the deterministic layer (the tool execution environment).

## ---

**2\. Cognitive Architectures for Reliability**

To design an effective enforcement system, we must first analyze the cognitive models we are attempting to emulate and enforce. The goal is to transition the agent from a chaotic, probabilistic generator into a structured, reasoning entity. We draw upon Dual Process Theory and the OODA Loop to create a blueprint for the Arela v5 architecture.

### **2.1 System 1 vs. System 2 in Silicon**

Daniel Kahneman’s distinction between System 1 (fast, intuitive) and System 2 (slow, deliberative) thinking provides a powerful heuristic for understanding AI behavior.16

* **System 1 (Current Agent Default):** The LLM generates the most likely next token based on surface associations. It is fast, cheap, and prone to hallucination and logical leaps. It excels at writing boilerplate but fails at complex debugging because it does not "check its work" before speaking.  
* **System 2 (The Desired State):** This involves iterative reasoning, self-critique, and verification. In an agentic context, System 2 is not native to the model; it is an *emergent property* of the architecture surrounding the model. It requires a "loop" where the model generates a thought, critiques it, tests it, and then updates its mental state.4

Arela v5's enforcement mechanism serves as an **externalized System 2**. By blocking immediate action, we force the model to engage in the computational equivalent of "stopping to think." We replace the implicit, internal reasoning (which is invisible and unreliable) with explicit, external reasoning (tool calls that must be validated).

### **2.2 The OODA Loop: Observe, Orient, Decide, Act**

The OODA Loop, derived from military strategy, is the standard model for autonomous decision-making in adversarial or dynamic environments.18 It maps perfectly to the software debugging process, highlighting exactly where current agents fail.

1. **Observe:** Gathering data. Humans read logs and reproduce bugs. Agents call read\_file, grep, and run tests.  
2. **Orient:** Analyzing the data to form a mental model. This is the **Root Cause Analysis**.  
   * *Human:* "This error implies a race condition in the database lock."  
   * *Agent Failure:* Most coding agents skip this step entirely. They move directly from Observe (seeing the error) to Act (writing code).  
3. **Decide:** Selecting a course of action based on the orientation. Generating the plan.  
4. **Act:** Executing the fix. Calling edit\_file.

**The Breakdown:** The "vibe coding" problem is effectively an OODA loop short-circuit. The agent perceives the observation and immediately triggers the action, bypassing the orientation phase.  
**The Arela Implementation:** We must programmatically enforce the "Orient" phase. The system must verify that an "Orientation Artifact"—such as a written hypothesis or a structured investigation log—exists and is valid before the "Decide" and "Act" phases are unlocked.20 We effectively "break" the loop if the agent attempts to transition from Observe to Act without passing through Orient.

### **2.3 The Scientific Method as a Finite State Machine**

We can formalize the OODA loop into a Finite State Machine (FSM) specifically for debugging, often referred to as the Scientific Method.22 This converts abstract cognitive steps into concrete system states.

* **State A: Symptom Acquisition.** The agent must log the error.  
* **State B: Hypothesis Generation.** The agent must propose a cause.  
* **State C: Experimentation.** The agent must propose a test to validate the hypothesis *without* fixing the bug yet.  
* **State D: Analysis.** The agent must interpret the test results.  
* **State E: Remediation.** Only now can the agent attempt a fix.

Current agents treat these steps as optional suggestions. Arela v5 will treat them as **transition requirements** in a state machine. The agent literally *cannot* call edit\_file while in State A, B, or C. It must transition to State E, which is only reachable via State D.24 This rigid structure forces the agent to align its behavior with the scientific method, as that is the only path that leads to task completion.

### **2.4 Dual Process Theory in AI Agents**

Recent research into "System 2 Reasoning" in LLMs 26 suggests that models like OpenAI's o1 achieve higher performance by generating "hidden chains of thought" before answering. Arela v5 effectively forces this behavior on *any* model (e.g., Claude 3.5 Sonnet) by making the "chain of thought" explicit and external.  
By requiring the agent to use a tool to "register a hypothesis," we force the model to tokenize its reasoning. This process of "thinking out loud" (or "thinking into a tool") leverages the model's own auto-regressive nature to improve consistency. Once the model has generated the tokens for a logical hypothesis, the subsequent tokens (the plan) are statistically more likely to be correct because they are conditioned on that high-quality reasoning, rather than just the raw error message.27

## ---

**3\. State of the Art in Constraint Mechanisms**

Before specifying the Arela v5 solution, we must examine existing approaches to constraining AI behavior. This research informs what is technically feasible, what has been tried, and where current tools fall short.

### **3.1 Constitutional AI and Self-Correction**

Anthropic’s "Constitutional AI" (CAI) focuses on training models to critique their own outputs based on a set of principles (e.g., "be harmless," "be helpful").29 The process involves both a supervised learning stage and a reinforcement learning stage (RLAIF).

* **Applicability:** CAI is highly effective for *content* safety (e.g., preventing hate speech or bomb-making instructions).  
* **Limitation in Coding:** In the domain of coding, CAI is often limited to "soft" constraints. The model is asked to "be careful," but if it hallucinates that it *has* been careful, the constraint fails. There is no external "truth" regarding whether the code is correct until it is run.  
* **Insight:** We cannot rely solely on the model to police itself via internal monologue. We need *external* verification. The "Constitution" must be enforced by the environment, not just the model's training weights. The environment must act as the "Enforcer" of the constitution.31

### **3.2 Tool Gating and Orchestration**

LangGraph and similar orchestration libraries introduce the concept of "conditional edges" in agent workflows.33 These systems allow developers to define workflows where an agent must pass a check before moving to the next node in a graph.

* **Relevance:** This is the architectural basis for Arela. We can view the "Investigation" as a subgraph that must return a "Success" signal before the "Coding" subgraph is triggered.  
* **Gap:** Most implementations use these for high-level task planning (e.g., "Research" vs "Write"). They rarely enforce granular debugging logic (Hypothesis vs. Edit) at the tool level. Arela needs to apply this at the granular level of a single debugging loop.35

### **3.3 Existing Tool Implementations**

* **Cursor:** Uses .cursorrules to provide context-specific instructions to the model.36 While effective for style enforcement (e.g., "Use TypeScript," "Prefer arrow functions"), it fails to prevent "vibe coding" because it lacks execution gating. It guides the generation but doesn't restrict the action space. If the model ignores the rule, the code is still written.  
* **SWE-Agent:** Implements a "trajectory" analysis where it can detect if it is spinning in loops.38 It uses heuristics to identify when the agent is stuck and intervenes. However, its primary mechanism is still prompt-based retry loops rather than hard state constraints. It stops the agent *after* it has failed, rather than preventing the failure.  
* **Aider:** Uses a "map" of the codebase to ground the agent, but similarly allows immediate file editing. Its "lint-fix" loop is reactive, verifying code *after* it is written.40

### **3.4 Security-Oriented Guardrails**

Research into "MCP-Guard" and other security frameworks 12 highlights the vulnerability of tool-use agents to "Prompt Injection" and "Confused Deputy" attacks. If an agent can be tricked into executing malicious code, it poses a severe risk.

* **Relevance:** The same mechanisms used to prevent malicious behavior (e.g., preventing rm \-rf /) can be used to prevent "lazy" behavior. By treating "uninvestigated code editing" as a security violation, we can leverage existing security patterns for quality assurance.  
* **Implementation:** Arela v5 will treat the lack of a hypothesis not just as a process failure, but as a "privilege escalation" failure. The agent does not have the *permission* to write code until it has escalated its privileges via investigation.13

**Conclusion:** Current tools lack **programmatic investigation enforcement**. They rely on the agent's goodwill and training to follow the rules. Arela v5 will introduce **adversarial enforcement**—assuming the agent *wants* to skip investigation (due to its probabilistic nature) and actively blocking it.

## ---

**4\. The Model Context Protocol (MCP) as an Enforcement Layer**

The Model Context Protocol (MCP) provides the ideal substrate for implementing these constraints. MCP standardizes the connection between the agent (Client) and its tools (Server), decoupling the intelligence from the capability.43 This decoupling allows us to inject a middleware layer that can inspect, modify, or block messages, acting as a "Session Guard."

### **4.1 MCP Architecture Overview**

The standard MCP architecture operates on a Client-Host-Server model:

* **Host (Arela/Claude):** The application running the LLM.  
* **Client:** The internal component managing connections.  
* **Server:** The external process providing tools (e.g., FileSystem, PostgreSQL, ArelaTools).

Crucially, the agent does not interact with the "real world" directly; it interacts with the MCP Server via JSON-RPC messages. This decoupling is the enforcement point. By placing a proxy or middleware between the Host and the Server, we can control the agent's reality.45

### **4.2 The Middleware Pattern: Interception and Gating**

The "Interceptor" or "Gateway" pattern, well-documented in microservices, is novel but critical in agentic AI.47 In Arela v5, we introduce a **Session Guard Middleware** that sits between the agent and the tools.

* **Mechanism:** An MCP Proxy sits between the Agent and the actual tools (e.g., the FileSystem Tool).  
* **Policy Enforcement:** When the Agent sends a call\_tool("edit\_file") request, the Proxy intercepts it.  
* **Evaluation:** The Proxy checks the current "Session State." Has the agent completed the investigation steps?  
  * *If No:* The Proxy rejects the request with a JSON-RPC error: "Action Blocked: Investigation incomplete. Use arela\_investigate to document root cause first."  
  * *If Yes:* The Proxy forwards the request to the actual FileSystem Server.49

This turns the "Investigation Rule" into a hard constraint. The agent physically cannot edit the code until it satisfies the gatekeeper. The error message serves as **In-Context Feedback**, training the agent within the session to follow the correct procedure.

### **4.3 Stateful Context and Memory Servers**

To track whether the investigation is complete, the system needs state. LLMs are stateless; their "memory" is just the context window, which is mutable and prone to loss. If the context window fills up and truncates the early part of the conversation (where the investigation happened), the agent might "forget" it investigated.

* **The Memory Server:** We require a stateful MCP server (backed by SQLite or Redis) that persists the "Investigation Status" independent of the chat context.50  
* **Verification:** When the agent claims to have investigated, it must write this to the Memory Server. The Middleware checks this server, not the chat context, to grant permissions. This prevents the agent from "hallucinating" that it investigated. Even if the agent says "I have checked the logs," if there is no record in the Memory Server, the action is blocked.50

**Table 3: Comparison of Enforcement Mechanisms**

| Mechanism | Method | Persistence | Reliability | Example |
| :---- | :---- | :---- | :---- | :---- |
| **Prompt Engineering** | System Instructions | Context Window | Low (Drifts) | .cursorrules |
| **Orchestration** | Graph Logic | Runtime Memory | Medium | LangGraph |
| **MCP Middleware** | **Protocol Interception** | **SQLite DB** | **High (Hard Block)** | **Arela v5** |

### **4.4 Handling Context Preservation**

Arela v5 utilizes a **SQLite-backed MCP Memory Server** 50 to solve the "Amnesia" problem.

* **Function:** Stores the "Hypothesis," "Evidence," and "Plan" as structured data rows, not just chat text.  
* **Retrieval:** When the agent wakes up in a new context window (or after a crash), the Session Guard automatically injects the current\_state from SQLite into the system prompt. "You are currently in the IMPLEMENTATION phase of fixing Bug \#123. Hypothesis: \[X\]."  
* **Implementation:** The database schema tracks the session ID, current state, and history of hypotheses. This ensures that the "Truth" of the investigation survives the ephemeral nature of the LLM context.54

## ---

**5\. Arela v5 Specification: The Investigation Engine**

Based on the theoretical framework and MCP architecture, we propose the following concrete design for Arela v5. This system makes following investigation rules the path of least resistance because the "easy path" (editing code immediately) is strictly blocked.

### **5.1 Core Philosophy: The "Investigation Gate"**

The system introduces a concept of **Privilege Escalation**, modeled after security systems.

* **Default State (Low Privilege):** Read-only access to files. Access to investigation tools (grep, ls, read\_file). Access to arela\_hypothesis.  
* **Escalated State (High Privilege):** Write access to files (edit\_file, replace\_string).

To escalate from Low to High privilege, the agent must successfully execute a specific sequence of investigation actions. This aligns the agent's incentives: to complete the task (which requires writing code), it *must* first perform the investigation.

### **5.2 The Investigation State Machine (ISM)**

The core of Arela v5 is the Investigation State Machine. The Session Guard enforces transitions between these states. The agent cannot skip states; it must traverse the graph.  
**Table 4: The Investigation State Machine Definition**

| State ID | State Name | Description | Allowed Tools | Transition Trigger (Success) |
| :---- | :---- | :---- | :---- | :---- |
| **S0** | **Discovery** | Agent is exploring the codebase and reading logs. | read\_file, grep, ls, view\_logs | Call arela\_log\_symptom with error details. |
| **S1** | **Analysis** | Agent is formulating a hypothesis based on data. | *All Read Tools*, arela\_search\_knowledge | Call arela\_register\_hypothesis with JSON schema. |
| **S2** | **Verification** | Agent is testing the hypothesis without modifying code. | run\_script, curl, python\_repl (Read-only) | Call arela\_confirm\_hypothesis with test results. |
| **S3** | **Implementation** | Agent is authorized to fix the bug. | edit\_file, write\_file, git\_commit | Call arela\_verify\_fix. |
| **S4** | **Review** | Agent submits the fix for human review. | arela\_submit\_pr | Human Approval. |

**The "Path of Least Resistance":** If the agent tries to edit\_file in State S0, S1, or S2, the Session Guard returns an immediate, informative error:

* *Agent Request:* edit\_file(main.py)  
* *Guard Response:* "Error: Write Access Denied. You are in 'ANALYSIS' phase. You must register a hypothesis using arela\_register\_hypothesis before modifying code."

The agent, driven to complete the task, will naturally choose the allowed tool because it is the only way to progress.

### **5.3 Tool Design: arela\_register\_hypothesis**

We introduce a rigorous investigation tool that forces structured reasoning via **JSON Schema enforcement**.56 This prevents the agent from providing vague or "vibes-based" justifications.  
Tool Name: arela\_register\_hypothesis  
Description: "Registers a formal hypothesis for the cause of the bug. Required before write access is granted."  
Parameters (JSON Schema):

* symptom\_summary (String): Concise description of the observed error.  
* suspected\_root\_cause (String): The technical cause (e.g., "Race condition in X").  
* evidence\_files (Array): List of file paths read that support this hypothesis.  
* reasoning\_chain (String): Step-by-step logic (Chain of Thought) linking symptom to cause.  
* confidence (Enum): LOW, MEDIUM, HIGH.  
* verification\_plan (String): How will you prove this *before* fixing it?

**Enforcement:** The Middleware validates this JSON. If reasoning\_chain is too short (\< 20 words) or evidence\_files is empty, the tool call is rejected with "Insufficient Evidence." This forces the agent to actually "think" (generate text) about the problem.58

### **5.4 The "Scratchpad" Integration**

Arela currently uses a SCRATCHPAD.md file. The Session Guard integrates this into the automation loop.

* **Automation:** When arela\_register\_hypothesis is called, the Middleware *automatically* appends the hypothesis content to SCRATCHPAD.md.  
* **Persistence:** This ensures the reasoning is saved in the repository, surviving context window flushes.  
* **Visibility:** The human user can see the agent's logic in real-time by watching the file, creating a "Black Box Flight Recorder" of the agent's logic.14

### **5.5 Handling "Trivial" Fixes (The Fast Lane)**

A strict state machine can be annoying for trivial tasks (e.g., "Fix typo in README"). To mitigate "Process Bureaucracy," we implement a **"Fast Lane" Heuristic**.60

* **Mechanism:** The Session Guard analyzes the user's initial prompt and the proposed edit.  
* **Heuristic:** If the prompt contains keywords like "typo", "rename", "comment", or "formatting", AND the proposed change affects \< 3 lines of code:  
  * The Middleware automatically sets State to **S3 (Implementation)**.  
  * This bypasses the investigation requirement for low-risk tasks, balancing rigour with velocity.

## ---

**6\. Implementation Strategy: From Text to Code**

This section details the concrete technical steps to implement Arela v5 using the MCP ecosystem, focusing on the construction of the Session Guard and the integration of failure awareness.

### **6.1 Building the Session Guard Middleware**

The Session Guard is a "Transparent Proxy" MCP server.45 It sits between the LLM client and the downstream tool servers (FileSystem, Git, etc.).

* **Technology:** TypeScript or Python (using FastMCP framework).  
* **Configuration:** The user's MCP config file (e.g., in Claude Desktop) points to the Session Guard. The Session Guard then manages connections to the upstream tools.

**Code Logic (Pseudocode):**

Python

class SessionGuard(MCPServer):  
    state \= "DISCOVERY"

    def handle\_call\_tool(self, request):  
        tool\_name \= request.params.name  
          
        \# 1\. Block Restricted Tools  
        if tool\_name in \["edit\_file", "write\_file", "replace\_string"\]:  
            if self.state\!= "IMPLEMENTATION":  
                return Error("Blocked: You must prove your hypothesis first. "  
                             "Current State: " \+ self.state)  
          
        \# 2\. Handle State Transitions  
        if tool\_name \== "arela\_register\_hypothesis":  
            \# Validate input logic (heuristics)  
            if self.validate\_hypothesis(request.params):  
                self.state \= "VERIFICATION"  
                self.log\_to\_memory(request.params)  
                return Forward(request)  
            else:  
                return Error("Hypothesis Rejected: Reasoning too shallow.")  
              
        if tool\_name \== "arela\_confirm\_hypothesis":  
             self.state \= "IMPLEMENTATION"  
             return Success("Hypothesis Confirmed. Write access granted.")

        \# 3\. Default: Forward valid tools  
        return Forward(request)

This logic creates a **Hard Gate**. No amount of prompt engineering by the agent can bypass this code-level check.47 The agent is physically constrained.

### **6.2 Designing for Failure Awareness**

We must handle the case where the agent's hypothesis is wrong. If the verification fails, the agent must not be allowed to proceed to implementation.

* **The "Refutation" Loop:** If the agent enters "VERIFICATION" state and the test fails (e.g., the reproduction script doesn't reproduce the bug), the agent must call arela\_reject\_hypothesis.  
* **State Reset:** This transitions the state back to "ANALYSIS" (S1).  
* **Failure Memory:** The Session Guard records this failed attempt in the Memory Server.  
* **Escalation Trigger:** If the Failure Count \> 3 (i.e., 3 failed hypotheses), the Session Guard engages a "Soft Lock." It rejects *all* tools except arela\_escalate\_to\_human. The agent is forced to ask for help rather than spinning indefinitely.6

### **6.3 Detecting "Vibe Coding" Programmatically**

How do we prevent "Malicious Compliance," where the agent fills out the hypothesis form with garbage just to unlock the gate? We implement programmatic heuristics.

* **Levenshtein Distance:** The middleware checks if the reasoning\_chain is identical to a previous attempt. If the agent is just copy-pasting failed reasoning, the tool is blocked.63  
* **Input Length:** If the suspected\_root\_cause description is less than 10 words, it is rejected as "Lazy."  
* **Context Relevance:** The Middleware tracks read\_file calls. If the evidence\_files array contains files that the agent has *not* actually read in the current session, the hypothesis is rejected as "Hallucinated Evidence."

## ---

**7\. Human-AI Collaboration Patterns**

Enforcement must not be so rigid that it alienates the human user. The "Path of Least Resistance" must also apply to the *human-agent team*. If the system is too annoying, users will bypass it.

### **7.1 The "Optimistic UI" for Humans vs. "Pessimistic UI" for Agents**

For the human user, the experience should feel seamless and transparent.

* **Transparency:** When the agent is blocked by the Session Guard, the user should see a notification in the UI: "Arela is formulating a hypothesis..." rather than a raw error. The error message is for the *agent*, not the user.  
* **Visual Indicators:** The IDE (via MCP extension) should display a "Traffic Light" indicator of the agent's state:  
  * 🟡 **Yellow:** Investigating/Thinking (Read-only).  
  * 🟢 **Green:** Coding (Write Access Granted).  
  * 🔴 **Red:** Blocked/Escalated.65

### **7.2 The "Break Glass" Mechanism**

Trust requires control. The user must always have a "God Mode" to override the guardrails.

* **Command:** The user can type /override or "Just fix it."  
* **Effect:** This sends a signal to the Session Guard to force the state to **IMPLEMENTATION**.  
* **Rationale:** Sometimes the agent is wrong about the risk, or the user knows the fix is trivial and just wants the agent to type it. Blocking the user creates resentment; blocking the agent creates reliability. The Session Guard creates a log entry ("User Override") for future analysis.67

### **7.3 Avoiding Alert Fatigue**

If the agent asks for help too often, the user will disable the protections. We implement "Silent Retries."

* **Pattern:** If the agent submits a hypothesis that fails the heuristic check (e.g., too short), the Session Guard rejects it *without* notifying the user. The agent is prompted to "Try again with more detail."  
* **Escalation Thresholds:**  
  * *Low Risk (Read-only):* Infinite retries.  
  * *High Risk (Write):* 3 failures \-\> Escalation to Human.  
  * *Critical (Delete/Deploy):* 1 failure \-\> Escalation.68

### **7.4 Structured Handoffs**

When the agent escalates, it shouldn't just say "I failed." It must dump the "Investigation Context" from the Memory Server.

* **The Handoff Artifact:** The agent generates a Markdown report summarizing:  
  1. What I observed.  
  2. The 3 hypotheses I tested.  
  3. Why they failed.  
  4. Current state of the file system.  
     This allows the human to pick up exactly where the agent left off ("System 2" handoff), minimizing the cognitive load of context switching.6

## ---

**8\. Metrics & Evaluation: Measuring Investigation Quality**

How will we know Arela v5 is succeeding? We must move beyond simple "Task Success Rate" to "Process Quality Metrics" that measure the *depth* of the engagement.70

### **8.1 The "Thrashing" Index**

* **Definition:** The ratio of edit\_file calls to verified\_fix outcomes.  
* **Goal:** Lower is better. A "Vibe Coder" might have a ratio of 5:1 (5 tries to fix 1 bug). Arela v5 aims for 1.5:1.  
* **Measurement:** The Session Guard logs every edit\_file call and correlates it with the final session outcome. A high thrashing index indicates that the investigation gate is too loose.7

### **8.2 Reasoning-to-Action Ratio (RAR)**

* **Definition:** The number of tokens generated for arela\_hypothesis (reasoning) divided by the number of tokens generated for edit\_file (action).  
* **Goal:** We want to see a "Heavy Tail" of reasoning. A high RAR indicates System 2 thinking.  
* **Analysis:** If RAR \< 0.5, the agent is likely "vibe coding." If RAR \> 5.0, the agent is suffering from "Analysis Paralysis." We aim for a "Goldilocks Zone" (e.g., 2.0 \- 3.0).

### **8.3 Reversion Rate**

* **Definition:** How often is an edit immediately followed by an undo or a reverse edit on the same lines?  
* **Mechanism:** We use **Levenshtein distance** on file states to detect "toggling" behavior (e.g., changing true to false and then back to true).  
* **Detection:** The Middleware tracks the diffs. If the Reversion Rate \> Threshold, it triggers a "Stop and Think" intervention, forcing the agent back to State S1 (Analysis).63

### **8.4 Semantic Drift**

Using embeddings (e.g., OpenAI text-embedding-3-small), we compare the suspected\_root\_cause vector with the fix\_description vector.

* **Alignment:** They should be semantically close. If the hypothesis is "Database Lock" but the fix is "CSS Change," there is a **Semantic Drift**.  
* **Action:** The Middleware can flag this as an "Illogical Fix" and require a secondary confirmation.72

## ---

**9\. Risks and Mitigations**

Implementing rigid constraints introduces risks to the developer experience. We must anticipate and mitigate these.

### **9.1 Risk: Latency and Friction**

* **Issue:** Forcing investigation makes simple tasks ("Fix this typo") feel slow and bureaucratic. The user doesn't want to wait for a hypothesis to fix a spelling error.  
* **Mitigation:** The **Context-Aware Gating** (Fast Lane) described in Section 5.5. By detecting the complexity of the request (diff size \< 2 lines), we can dynamically lower the barriers.  
* **Mitigation:** "One-Shot Investigation." We optimize the prompt to allow the agent to call read\_file and register\_hypothesis in the same turn, reducing the number of network round-trips.

### **9.2 Risk: Malicious Compliance**

* **Issue:** The agent learns to "game" the system. It writes verbose but meaningless text in the reasoning\_chain field just to unlock the file editor.  
* **Mitigation:** **Semantic Caching & Diversity Checks.** If the agent submits the same hypothesis explanation for different bugs, flag it. The Middleware can also use a lightweight embedding model to check the *semantic relevance* of the hypothesis to the error log. If the cosine similarity is low, the hypothesis is rejected as "Hallucination".72

### **9.3 Risk: Cost**

* **Issue:** More steps \= more tokens \= higher cost per task.  
* **Counter-Argument:** "Vibe Coding" is actually *more* expensive due to infinite loops and failed retries. A single infinite loop of 5 failed edits costs more than 1 structured investigation step. Spending 1000 tokens on investigation to avoid 5000 tokens of thrashing is a net saving.  
* **Control:** Implement a "Token Budget" per session in the Middleware. If the agent burns 50% of the budget without registering a hypothesis, warn it.

## ---

**10\. Conclusion**

The "Vibe Coding" phenomenon is not a failure of the model's intelligence; it is a failure of the *environment's architecture*. By allowing agents to act without thinking, we incentivize probabilistic guessing. The path of least resistance currently leads to bad code.  
Arela v5 proposes a fundamental architectural shift: **The environment must enforce the scientific method.**  
By implementing the **Session Guard Middleware** using the Model Context Protocol, we transform "Investigation" from a passive suggestion into an active credential. The agent must *earn* the right to write code by proving it understands the problem. This structure aligns the agent's incentives (task completion) with the user's incentives (correct, verified code).  
This is not just adding bureaucracy; it is adding a **Cognitive Cortex** to the agentic loop. It forces the "System 1" LLM to operate within a "System 2" workflow, ensuring that the speed of AI coding does not outpace the speed of verification. The result is an agent that acts less like a chaotic autocomplete and more like a disciplined junior engineer.

## ---

**11\. Implementation Roadmap**

This roadmap provides a clear path to transforming Arela from a coding assistant into a rigorous coding partner.  
**Table 5: Implementation Phases**

| Phase | Duration | Action Item | Deliverable |
| :---- | :---- | :---- | :---- |
| **Phase 1** | Weeks 1-2 | **Build Session Guard** | MCP Proxy Server in Python/TypeScript. Basic State Machine implementation (S0-S4). |
| **Phase 2** | Weeks 3-4 | **Deploy Tools** | arela\_register\_hypothesis and arela\_confirm\_hypothesis tools with strict JSON Schema. Integration with SCRATCHPAD.md. |
| **Phase 3** | Weeks 5-6 | **Memory Integration** | SQLite backing for Session Guard. Persistent context across sessions. Schema design for investigation\_log. |
| **Phase 4** | Weeks 7-8 | **Heuristics** | Implementation of "Fast Lane" logic (diff size checks) and "Malicious Compliance" detectors (Levenshtein distance). |
| **Phase 5** | Weeks 9-10 | **UI Feedback** | Integration with Frontend to show "Traffic Light" status indicators to the human user. |

This plan prioritizes the core blocking mechanism (Phase 1 & 2\) to arrest the "vibe coding" behavior immediately, followed by refinements (Phase 3-5) to improve the user experience and robustness.

#### **Works cited**

1. Recent results show that LLMs struggle with compositional tasks \- Hacker News, accessed on January 4, 2026, [https://news.ycombinator.com/item?id=42905453](https://news.ycombinator.com/item?id=42905453)  
2. Why do LLMs seem to take shortcuts, miss steps, stop paying attention to details? \- Reddit, accessed on January 4, 2026, [https://www.reddit.com/r/ChatGPTCoding/comments/1dq651t/why\_do\_llms\_seem\_to\_take\_shortcuts\_miss\_steps/](https://www.reddit.com/r/ChatGPTCoding/comments/1dq651t/why_do_llms_seem_to_take_shortcuts_miss_steps/)  
3. What is AI Agent Planning? | IBM, accessed on January 4, 2026, [https://www.ibm.com/think/topics/ai-agent-planning](https://www.ibm.com/think/topics/ai-agent-planning)  
4. The Productivity Paradox of AI Coding Assistants \- Cerbos, accessed on January 4, 2026, [https://www.cerbos.dev/blog/productivity-paradox-of-ai-coding-assistants](https://www.cerbos.dev/blog/productivity-paradox-of-ai-coding-assistants)  
5. Coding fast and coding slow | 8th Light, accessed on January 4, 2026, [https://8thlight.com/insights/coding-fast-and-coding-slow](https://8thlight.com/insights/coding-fast-and-coding-slow)  
6. 12 Failure Patterns of Agentic AI Systems \- Concentrix, accessed on January 4, 2026, [https://www.concentrix.com/insights/blog/12-failure-patterns-of-agentic-ai-systems/](https://www.concentrix.com/insights/blog/12-failure-patterns-of-agentic-ai-systems/)  
7. How Code Execution Drives Key Risks in Agentic AI Systems | NVIDIA Technical Blog, accessed on January 4, 2026, [https://developer.nvidia.com/blog/how-code-execution-drives-key-risks-in-agentic-ai-systems/](https://developer.nvidia.com/blog/how-code-execution-drives-key-risks-in-agentic-ai-systems/)  
8. Building Effective AI Agents \- Anthropic, accessed on January 4, 2026, [https://www.anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents)  
9. Loop Detection \- Invariant Documentation, accessed on January 4, 2026, [https://explorer.invariantlabs.ai/docs/guardrails/loops/](https://explorer.invariantlabs.ai/docs/guardrails/loops/)  
10. Compromising Autonomous LLM Agents Through Malfunction Amplification \- arXiv, accessed on January 4, 2026, [https://arxiv.org/html/2407.20859v1](https://arxiv.org/html/2407.20859v1)  
11. 7 Types of AI Agent Failure and How to Fix Them | Galileo, accessed on January 4, 2026, [https://galileo.ai/blog/prevent-ai-agent-failure](https://galileo.ai/blog/prevent-ai-agent-failure)  
12. MCP-Guard: A Defense Framework for Model Context Protocol Integrity in Large Language Model Applications \- arXiv, accessed on January 4, 2026, [https://arxiv.org/html/2508.10991v1](https://arxiv.org/html/2508.10991v1)  
13. Unveiling AI Agent Vulnerabilities Part II: Code Execution | Trend Micro (US), accessed on January 4, 2026, [https://www.trendmicro.com/vinfo/us/security/news/cybercrime-and-digital-threats/unveiling-ai-agent-vulnerabilities-code-execution](https://www.trendmicro.com/vinfo/us/security/news/cybercrime-and-digital-threats/unveiling-ai-agent-vulnerabilities-code-execution)  
14. Adopting AI Coding Assistants in Government: Ensuring Consistency and Scale with Spec-Driven Development | by Mark Craddock | Medium, accessed on January 4, 2026, [https://medium.com/@mcraddock/adopting-ai-coding-assistants-in-government-ensuring-consistency-and-scale-with-spec-driven-efd44d58b3eb](https://medium.com/@mcraddock/adopting-ai-coding-assistants-in-government-ensuring-consistency-and-scale-with-spec-driven-efd44d58b3eb)  
15. Effective context engineering for AI agents \- Anthropic, accessed on January 4, 2026, [https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)  
16. Dual-process theories of thought as potential architectures for developing neuro-symbolic AI models \- Frontiers, accessed on January 4, 2026, [https://www.frontiersin.org/journals/cognition/articles/10.3389/fcogn.2024.1356941/full](https://www.frontiersin.org/journals/cognition/articles/10.3389/fcogn.2024.1356941/full)  
17. Cognitive Dual-Process Theories Applied to Artificial Intelligence \- Dialnet, accessed on January 4, 2026, [https://dialnet.unirioja.es/descarga/articulo/10314968.pdf](https://dialnet.unirioja.es/descarga/articulo/10314968.pdf)  
18. Agentic AI’s OODA Loop Problem, accessed on January 4, 2026, [https://www.schneier.com/essays/archives/2025/10/agentic-ais-ooda-loop-problem.html](https://www.schneier.com/essays/archives/2025/10/agentic-ais-ooda-loop-problem.html)  
19. AI Agent and Claude 3: Implementing the OODA Loop for Decision-Making \- Medium, accessed on January 4, 2026, [https://medium.com/thedeephub/ai-agent-and-claude-3-implementing-the-ooda-loop-for-decision-making-43a58f489ac4](https://medium.com/thedeephub/ai-agent-and-claude-3-implementing-the-ooda-loop-for-decision-making-43a58f489ac4)  
20. Harnessing the OODA Loop for Agentic AI: From Generative Foundations to Proactive Intelligence \- Sogeti Global, accessed on January 4, 2026, [https://www.sogeti.com/featured-articles/harnessing-the-ooda-loop-for-agentic-ai/](https://www.sogeti.com/featured-articles/harnessing-the-ooda-loop-for-agentic-ai/)  
21. AI and the OODA Loop: Reimagining Operations \- F5, accessed on January 4, 2026, [https://www.f5.com/company/blog/ai-and-the-ooda-loop-reimagining-operations](https://www.f5.com/company/blog/ai-and-the-ooda-loop-reimagining-operations)  
22. Reading 13: Debugging \- MIT, accessed on January 4, 2026, [http://web.mit.edu/6.031/www/fa17/classes/13-debugging/](http://web.mit.edu/6.031/www/fa17/classes/13-debugging/)  
23. Debugging And The Scientific Method \- C2 Wiki, accessed on January 4, 2026, [https://wiki.c2.com/?DebuggingAndTheScientificMethod](https://wiki.c2.com/?DebuggingAndTheScientificMethod)  
24. What are the applications of finite state machines in agent design? \- Tencent Cloud, accessed on January 4, 2026, [https://www.tencentcloud.com/techpedia/126481](https://www.tencentcloud.com/techpedia/126481)  
25. Using a Finite State Machine to Create Smart AI in Unity | by Chris Hilton | Medium, accessed on January 4, 2026, [https://christopherhilton88.medium.com/using-a-finite-state-machine-to-create-smart-ai-in-unity-1d2d2c648984](https://christopherhilton88.medium.com/using-a-finite-state-machine-to-create-smart-ai-in-unity-1d2d2c648984)  
26. zzli2022/Awesome-System2-Reasoning-LLM: Latest Advances on System-2 Reasoning \- GitHub, accessed on January 4, 2026, [https://github.com/zzli2022/Awesome-System2-Reasoning-LLM](https://github.com/zzli2022/Awesome-System2-Reasoning-LLM)  
27. Understanding dual process cognition via the minimum description length principle \- PMC, accessed on January 4, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC11534269/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11534269/)  
28. \[2502.11882\] Leveraging Dual Process Theory in Language Agent Framework for Real-time Simultaneous Human-AI Collaboration \- arXiv, accessed on January 4, 2026, [https://arxiv.org/abs/2502.11882](https://arxiv.org/abs/2502.11882)  
29. Constitutional AI: Harmlessness from AI Feedback — NVIDIA NeMo Framework User Guide, accessed on January 4, 2026, [https://docs.nvidia.com/nemo-framework/user-guide/25.02/modelalignment/cai.html](https://docs.nvidia.com/nemo-framework/user-guide/25.02/modelalignment/cai.html)  
30. Constitutional AI: Harmlessness from AI Feedback \- Anthropic, accessed on January 4, 2026, [https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)  
31. \[2212.08073\] Constitutional AI: Harmlessness from AI Feedback \- arXiv, accessed on January 4, 2026, [https://arxiv.org/abs/2212.08073](https://arxiv.org/abs/2212.08073)  
32. Constitutional AI with Open LLMs \- Hugging Face, accessed on January 4, 2026, [https://huggingface.co/blog/constitutional\_ai](https://huggingface.co/blog/constitutional_ai)  
33. Plan-and-Execute Agents \- LangChain Blog, accessed on January 4, 2026, [https://blog.langchain.com/planning-agents/](https://blog.langchain.com/planning-agents/)  
34. LangGraph State Machines: Managing Complex Agent Task Flows in Production, accessed on January 4, 2026, [https://dev.to/jamesli/langgraph-state-machines-managing-complex-agent-task-flows-in-production-36f4](https://dev.to/jamesli/langgraph-state-machines-managing-complex-agent-task-flows-in-production-36f4)  
35. LangGraph overview \- Docs by LangChain, accessed on January 4, 2026, [https://docs.langchain.com/oss/python/langgraph/overview](https://docs.langchain.com/oss/python/langgraph/overview)  
36. Top Cursor Rules for Coding Agents \- PromptHub, accessed on January 4, 2026, [https://www.prompthub.us/blog/top-cursor-rules-for-coding-agents](https://www.prompthub.us/blog/top-cursor-rules-for-coding-agents)  
37. Cursor Rules: Best Practices for Developers | by Ofer Shapira | Elementor Engineers, accessed on January 4, 2026, [https://medium.com/elementor-engineers/cursor-rules-best-practices-for-developers-16a438a4935c](https://medium.com/elementor-engineers/cursor-rules-best-practices-for-developers-16a438a4935c)  
38. SWE-Effi: Re-Evaluating Software AI Agent System Effectiveness Under Resource Constraints \- arXiv, accessed on January 4, 2026, [https://arxiv.org/html/2509.09853v1](https://arxiv.org/html/2509.09853v1)  
39. SWE-agent: Agent-Computer Interfaces Enable ... \- NIPS papers, accessed on January 4, 2026, [https://proceedings.neurips.cc/paper\_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf](https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf)  
40. Using Aider vs Claude Code : r/ChatGPTCoding \- Reddit, accessed on January 4, 2026, [https://www.reddit.com/r/ChatGPTCoding/comments/1m7gq38/using\_aider\_vs\_claude\_code/](https://www.reddit.com/r/ChatGPTCoding/comments/1m7gq38/using_aider_vs_claude_code/)  
41. MCP Gateway Best Practices | Traefik Hub Documentation, accessed on January 4, 2026, [https://doc.traefik.io/traefik-hub/mcp-gateway/guides/mcp-gateway-best-practices](https://doc.traefik.io/traefik-hub/mcp-gateway/guides/mcp-gateway-best-practices)  
42. MCP guardrails ensure secure context injection into LLMs \- K2view, accessed on January 4, 2026, [https://www.k2view.com/blog/mcp-guardrails-ensure-secure-context-injection-into-llms](https://www.k2view.com/blog/mcp-guardrails-ensure-secure-context-injection-into-llms)  
43. Introducing the Model Context Protocol \- Anthropic, accessed on January 4, 2026, [https://www.anthropic.com/news/model-context-protocol](https://www.anthropic.com/news/model-context-protocol)  
44. Model Context Protocol, accessed on January 4, 2026, [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)  
45. Model Context Protocol (MCP) and the MCP Gateway: Concepts, Architecture, and Case Studies | by ByteBridge, accessed on January 4, 2026, [https://bytebridge.medium.com/model-context-protocol-mcp-and-the-mcp-gateway-concepts-architecture-and-case-studies-3470b6d549a1](https://bytebridge.medium.com/model-context-protocol-mcp-and-the-mcp-gateway-concepts-architecture-and-case-studies-3470b6d549a1)  
46. Model Context Protocol (MCP) and AI, accessed on January 4, 2026, [https://chesterbeard.medium.com/model-context-protocol-mcp-and-ai-3e86d2908d1f](https://chesterbeard.medium.com/model-context-protocol-mcp-and-ai-3e86d2908d1f)  
47. Model Context Protocol (MCP) | Traefik Hub Documentation, accessed on January 4, 2026, [https://doc.traefik.io/traefik-hub/mcp-gateway/mcp](https://doc.traefik.io/traefik-hub/mcp-gateway/mcp)  
48. SEP-1763: Interceptors for Model Context Protocol \- GitHub, accessed on January 4, 2026, [https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1763](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1763)  
49. Model Context Protocol (MCP) \- Docs by LangChain, accessed on January 4, 2026, [https://docs.langchain.com/oss/python/langchain/mcp](https://docs.langchain.com/oss/python/langchain/mcp)  
50. Unlocking AI Memory: A Deep Dive into the Mekanixms SQLite MCP Server, accessed on January 4, 2026, [https://skywork.ai/skypage/en/unlocking-ai-memory-sqlite-mcp-server/1978640090500734976](https://skywork.ai/skypage/en/unlocking-ai-memory-sqlite-mcp-server/1978640090500734976)  
51. Build a Simple MCP Server and Client: An In-Memory Database \- DZone, accessed on January 4, 2026, [https://dzone.com/articles/simple-mcp-server-client-database](https://dzone.com/articles/simple-mcp-server-client-database)  
52. AI Agents and MCP Servers — The Next Frontier of Autonomous DevOps, accessed on January 4, 2026, [https://medium.com/@davidcesc/ai-agents-and-mcp-servers-the-next-frontier-of-autonomous-devops-ffdb1a4f0ebd](https://medium.com/@davidcesc/ai-agents-and-mcp-servers-the-next-frontier-of-autonomous-devops-ffdb1a4f0ebd)  
53. Breaking Isolation: A Practical Guide to Building an MCP Server with SQLite \- Felix Pappe, accessed on January 4, 2026, [https://felix-pappe.medium.com/breaking-isolation-a-practical-guide-to-building-an-mcp-server-with-sqlite-68c800a25d42](https://felix-pappe.medium.com/breaking-isolation-a-practical-guide-to-building-an-mcp-server-with-sqlite-68c800a25d42)  
54. AI Memory is evolving into the new 'codebase' for AI agents. : r/AI\_Agents \- Reddit, accessed on January 4, 2026, [https://www.reddit.com/r/AI\_Agents/comments/1n54r9q/ai\_memory\_is\_evolving\_into\_the\_new\_codebase\_for/](https://www.reddit.com/r/AI_Agents/comments/1n54r9q/ai_memory_is_evolving_into_the_new_codebase_for/)  
55. New whitepaper outlines the taxonomy of failure modes in AI agents \- Microsoft, accessed on January 4, 2026, [https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/](https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/)  
56. Structured model outputs | OpenAI API, accessed on January 4, 2026, [https://platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)  
57. Creating your first schema \- JSON Schema, accessed on January 4, 2026, [https://json-schema.org/learn/getting-started-step-by-step](https://json-schema.org/learn/getting-started-step-by-step)  
58. \[Feature Request\] Function Calling \- Easily enforcing valid JSON schema following \- API, accessed on January 4, 2026, [https://community.openai.com/t/feature-request-function-calling-easily-enforcing-valid-json-schema-following/263515](https://community.openai.com/t/feature-request-function-calling-easily-enforcing-valid-json-schema-following/263515)  
59. Coding agents \- AWS Prescriptive Guidance, accessed on January 4, 2026, [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/coding-agents.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/coding-agents.html)  
60. Agentic Auto-Scheduling: An Experimental Study of LLM-Guided Loop Optimization \- arXiv, accessed on January 4, 2026, [https://arxiv.org/html/2511.00592v1](https://arxiv.org/html/2511.00592v1)  
61. Assessing AI Code Quality: 10 Critical Dimensions for Evaluation \- Runloop, accessed on January 4, 2026, [https://runloop.ai/blog/assessing-ai-code-quality-10-critical-dimensions-for-evaluation](https://runloop.ai/blog/assessing-ai-code-quality-10-critical-dimensions-for-evaluation)  
62. Six Patterns for Connecting LLM Agents to Stateful Tools : r/mcp \- Reddit, accessed on January 4, 2026, [https://www.reddit.com/r/mcp/comments/1pzh09o/six\_patterns\_for\_connecting\_llm\_agents\_to/](https://www.reddit.com/r/mcp/comments/1pzh09o/six_patterns_for_connecting_llm_agents_to/)  
63. Levenshtein Distance: A Comprehensive Guide \- DigitalOcean, accessed on January 4, 2026, [https://www.digitalocean.com/community/tutorials/levenshtein-distance-python](https://www.digitalocean.com/community/tutorials/levenshtein-distance-python)  
64. Algorithm explained: Levenshtein edit distance \- DEV Community, accessed on January 4, 2026, [https://dev.to/thormeier/algorithm-explained-levenshtein-edit-distance-5f74](https://dev.to/thormeier/algorithm-explained-levenshtein-edit-distance-5f74)  
65. 7 Design Paradigms for Human-AI Interfaces You Probably Haven’t Heard Of (But Should Care About), accessed on January 4, 2026, [https://medium.com/design-bootcamp/7-design-paradigms-for-human-ai-interfaces-you-probably-havent-heard-of-but-should-care-about-7c909f2db3db](https://medium.com/design-bootcamp/7-design-paradigms-for-human-ai-interfaces-you-probably-havent-heard-of-but-should-care-about-7c909f2db3db)  
66. Designing for Autonomy: UX Principles for Agentic AI Systems \- UX Magazine, accessed on January 4, 2026, [https://uxmag.com/articles/designing-for-autonomy-ux-principles-for-agentic-ai-systems](https://uxmag.com/articles/designing-for-autonomy-ux-principles-for-agentic-ai-systems)  
67. A practical guide to building agents \- OpenAI, accessed on January 4, 2026, [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)  
68. What Is Alert Fatigue? | IBM, accessed on January 4, 2026, [https://www.ibm.com/think/topics/alert-fatigue](https://www.ibm.com/think/topics/alert-fatigue)  
69. Understanding and fighting alert fatigue | Atlassian, accessed on January 4, 2026, [https://www.atlassian.com/incident-management/on-call/alert-fatigue](https://www.atlassian.com/incident-management/on-call/alert-fatigue)  
70. Measuring AI code assistants and agents \- DX, accessed on January 4, 2026, [https://getdx.com/research/measuring-ai-code-assistants-and-agents/](https://getdx.com/research/measuring-ai-code-assistants-and-agents/)  
71. Before You Scale AI for Software Dev, Fix How You Measure Productivity \- Tabnine, accessed on January 4, 2026, [https://www.tabnine.com/blog/before-you-scale-ai-for-software-dev-fix-how-you-measure-productivity/](https://www.tabnine.com/blog/before-you-scale-ai-for-software-dev-fix-how-you-measure-productivity/)  
72. Semantic-guided Search for Efficient Program Repair with Large Language Models \- arXiv, accessed on January 4, 2026, [https://arxiv.org/html/2410.16655v1](https://arxiv.org/html/2410.16655v1)