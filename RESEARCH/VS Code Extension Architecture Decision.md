
The Arela v5.0.0 Architectural Mandate: A Definitive Report on Competing Architectures and Strategic Roadmap


1.0 Executive Recommendation: The Arela v5.0.0 Architectural Mandate


1.1 The Central Conflict

The analysis of four discrete research reports for Arela v5.0.0 reveals a critical and fundamental divergence in architectural philosophy. This conflict presents a classic engineering trade-off: a "short-term velocity" path versus a "long-term robustness" path.
One set of recommendations (from the ChatGPT reports) advocates for a simple, in-process "Extension Host Only" architecture. This path prioritizes speed-to-market and implementation simplicity by placing all extension logic within the primary VS Code Extension Host process.
The contrary recommendations (from the Gemini reports) mandate a more complex, multi-process architecture. This path prioritizes long-term stability, performance, and scalability by isolating heavy operations into separate processes, either through a standard Language Server Protocol (LSP) model or a future-proof, "WASM-First" design.
This report will demonstrate that the "short-term velocity" path is built upon a critically flawed technical premise, making it unsuitable for a production-grade application. The "long-term" paths, while correct in their diagnosis, present an unacceptably high up-front cost for a v5.0.0 release.

1.2 The Final Verdict (Synthesized)

This report rejects all four "pure" recommendations. Instead, it proposes a definitive, synthesized architecture that captures the benefits of all reports while mitigating their risks.
For MVP (v5.0.0): A Hybrid 2-Process "Downloader Shim" Model
The recommended architecture for Arela v5.0.0 is a hybrid 2-process model:
Process 1: The Extension Host (Coordinator): This process will run the lightweight extension logic, manage the WebView UI, and handle all asynchronous I/O (e.g., AI API calls).
Process 2: The arela-server (Child Process): This will be a standalone, platform-specific Node.js binary launched by the extension. This server will encapsulate the problematic native-node-module dependencies (better-sqlite3, tree-sitter) and expose their functionality via a simple IPC (Inter-Process Communication) interface.
This server binary will not be bundled in the VSIX. Instead, it will be delivered using the "Downloader Shim" pattern, exemplified by robust extensions like rust-analyzer.1 Upon first activation, the extension will detect the user's OS and architecture, download the correct arela-server binary from a stable location (e.g., GitHub Releases), and store it locally.3
For Long-Term (v5.1.0+): A Phased, De-Risked Migration to WASM
Following the v5.0.0 launch, a strategic, phased migration to a "WASM-First" architecture will be executed. This roadmap will incrementally replace the native-module-based arela-server with WebAssembly-based components:
Phase 1: Migrate from better-sqlite3 to sql.js (WASM).5
Phase 2: Migrate from tree-sitter (native) to web-tree-sitter (WASM).6
The ultimate goal is to deprecate the arela-server binary entirely, resulting in a single, universal VSIX package that contains no native code, simplifies distribution, and enables full support for VS Code for the Web.7

1.3 Rationale Summary

This synthesized approach is strategically superior to any of the "pure" paths for three reasons:
It Solves the Core Technical Flaw: It immediately fixes the critical "UI-blocking" flaw in the "Host Only" approach by moving synchronous, CPU-bound tasks (better-sqlite3) into a separate process, as demanded by the Gemini reports.9
It Solves the Native Module Crisis: It immediately solves the NODE_MODULE_VERSION ABI mismatch 10 by running native modules in a standard Node.js process they were built for. It distributes these binaries using the "Downloader Shim," which is operationally simpler than publishing 6-8 platform-specific VSIXs.4
It De-Risks the Future: It provides the fastest path to a robust MVP by requiring zero refactoring of the existing synchronous Arela codebase. This stable v5.0.0 architecture then serves as a reliable foundation, buying the time needed to perform the high-risk "Cascading Async" refactor for the WASM migration in a methodical, de-risked manner.
This mandate provides the velocity of the ChatGPT path while delivering the stability of the Gemini path, setting the stage for the strategic WASM-First future.

2.0 Part 1: The Core Architectural Decision — Resolving the 3-Process vs. 1-Process Divergence


2.1 Introduction to the Architectural Showdown

The competing architectural recommendations are fundamentally attempts to solve two non-negotiable platform constraints:
Performance Isolation: The VS Code Extension Host is a single, shared process. Any extension that performs heavy, synchronous, CPU-bound work on this thread will block it, degrading the performance of the entire editor and leading to a poor user experience.12
Native Module Handling: Extensions that rely on native Node.js modules (like better-sqlite3 and tree-sitter) face a fundamental runtime and distribution crisis due to the Application Binary Interface (ABI) mismatch between Electron's Node.js runtime and the system's standard Node.js runtime.10
An analysis of the three proposed architectures reveals that only a synthesized approach can adequately solve both problems.

2.2 Analysis of Option 1 (ChatGPT): The "Extension Host Only" MVP

This architecture, proposed in the ChatGPT reports, places all extension logic—the chat UI, AI streaming, and all of HexiMemory's data processing—directly into the single VS Code Extension Host process.

2.2.1 The "Simplicity" Argument

The appeal of this path is tactical. It minimizes repository complexity, eliminates the need for Inter-Process Communication (IPC), simplifies debugging (as all code runs in one "world"), and offers the fastest theoretical path to a minimal viable product. However, this velocity is purchased at the cost of high, unmitigated technical risk.

2.2.2 The Performance Risk: Deconstructing the "UI Blocking" Threat

The primary risk of this architecture is its violation of VS Code's core performance mandate. The platform's documentation and developer community consensus are unambiguous on this point: extensions must never block the Extension Host thread.
VS Code's architecture is designed for responsiveness. All extensions are run in a single extensionHost process.12 This process is shared among all extensions the user has installed.13 If Arela v5.0.0 performs a CPU-intensive task on this main thread, it will not only freeze Arela's UI; it will block the event loop for every other extension and the VS Code UI itself. This leads to typing lag, frozen hovers, and an editor that feels "sluggish".13 A block of even 200 milliseconds is sufficient to create this negative perception.13
VS Code provides tools like the "Process Explorer" and the "Start Extension Bisect" command specifically to help users hunt down and disable extensions that misbehave in this manner.12 Adopting the "Host Only" architecture would make Arela a prime candidate for disablement, leading directly to user churn.

2.2.3 Critical Insight: The "Async/Await" Fallacy

The "Host Only" recommendation's proposed mitigation—to "be careful with async/await"—demonstrates a critical misunderstanding of the dependencies involved. This architecture is fundamentally incompatible with better-sqlite3.
The analysis is as follows:
The core feature of better-sqlite3, and its primary advantage over node-sqlite3, is its high-performance synchronous API.16 It is explicitly marketed as being faster than asynchronous APIs because it avoids event loop overhead.16 It is designed for server-side Node.js backends.
The VS Code Extension Host, conversely, is a single-threaded event loop shared with a UI.13 It is the worst-case environment for long-running synchronous code.
Any synchronous, CPU-bound call (e.g., db.prepare('...').run()) from better-sqlite3 will, by definition, block this event loop.18 The UI will freeze until the query completes.
The "Host Only" report implies this can be mitigated with async/await. This is technically incorrect. Wrapping a synchronous, blocking call in a Promise (e.g., await new Promise(...)) does not make the operation non-blocking. It merely schedules the same blocking operation on the same event loop. The event loop will still be blocked, and the UI will still freeze.
The only way to execute synchronous, CPU-bound code without blocking the main thread is to move it to a separate thread (e.g., a Worker) 18 or, more robustly, a separate process.
Given that the "Host Only" model explicitly forbids a separate process, and better-sqlite3 is fundamentally synchronous, the architecture is technically unviable. It is rejected.

2.3 Analysis of Option 2 (Gemini #1): The "Hybrid 3-Process" Professional Standard

This architecture, proposed in the Gemini #1 report, is the industry-standard "professional" solution. It isolates functionality into three distinct processes: the Extension Host (coordinator), a Language Server (LSP) for code analysis, and a custom "MCP Server" (sidecar) for AI orchestration.

2.3.1 Why AI Giants Use LSP/MCP

The Language Server Protocol (LSP) was created by Microsoft specifically to solve the performance problem described in 2.2.2.9 It defines a standard for running resource-intensive language "smarts"—such as parsing, static analysis, and error checking—in a separate process.9 This ensures that even a massive code analysis task cannot affect editor responsiveness.
This is the proven, accepted pattern for modern AI extensions. GitHub Copilot and Sourcegraph Cody leverage this model. The LSP provides the deep semantic context from the codebase (e.g., symbol resolution, type information) 22, while a custom server (like a Model Context Protocol, or MCP, server) handles the AI-specific tasks of prompt engineering and orchestration.24 The open-source lsp-ai project further validates this as the standard pattern.26

2.3.2 Critical Insight: The "LSP as a Native Module Jail"

This architecture provides a "second-order" benefit that is as important as performance isolation: it solves the native module crisis by design.
The analysis is as follows:
The "Native Module Crisis" is an ABI mismatch. The NODE_MODULE_VERSION of Electron's Node.js (in the Extension Host) is different from the system's Node.js.10
An LSP server is, by definition, a standard Node.js process.9 It is not running inside the Electron sandbox.
Therefore, if better-sqlite3 and tree-sitter are dependencies of the LSP server, they will be installed and compiled against the standard system Node.js ABI.
The ABI mismatch problem vanishes.
This architecture elegantly solves both the performance isolation problem and the native module ABI problem. Its only drawback is implementation complexity. For Arela v5.0.0, implementing a full LSP and a custom MCP server is a significant engineering effort that is not required for an MVP.

2.4 Analysis of Option 3 (Gemini #2): The "WASM-First" Future

This architecture, proposed in the Gemini #2 report, is the most strategically aligned with the future of the VS Code platform. It advocates for eliminating all native code and migrating to WebAssembly (WASM) equivalents.

2.4.1 Strategic Alignment with VS Code's Future

This is not a trend; it is the explicit direction of the platform. Microsoft is actively blogging about and supporting WASM for extension development, as it allows code to run in a secure, sandboxed environment.7 A VS Code maintainer, when faced with this exact platform-specific SQLite problem, explicitly recommended using sql.js (WASM).5
This is the only path that enables a single, universal VSIX (one file to install for all platforms) and, critically, allows Arela to run in VS Code for the Web.

2.4.2 The True Cost: "Cascading Async" Refactor

The "WASM-First" path is the correct destination, but the cost of travel for v5.0.0 is unacceptably high. The Gemini #2 report's estimate of "2-4 weeks" to refactor 151 files is deemed dangerously optimistic.
As established in 2.2.3, the existing Arela codebase relies on the synchronous API of better-sqlite3.16 The WASM replacements are, by nature, asynchronous:
sql.js (WASM SQLite) requires an asynchronous initialization (await initSqlJs()).5
web-tree-sitter (WASM tree-sitter) 6 also has an async-first API surface, different from the native C bindings.29
This is not a simple "find and replace." Any function in the codebase that touches the database (e.img, getMemoryLayer()) must be refactored to async and await the result. This "cascading async" requirement will ripple up the entire call stack. Every function that calls getMemoryLayer() must also become async and await its result. This will propagate from the deepest data access layers all the way to the WebView message-passing protocol. This is a massive, high-risk architectural rewrite, not a simple refactor.

2.4.3 Performance Trade-offs

This migration is not a "free" upgrade.
Execution Speed: WASM is not native code. Emscripten-compiled code typically runs at 50-60% of native performance.30
Persistence Model: This is a more critical issue. sql.js works by loading the entire database file into memory. To persist changes, it must rewrite the entire database blob back to the filesystem.30 This persistence model is architecturally problematic for HexiMemory if it involves large, frequent, incremental writes. The native, in-place file I/O of better-sqlite3 is far superior for this specific use case.17
These performance trade-offs must be aggressively benchmarked before committing to this path.

2.5 Architectural Decision Matrix (v5.0.0)

This matrix summarizes the trade-offs for the v5.0.0 release.

Feature
Option 1: Extension Host Only (ChatGPT)
Option 2: Hybrid 3-Process (Gemini #1)
Option 3: WASM-First (Gemini #2)
MVP Velocity
High (Deceptive)
Low
Very Low
Performance Isolation
None (CRITICAL FAILURE)
Excellent
Excellent (via Worker 8)
Native Module Handling
None (CRITICAL FAILURE)
Excellent (Solved by design)
N/A (Solved by design)
Refactoring Cost
Low
High (IPC/LSP)
Very High (Cascading Async)
Long-Term Viability
Poor
Good
Excellent (Strategic)
Risk
Extreme (Technically Unsound)
Low (But High Cost)
High (Cost & Performance)


2.6 Architectural Verdict

Option 1 (Host Only) is REJECTED. It is technically flawed due to the "Async Fallacy" and is fundamentally incompatible with its own core dependencies.
Option 3 (WASM-First) is REJECTED (for v5.0.0). The refactoring cost and performance risks are too high for an MVP. It remains the strategic long-term goal.
Option 2 (LSP Hybrid) is the CORRECT ARCHITECTURE in principle. Its benefits (isolation, native module solution) are mandatory. Its drawback (high implementation cost) is a blocker.
Conclusion: The architectural mandate for v5.0.0 is clear. We must find a way to achieve the benefits of Option 2 (performance isolation, native module solution) with the low refactoring cost of Option 1. This requires a focused strategy for handling the native modules.

3.0 Part 2: Deconstructing the Native Module Crisis — A Strategy for tree-sitter and sqlite


3.1 The Root Problem: The Electron ABI Mismatch

The core of the problem is NODE_MODULE_VERSION.10 Developers are plagued by the error: The module... was compiled against a different Node.js version.11
This error occurs because VS Code is an Electron application.14 Electron ships with its own internal Node.js runtime, which is compiled with a different Application Binary Interface (ABI) than standard Node.js (e.g., using Chromium's BoringSSL instead of OpenSSL).10
When a user (or developer) runs npm install, native modules like better-sqlite3 32 and tree-sitter 14 are compiled against the system's Node.js ABI, not Electron's. When the Extension Host (Electron) tries to load this module, it detects the ABI mismatch and fails.
The "fix" is to force users to run electron-rebuild 14, a solution described by developers as a "terrible user experience".11 The only alternative is for the extension developer to ship pre-compiled, platform-specific binaries. The question is how to ship them.

3.2 Evaluating Solution 1: Migrate to @vscode/sqlite3 (Gemini #1)

This solution, recommended by the Gemini #1 report, suggests migrating to Microsoft's official fork of node-sqlite3.35 It is presented as a "drop-in replacement."

3.2.1 The "Official Fork" Illusion

This solution appears ideal but is a high-risk trap.

3.2.2 Critical Insight: The "@vscode/sqlite3 Trap"

This path is not a simple, safe migration.
Not for Public Use: In a developer discussion, a VS Code maintainer expressed uncertainty that @vscode/sqlite3 was ever intended for public extension developers.5 The maintainer noted that VS Code itself uses it, but this is because VS Code distributes platform-specific binaries of itself. The maintainer's final recommendation was to use sql.js (WASM) instead.5
Not API Compatible: The Gemini #1 report's claim of "drop-in replacement" is false. Arela uses better-sqlite3, which has a simple, synchronous API.16 @vscode/sqlite3 is a fork of node-sqlite3, which has a complex, callback-based asynchronous API. Developer reports (e.g., from the Knex.js community) explicitly state that @vscode/sqlite3 is not API-compatible and cannot be used as a drop-in replacement even for the sqlite3 driver.36 A migration from better-sqlite3 would require a complete rewrite of all data access logic.
Does Not Solve the Problem: This solution combines the worst of all paths: the high refactoring cost of the WASM migration plus the continued-but-unclear complexity of native module distribution.
Verdict: REJECTED. This solution is a high-risk, high-cost trap.

3.3 Evaluating Solution 2: Migrate to WASM (Gemini #2)

As detailed in 2.4, this is the correct strategic solution. It eliminates native code entirely.
Verdict: The correct long-term solution, but not the tactical MVP solution due to the "Cascading Async" refactoring cost (2.4.2).

3.4 Evaluating Solution 3: Platform-Specific VSIXs (ChatGPT)

This is the "brute force" but officially documented method for shipping native code.4
Implementation: The developer uses the vsce package --target <platform> command.4 A CI/CD matrix (e.g., in GitHub Actions) must be set up to build and publish a separate VSIX for every target platform.4 This includes win32-x64, win32-arm64, linux-x64, linux-arm64, linux-armhf, darwin-x64, darwin-arm64, and more.4
Pros:
Zero code refactoring.
Uses full native performance.
Cons:
Extremely high CI/CD and operational complexity.
The developer must manage, publish, and version 6-8 separate VSIX packages in the Marketplace.4
This can create a confusing user experience, although the Marketplace attempts to serve the correct platform-specific VSIX.4
Verdict: Viable, but operationally costly and complex.

3.5 Evaluating Solution 4: The "Downloader Shim" (The "Rust-Analyzer" Pattern)

This is an alternative, more elegant pattern for distributing platform-specific native code. The canonical example is the rust-analyzer extension.1
Implementation:
A single, universal, lightweight VSIX is published to the Marketplace. This VSIX contains no native code.
On first activation, the extension's TypeScript code detects the OS (process.platform) and architecture (process.arch).
It downloads the appropriate platform-specific binary (e.g., arela-server-win-x64.exe) from a stable URL, typically a GitHub Release.3
It stores this binary in a persistent, extension-owned location (e.g., context.globalStorageUri) and launches it as a child_process.

3.5.1 The Superior MVP Strategy

This approach is operationally superior to Solution 3 (Platform-Specific VSIXs).
Both solutions achieve the same goal: shipping pre-compiled native binaries. The difference is where the complexity lives.
In Solution 3 (Platform VSIXs), the complexity is front-loaded onto the CI/CD and publishing pipeline.4 This pipeline becomes fragile, complex, and slow.
In Solution 4 (Downloader Shim), this complexity is moved out of the pipeline and into the extension's activation code. This download/launch logic is simple, testable, and written once.
The CI/CD pipeline for the Downloader Shim (Solution 4) becomes much simpler:
Job 1 (Matrix): Build the arela-server binaries for all platforms.
Job 2 (Matrix): Attach all binaries to a single GitHub Release.
Job 3 (Simple): Build one universal extension.vsix.
Job 4 (Simple): Publish the one universal extension.vsix.4
This provides a vastly superior developer and user experience: one single, clear entry in the VS Code Marketplace 38, and a much simpler, more robust publishing pipeline. The only drawback is a required internet connection for first-time activation.
Verdict: RECOMMENDED MVP STRATEGY.

3.6 Native Module Strategy Comparison

Strategy
Refactoring Cost
CI/CD Complexity
Marketplace UX
Solves ABI Mismatch?
Risk
Solution 1: @vscode/sqlite3
High (Unknown)
Unknown
N/A
Maybe?
High (Trap)
Solution 2: WASM Migration
Very High
Low
Excellent
Yes (Eliminates)
High (Cost/Perf)
Solution 3: Platform-Specific VSIXs
None
Very High
Poor
Yes (Brute Force)
Medium (Ops)
Solution 4: Downloader Shim
None
Medium
Excellent
Yes (Elegant)
Low (Network)


4.0 Part 3: Comparative Analysis of Ancillary Decision Points


4.1 UI Framework Selection for WebView

The chat UI will be built in a VS Code WebView, providing full HTML/CSS/JS control. The choice of framework for this WebView is a trade-off between bundle size, performance, and developer experience.

4.1.1 Option 1: React + @vscode/webview-ui-toolkit (Gemini #1)

This is the "safe," officially-endorsed choice. The @vscode/webview-ui-toolkit provides a set of pre-built components that match the VS Code theme and handle accessibility.39
The cost, however, is performance and bundle size. React itself adds a 40kB+ runtime 40 and the computational overhead of a Virtual DOM.42 More importantly, the toolkit itself is heavyweight. Analysis of its package shows that each individual component (e.g., VSCodeButton, VSCodeTextField) adds 17-25kB GZIPped to the bundle.43 For a simple chat panel, this is significant and unnecessary bloat.

4.1.2 Option 2: Svelte (Gemini #2)

Svelte is a compiler, not a runtime framework.42 It shifts the work from the user's browser (runtime) to the developer's machine (compile-time).
Performance: Svelte produces the smallest possible bundles (its runtime is ~1.6KB 41) and consistently wins benchmarks for speed and memory usage.45 It does this by "disappearing" at build time, compiling components into highly-optimized, surgical JavaScript that updates the DOM directly, with no VDOM diffing.41
Developer Experience (DX): Svelte offers simple, built-in state management via "stores" 44, which is perfectly suited for managing the state of a chat UI (loading, streaming, error) without the overhead of external libraries. A guide for compiling Svelte for use in a VS Code WebView is available and straightforward.47

4.1.3 Option 3: Vanilla JavaScript (ChatGPT)

This option provides zero dependencies and the smallest possible bundle.40
The cost, however, is paid in engineering time and bugs. A modern, reactive chat UI is a complex application. It must manage multiple states (loading, streaming, error, ready), handle incoming token streams, and render complex Markdown with syntax highlighting. Building this with document.getElementById and manual state-tracking will result in unmaintainable "spaghetti code."

4.1.4 The "WebView Sweet Spot"

The choice is clear when analyzing the trade-offs:
The UI is too complex and reactive for Vanilla JavaScript.
The UI is too simple and self-contained to justify the large runtime and bundle overhead of React and its toolkit.41
Svelte hits the "sweet spot": it provides the powerful reactivity and state management of a modern framework but compiles down to the high-performance, small-bundle-size code of Vanilla JS.41
Verdict: Recommend Svelte. It is the objectively superior engineering choice for this specific use case.

4.2 UI Framework Showdown (WebView Context)


Framework
Bundle Size / Runtime
Runtime Performance
State Management
Developer Experience
React + Toolkit
Large 41
Good (VDOM Overhead)
External Libs (Zustand, etc.)
Good
Svelte
Smallest 41
Best 45
Built-in (Stores) 46
Excellent
Vanilla JS
None
Best
Manual (High Complexity)
Poor (for this use case)


5.0 Part 4: Final Recommendation and Implementation Roadmap for Arela v5.0.0


5.1 The Final Recommended Architecture (MVP: v5.0.0)

The verdicts from Parts 1, 2, and 3 synthesize into a single, cohesive, and robust architecture for the v5.0.0 MVP.
Architecture: Hybrid 2-Process (Coordinator + Server)
Process 1: Extension Host (Coordinator):
Runs the extension's activate logic.
Manages the WebView panel and all UI communication.
Manages the child_process lifecycle (spawn/kill) of the arela-server.
Handles all asynchronous, I/O-bound operations (e.g., AI API streaming, network requests).
Communicates with Process 2 via stdin/stdout IPC (e.g., JSON-RPC).
Process 2: arela-server (Child Process):
A standalone, pre-compiled Node.js binary.
This binary is the "jail" for all native module dependencies.
It contains better-sqlite3 and tree-sitter in its node_modules.
It exposes a simple IPC interface for synchronous, CPU-bound tasks (e.g., queryHexiMemory, getAST).
Because it runs as a standard Node.js process, it is not subject to the Electron ABI mismatch (as per 2.3.2).
UI Framework: Svelte (as per 4.1.4).
Distribution Strategy: "Downloader Shim" (as per 3.5.1).

5.2 The Strategic Roadmap (Long-Term: v5.1.0+)

This v5.0.0 architecture is stable, performant, and requires no up-front refactoring. It provides the ideal foundation for a de-risked, phased migration to the strategic WASM-First goal.

Phase 1 (v5.0.0): MVP Launch (4-5 weeks)

[ ] Repo Setup: Create a monorepo with two packages: extension (the VS Code extension) and server (the Node.js binary).
[ ] server: Add better-sqlite3 and tree-sitter dependencies. Build a simple IPC wrapper (e.g., json-rpc-stdio).
[ ] extension: Implement the Downloader Shim logic 3 to fetch the server binary from GitHub Releases 4 on first activation.
[ ] extension: Implement child_process management to spawn/kill the server process.
[ ] extension (WebView): Build the chat UI in Svelte, following the compilation guide.47
[ ] extension: Implement all consensus features: SecretStorage for API keys 48, AI streaming logic, Markdown rendering, etc.
[ ] CI/CD: Set up a GitHub Actions workflow:
Job 1: Matrix build for server binaries (all platforms).4
Job 2: Attach all binaries to a single GitHub Release.
Job 3: Build the single, universal extension VSIX.
Job 4: Publish the single VSIX to the Marketplace.4

Phase 2 (v5.1.0): WASM Migration - SQLite (3-4 weeks)

[ ] Goal: Eliminate the better-sqlite3 native dependency.
[ ] Task: Begin the "Cascading Async" refactor (as identified in 2.4.2) in a separate feature branch.
[ ] Task: Replace all better-sqlite3 synchronous calls with sql.js (WASM).5 This logic will likely move from the server to the extension (or an Extension Host Worker 8).
[ ] Task: Aggressively benchmark the sql.js in-memory/persistence model 30 against the HexiMemory database size.

Phase 3 (v5.2.0): WASM Migration - Tree-sitter (2-3 weeks)

[ ] Goal: Eliminate the tree-sitter native dependency.
[ ] Task: Replace all native tree-sitter calls with web-tree-sitter (WASM).6

Phase 4 (v5.3.0): Deprecate Server & Enable Web (1 week)

[ ] Goal: A single, universal, native-free VSIX.
[ ] Task: The arela-server binary is now obsolete. Delete the server package.
[ ] Task: Remove all "Downloader Shim" and child_process logic from the extension package.
[ ] Task: Simplify the CI/CD pipeline to a single vsce package and vsce publish command.4
[ ] Task: Add the browser entry point to the package.json and publish for VS Code for the Web.

5.3 Risk Assessment and Mitigation Plan

High Risk: arela-server Download Failure (v5.0.0)
Risk: The user is offline during first activation, is behind a corporate firewall that blocks GitHub, or GitHub Releases is down.
Mitigation 1: Implement robust error handling. The extension must "gracefully degrade," informing the user, "Arela Server binary download failed. Please check your internet connection or firewall settings. Retrying..."
Mitigation 2: Provide a fallback command (Arela: Install Server Manually) that allows a user to download a VSIX (or zip) from the GitHub releases page 49 and install the server from a local file.
Fallback: If this proves too unreliable for key enterprise users, the distribution model can be pivoted to "Platform-Specific VSIXs" (Solution 3.4), which bundles the server at the cost of CI/CD complexity.
Medium Risk: WASM Performance (v5.1.0)
Risk: sql.js's in-memory persistence model 30 proves to be too slow or memory-intensive for the HexiMemory use case.
Mitigation: The v5.0.0 2-process architecture is stable, performant, and shippable. The WASM migration (Phase 2) is a strategic, non-critical task. If benchmarking fails, this migration can be paused or abandoned without impacting the production extension. The 2-process model can be maintained indefinitely.
Low Risk: Svelte Team Familiarity
Risk: The engineering team may be React-focused and face a learning curve.
Mitigation: Svelte's API is famously simple and easy to learn.46 The ramp-up time for a single, self-contained chat panel is minimal and represents a valuable investment in a high-performance, lightweight technology.

6.0 Part 5: Re-affirmation of Consensus Points (High Confidence)

All four research reports were in unanimous agreement on several key implementation details. These are considered "solved" decisions.
WebView for Chat UI: Mandatory. Native VS Code components are insufficient for a rich, streaming chat experience.
Streaming AI Responses: Mandatory. Token-by-token streaming from the AI API is essential for a responsive user experience.
SecretStorage for API Keys: Non-negotiable for security. API keys must never be stored in settings.json. The context.secrets API 48 must be used, as it integrates with the host OS keychain (e.g., Windows Credential Manager, macOS Keychain) and prevents plain-text key exposure.51
Markdown Rendering with Syntax Highlighting: Mandatory for rendering AI responses, especially for code blocks.
Message Passing Protocol: A standard JSON-based message protocol between the WebView (vscode.postMessage()) and the Extension Host (webview.postMessage()) is confirmed.
Async Operations: All I/O-bound operations (network requests, IPC calls) must be async to prevent blocking the Extension Host. This analysis clarifies that this does not apply to CPU-bound synchronous code, which must be moved to a separate process (as per 2.2.3).
Context Integration: The core logic of loading persona files, context rules, and active editor content is affirmed.

7.0 Conclusion: The Path Forward

This report has resolved the critical architectural divergences present in the initial research. The "Extension Host Only" model is rejected as technically flawed and unviable. The "WASM-First" model is affirmed as the correct strategic destination, but rejected as a v5.0.0 starting point due to its high refactoring cost.
The recommended path synthesizes the best of all approaches:
It gains the performance isolation of the LSP model (Gemini #1) 9 by moving native code to a separate process.
It avoids the up-front refactoring of the WASM model (Gemini #2) by "jailing" the existing synchronous, native code.
It uses the most operationally simple distribution model (the "Downloader Shim") 3 to solve the native module crisis 11 that plagued the "Host Only" model.
This hybrid 2-process architecture for v5.0.0 is the most robust, pragmatic, and high-velocity path to market. It delivers a stable, high-performance extension to users immediately, while establishing a clear, de-risked roadmap toward the long-term strategic goal of a universal, WASM-based extension. The research phase is complete.
Works cited
Rust in Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/languages/rust
rust-analyzer, accessed on November 15, 2025, https://rust-analyzer.github.io/
Implement downloading of binary github releases from vscode extension · Issue #2988, accessed on November 15, 2025, https://github.com/rust-analyzer/rust-analyzer/issues/2988
Publishing Extensions - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/working-with-extensions/publishing-extension
Can I build a VS Code extension that uses sqlite that works on all platforms?, accessed on November 15, 2025, https://stackoverflow.com/questions/76838311/can-i-build-a-vs-code-extension-that-uses-sqlite-that-works-on-all-platforms
Tree-sitter: Introduction, accessed on November 15, 2025, https://tree-sitter.github.io/
Using WebAssembly for Extension Development - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/blogs/2024/05/08/wasm
Using WebAssembly for Extension Development - Part Two - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/blogs/2024/06/07/wasm-part2
Language Server Extension Guide - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
Native Node Modules | Electron, accessed on November 15, 2025, https://electronjs.org/docs/latest/tutorial/using-native-node-modules
Correct way to publish extensions with native modules? · microsoft vscode-discussions · Discussion #768 - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode-discussions/discussions/768
Performance Issues · microsoft/vscode Wiki - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode/wiki/performance-issues
Extensions using the "type" command (for ex. Vim) have poor performance due to being single-threaded with other extensions · Issue #75627 · microsoft/vscode - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode/issues/75627
node.js - Module compiled against a different NODE_MODULE_VERSION when developing an extension for vscode - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/71527006/module-compiled-against-a-different-node-module-version-when-developing-an-exten
Visual Studio Code using large amounts of CPU - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/51886037/visual-studio-code-using-large-amounts-of-cpu
better-sqlite3 - NPM, accessed on November 15, 2025, https://www.npmjs.com/package/better-sqlite3
Understanding Better-SQLite3: The Fastest SQLite Library for Node.js - DEV Community, accessed on November 15, 2025, https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8
Just because SQLite's API is synchronous does not mean that it must block the no... | Hacker News, accessed on November 15, 2025, https://news.ycombinator.com/item?id=16619080
What is the right way to mix `better-sqlite3` and async code? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/79635441/what-is-the-right-way-to-mix-better-sqlite3-and-async-code
Adding a Language Server Protocol extension - Visual Studio (Windows) | Microsoft Learn, accessed on November 15, 2025, https://learn.microsoft.com/en-us/visualstudio/extensibility/adding-an-lsp-extension?view=visualstudio
Can Language Server (LSP) run in the same process as devenv.exe ? - Microsoft Q&A, accessed on November 15, 2025, https://learn.microsoft.com/en-ie/answers/questions/2045617/can-language-server-(lsp)-run-in-the-same-process
How AI Extensions in VSCode Understand Code Context: Under the Hood - GoCodeo, accessed on November 15, 2025, https://www.gocodeo.com/post/how-ai-extensions-in-vscode-understand-code-context-under-the-hood
VSCode MCP: Real-time LSP for AI Agents in VS Code, accessed on November 15, 2025, https://mcpmarket.com/server/vscode-1
AI extensibility in VS Code | Visual Studio Code Extension API, accessed on November 15, 2025, https://code.visualstudio.com/api/extension-guides/ai/ai-extensibility-overview
GitHub Copilot in VS Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/copilot/overview
LSP-AI is an open-source language server that serves as a backend for AI-powered functionality, designed to assist and empower software engineers, not replace them. - GitHub, accessed on November 15, 2025, https://github.com/SilasMarvin/lsp-ai
Why do NODE_MODULE_VERSION and Node's version of Electron not follow Node's guideline? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/74418853/why-do-node-module-version-and-nodes-version-of-electron-not-follow-nodes-guid
Extending a client with the language server protocol - LogRocket Blog, accessed on November 15, 2025, https://blog.logrocket.com/how-to-use-the-language-server-protocol-to-extending-a-client-764da0e7863c/
Making Sense of tree-sitter's C API - DEV Community, accessed on November 15, 2025, https://dev.to/shrsv/making-sense-of-tree-sitters-c-api-2318
advantages of using SQLjs over SQLite native in NodeJS · Issue #350 - GitHub, accessed on November 15, 2025, https://github.com/sql-js/sql.js/issues/350
Is there a speed difference between sqlite3 and mysql? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/264457/is-there-a-speed-difference-between-sqlite3-and-mysql
Using better-sqlite3 in a VS Code extension · Issue #385 - GitHub, accessed on November 15, 2025, https://github.com/JoshuaWise/better-sqlite3/issues/385
Unable to integrate with Electron (Vscode extension) · Issue #1321 · WiseLibs/better-sqlite3, accessed on November 15, 2025, https://github.com/WiseLibs/better-sqlite3/issues/1321
VSCode extension build failing: npm ELSPROBLEMS with tree-sitter - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/79782545/vscode-extension-build-failing-npm-elsproblems-with-tree-sitter
microsoft/vscode-node-sqlite3: Asynchronous, non-blocking SQLite3 bindings for Node.js, accessed on November 15, 2025, https://github.com/microsoft/vscode-node-sqlite3
Booleans in better-sqlite3 · Issue #4955 · knex/knex - GitHub, accessed on November 15, 2025, https://github.com/knex/knex/issues/4955
semantic-release-vsce - NPM, accessed on November 15, 2025, https://www.npmjs.com/package/semantic-release-vsce
Extension Marketplace - Visual Studio Code, accessed on November 15, 2025, https://code.visualstudio.com/docs/configure/extensions/extension-marketplace
microsoft/vscode-webview-ui-toolkit: A component library for building webview-based extensions in Visual Studio Code. - GitHub, accessed on November 15, 2025, https://github.com/microsoft/vscode-webview-ui-toolkit
Why Learn Svelte in 2025? The Value Proposition & Svelte vs React & Vue, accessed on November 15, 2025, https://dev.to/a1guy/why-learn-svelte-in-2025-the-value-proposition-svelte-vs-react-vue-1bhc
Svelte vs React: A Comprehensive Comparison for Developers - Strapi, accessed on November 15, 2025, https://strapi.io/blog/svelte-vs-react-comparison
React vs. Vue vs. Svelte: The Real 2025 Guide to Picking Your First JavaScript Framework, accessed on November 15, 2025, https://clinkitsolutions.com/react-vs-vue-vs-svelte-the-real-2025-guide-to-picking-your-first-javascript-framework/
@vscode/webview-ui-toolkit v1.4.0 Bundlephobia, accessed on November 15, 2025, https://bundlephobia.com/package/@vscode/webview-ui-toolkit
Svelte vs React state management (beginner level) : r/sveltejs - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/sveltejs/comments/zogi81/svelte_vs_react_state_management_beginner_level/
Comparing front-end frameworks for startups in 2025: Svelte vs React vs Vue - Merge Rocks, accessed on November 15, 2025, https://merge.rocks/blog/comparing-front-end-frameworks-for-startups-in-2025-svelte-vs-react-vs-vue
Svelte vs React: Which Tool Should You Choose in 2025? - Distant Job, accessed on November 15, 2025, https://distantjob.com/blog/svelte-vs-react/
Using Svelte To Build Webviews for VS Code Custom Editor Extensions | by Kyle Kukshtel, accessed on November 15, 2025, https://medium.com/@kkukshtel/using-svelte-to-build-webview-vs-code-custom-editor-extensions-2187aef7bb9f
visual studio code - How to use the vscode.SecretStorage? - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/66568692/how-to-use-the-vscode-secretstorage
How to install a VSCode Extension from Source Code - Stack Overflow, accessed on November 15, 2025, https://stackoverflow.com/questions/67634372/how-to-install-a-vscode-extension-from-source-code
Need help finding how to download the vsix file for extensions : r/vscode - Reddit, accessed on November 15, 2025, https://www.reddit.com/r/vscode/comments/1i2v8u2/need_help_finding_how_to_download_the_vsix_file/
Why Every Developer's API Keys Are Probably in the Wrong Place And how a VS Code Extension Finally… - Medium, accessed on November 15, 2025, https://medium.com/@dingersandks/why-every-developers-api-keys-are-probably-in-the-wrong-place-and-how-a-vs-code-extension-finally-c966d081d132
