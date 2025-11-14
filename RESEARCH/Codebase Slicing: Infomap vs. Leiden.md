
An Analytical Comparison of Flow-Based and Modularity-Based Community Detection for Software Architecture Analysis


I. Executive Summary: The Case for Information Flow in Codebase Analysis

Direct Answer to Primary Question:
The central hypothesis that Infomap is the optimal algorithm for detecting vertical slices is, from a conceptual and theoretical standpoint, correct. The analysis of academic literature and algorithmic first principles strongly supports this conclusion. The user's conceptual model—equating a "vertical slice" with a region of the codebase where a developer "gets stuck"—is a precise analogue for Infomap's objective function: minimizing the description length of a random walk on a network.1 A vertical slice is an information flow trap, and Infomap is designed to find exactly these.3
In contrast, modularity-based optimization, the family to which Louvain and Leiden belong, is based on an entirely different and less suitable premise. It optimizes for "link density" against a random null model 4, an objective that is notoriously problematic on the exact type of small, dense, clique-like graphs that characterize this use case.6
Analysis of Current Failure:
The reported failure of the Louvain implementation—resulting in 13 singleton communities rather than the expected 5 slices—is a critical diagnostic finding. However, attributing this to the "resolution limit" is a common misdiagnosis. The canonical resolution limit of modularity describes the forced merging of small, distinct communities into larger ones.7 The observed behavior is the opposite: a pathological failure to merge anything.
This failure indicates that the modularity objective function itself is fundamentally incompatible with the project's graph topology (a set of sparsely-connected, fully-connected cliques). This is not a failure of the Louvain search heuristic but of the modularity landscape it is trying to optimize. Therefore, switching to default Leiden, which optimizes the same function, will not solve the problem.4
Key Alternatives and Recommendations:
A comprehensive solution requires moving beyond standard modularity. This report identifies two superior flow-based algorithms and a method to re-engineer the one viable modularity-based approach.
Primary Recommendation: Infomap. This algorithm should be the primary focus. Its information-theoretic model of flow is the most accurate proxy for codebase dependencies.
Strong Alternative: Markov Clustering (MCL). A second, powerful flow-based algorithm that operates on principles of stochastic flow and matrix operations.10 Benchmarks on analogous problems (recovering small, dense cliques from noisy data) show MCL and Infomap are the only algorithms that perform well, whereas Louvain and Leiden fail catastrophically.6
The Viable Fix: Leiden with CPM. The only way to salvage a modularity-based approach is to abandon the default modularity function. The Leiden algorithm must be used with the Constant Potts Model (CPM) objective function 13, which is not subject to the resolution limit and can be tuned to find communities of a specific size.13
The Path Forward: A Hybrid Solution:
Success depends on more than just algorithm selection. The current graph model (e.g., weight=1.0 for all edges) is a primary contributor to the failure. A robust solution requires a three-part strategy:
Adopt a Flow-Based Algorithm: Implement Infomap as the primary candidate and MCL as a strong secondary.
Refine Graph Modeling: Rebuild the graph as a directed, weighted network where edge weights represent the probability of information flow, differentiating between hard import dependencies and soft directory coupling heuristics.
Implement Hybrid Post-Processing: The most difficult edge cases—distinguishing "good" singletons (main.go) from "bad" singletons (shared/utils.go)—cannot be solved by any clustering algorithm alone. The only robust solution is a two-stage process: use Infomap/MCL to find the topologically correct partitions, and then apply a simple, application-level topological filter to classify the resulting communities based on their graph properties (e.g., in-degree vs. out-degree).
This report provides the full theoretical and practical guidance to execute this strategy.

II. Deconstructing the Louvain Failure: Why Modularity Optimization Fails on Dense Codebase Graphs

The current implementation's failure to produce any communities, instead returning all 13 nodes as singletons, is the most important piece of data for diagnosing the problem. This behavior is often mis-ascribed to the "resolution limit," but the underlying mechanism is different and reveals a fundamental incompatibility between the modularity function and the problem's graph structure.

The Misdiagnosis: Classic Resolution Limit vs. Singleton Convergence

The "resolution limit," as described in network science, is a well-known flaw in modularity-based algorithms. It refers to the algorithm's inability to detect small communities if the graph is large. The modularity function may globaly increase by merging two distinct, small communities, even if they are well-defined cliques, effectively hiding them from detection.7 This behavior is a merging problem.
The observed problem—13 singletons—is a splitting problem. It is a total failure of the algorithm to find any community structure that it deems better than the initial state (where every node is its own community).15 Some research has noted this phenomenon of modularity optimization converging on partitions with "plenty of small communities (often singletons)" in certain network types, distinct from the classic merging issue.16
This indicates that the modularity score of the fully partitioned, 13-singleton graph is a local maximum, and any attempt by the greedy Louvain algorithm to merge two nodes (e.g., auth/handlers.go and auth/models.go) results in a decrease in the global modularity score, causing the move to be rejected.

A Pathological Topology for Modularity

The root cause of this failure is that the project's graph model creates a topology that is pathological for the modularity objective function.
The Graph Structure: The graph is a set of small (3-node), fully-connected cliques (the "vertical slices," formed by bidirectional directory coupling edges). These cliques are then sparsely connected to each other by a few directed import edges.
Modularity's Objective Function: Modularity ($Q$) measures the fraction of edges within communities minus the expected fraction of such edges in a randomized null model (e.g., the configuration model).17 $Q = \sum_{c} [\frac{L_{c}}{m} - (\frac{k_{c}}{2m})^2]$, where $L_c$ is the number of internal edges in community $c$, $k_c$ is the total degree of nodes in $c$, and $m$ is the total number of edges in the graph.
The Failure Point: A core flaw of modularity optimization, even beyond the resolution limit, is its potential to disregard cohesion. Research has demonstrated that modularity-optimizing algorithms can cut through cliques if doing so provides a "compromise with good separation" at the global level.3
In this specific 13-node, 29-edge graph, the graph is extremely small. The null model's "expected" number of edges is sensitive and unstable. When the algorithm considers moving auth/handlers.go into a community with auth/models.go, it evaluates the change in $Q$. Because the graph is so small and the cliques are so dense, the penalty from the null model term ($(\frac{k_{c}}{2m})^2$) may outweigh the gain from the internal edge term ($\frac{L_{c}}{m}$). The algorithm concludes, pathologically, that the 13-singleton partition is the optimal one.

Why Leiden Will Also Fail

The Leiden algorithm is a modern, superior replacement for the Louvain search method.4 It is faster, more efficient, and, most importantly, includes a refinement phase to guarantee that all detected communities are well-connected, solving Louvain's problem of returning disconnected or poorly-formed communities.19
However, in its default mode (la.ModularityVertexPartition), Leiden optimizes the exact same modularity function as Louvain.4 While its search is smarter, it is still searching for the highest peak in the same pathological modularity landscape. It will be drawn to the same local maximum (or a very similar one) and is highly likely to also return singletons or an otherwise useless partition.

Validation from Analogous Benchmarks

The most compelling evidence against using standard modularity comes from a benchmark study on clustering local Identity-By-Descent (IBD) graphs in genomics.6 This problem is highly analogous to the codebase problem:
IBD Graphs: The goal is to recover small, disjoint, dense cliques (groups of related individuals) from a graph obscured by false-positive and false-negative edges.6
Codebase Graphs: The goal is to recover small, disjoint, dense cliques (vertical slices) from a graph where import links are "true" edges and directory coupling edges are synthetic "clique-forming" edges.
The benchmark's findings were definitive: Louvain and Leiden performed with the lowest statistical power, far worse than all other methods. The study concluded that their greedy modularity optimization tends to merge lightly connected subgraphs and that the resolution limit (which they did observe, demonstrating the function's instability) caused them to fail to find the small, well-defined communities.6
This confirms that whether the modularity function causes pathological splitting (as in this case) or pathological merging (as in the IBD benchmark), it is an unstable and incorrect objective function for recovering small, clique-like communities. The user must abandon this entire family of algorithms.

III. A Comparative Algorithmic Triangulation for Vertical Slice Detection

The user's problem is not one of "link density" but of "information flow." The developer's workflow, the import statements, and the file-level dependencies all represent the movement of information and logical control. The chosen algorithm must be based on a model that captures this dynamic process. This analysis compares the three most viable candidates: Infomap (the conceptual ideal), Markov Clustering (a powerful flow-based alternative), and Leiden-CPM (the only viable modularity-based fix).

1. Infomap (Information Flow Model)

Conceptual Fit: Perfect. Infomap is the flagship algorithm for the "map equation".23 Its objective function is not based on link density but on information theory. It seeks to find the network partition that provides the shortest possible description length for a random walk on the graph.1
Mechanism: The core intuition is that a random walker will "get stuck" in densely connected regions, or "modules".3 To create a compressed description (a "map"), Infomap assigns short "code names" to modules and re-uses node names within those modules (like street addresses being reused in different cities).2 The optimal partition is the one that minimizes the total length of this map, which represents the most efficient boundaries for "trapping" the flow.24 This directly models the user's concept of a developer "getting stuck" in the auth/ feature slice.
Handling of Cliques: Excellent. A clique is the ultimate "trap" for a random walker. The walker enters and has an extremely high probability of remaining for a long time. Unlike modularity, which may cut cliques 3, Infomap's objective function is maximized by preserving them.
Small/Dense Graphs: Infomap is well-suited for this domain. The IBD benchmark, which focused on small, dense, clique-like structures, found that Infomap had high statistical power and stability, far exceeding Louvain and Leiden.6
Hierarchy: Infomap is inherently hierarchical (multi-level) by default.25 It can find modules within modules. This is a perfect match for the user's features -> slices -> files conceptual model. For the immediate goal of finding 4-6 top-level slices, the algorithm can be forced into a flat, two-level partition using the --two-level flag.25

2. Markov Clustering (MCL) (Stochastic Flow Model)

Conceptual Fit: Very strong. MCL is also a flow-based model, based on simulating stochastic flow (random walks) through the graph.10
Mechanism: MCL operates directly on the graph's adjacency matrix and simulates flow by alternating two matrix operations 12:
Expansion: Takes the power of the matrix (e.g., $M^2$), which simulates one step of a random walk. This allows flow to spread out.12
Inflation: Takes the Hadamard power of the matrix (raising each element to a power $r$, e.g., $M_{ij}^r$) and re-normalizes the columns. This boosts strong flow paths (within-community) and prunes weak flow paths (between-community).12
This process is repeated until it converges, with the "inflated" strong-flow paths revealing the clusters. It is a "winner-take-all" flow process.
Handling of Cliques: Excellent. The IBD genomics benchmark found MCL to be the top-performing algorithm for recovering dense cliques, producing a 30% increase in statistical power over the next-best approach.6 Its performance was attributed to its flow-based nature and its immunity to the resolution limit that plagued Louvain/Leiden.7
Small/Dense Graphs: MCL is explicitly noted to perform well on dense networks.29 Its runtime is fast, and its results are deterministic—a given input and parameter set will always produce the same output, which is a key advantage for stability.
Tuning: Simplicity is its key feature. The granularity of the clustering is controlled by a single parameter: inflation (the $r$ value).10 Higher inflation leads to more, smaller clusters; lower inflation leads to fewer, larger clusters.10

3. Leiden (with Constant Potts Model (CPM))

Conceptual Fit: A patch, not a true fit. This approach abandons the flawed modularity function and substitutes another, but it remains a density-based model, not a flow-based one.
Mechanism: This is the only way to make Leiden viable for this problem. The user must abandon the default ModularityVertexPartition and explicitly use CPMVertexPartition.14 The Constant Potts Model (CPM) is an objective function that is not subject to the resolution limit.13 It has a tunable resolution_parameter (often denoted $\gamma$ or gamma) that directly controls the balance between internal edge weights and a penalty for community size.19
Tuning: The resolution_parameter directly controls the granularity of the output 19:
$\gamma > 1$: Favors more and smaller communities (high resolution).
$0 < \gamma < 1$: Favors fewer and larger communities (low resolution).
The user's current failure (13 singletons) suggests they are implicitly operating at a high resolution. To get the desired 4-6 slices, they must tune this parameter to a value significantly less than 1.0 (e.g., 0.5, 0.2) to force the algorithm to merge nodes into larger communities.14
Weakness: This is a finicky, "unnatural" process. The $\gamma$ parameter has no a priori correct value; it is a "magic number" that will require per-project tuning to find the "right" number of clusters.35 This is brittle for a general-purpose tool, unlike Infomap or MCL, whose parameters (or lack thereof) are more closely tied to the process of flow.

Comparative Assessment

The choice of algorithm depends on the user's priorities, but the flow-based models are conceptually and empirically superior for this specific task.
Table 1: Algorithmic Assessment for Vertical Slice Detection

Feature
Infomap (Primary Recommendation)
Markov Clustering (MCL) (Strong Alternative)
Leiden (with CPM) (Viable Fix)
Conceptual Model
Information Flow.1 Minimizes description length of a random walk. A direct proxy for developer workflow.
Stochastic Flow.10 Simulates random walks via matrix Expansion/Inflation.
Link Density.13 Optimizes internal density vs. a resolution parameter. Not a flow model.
Resolution Limit
Not Susceptible. The map equation does not suffer from the modularity resolution limit.3
Not Susceptible. The flow simulation process is not based on a null-model comparison.
Not Susceptible (if using CPM). CPM objective function is explicitly "resolution-limit-free".13
Handling of Cliques
Excellent. A clique is an ideal "trap" for a random walker.3 It is identified and preserved.
Excellent. Benchmarked as a top performer for recovering dense cliques.6
Good (with CPM). CPM's goal is to find dense subgraphs. Avoids the clique-cutting of modularity.3
Handling of Hubs (utils.go)
Conceptually Correct. A hub is a "flow distributor," not a "trap".37 Will be isolated as a singleton. Requires post-processing.
Conceptually Correct. Flow arrives and immediately dissipates. Will be isolated as a singleton. Requires post-processing.
Poor. Hubs are "connector" nodes.39 CPM will likely (and incorrectly) merge the hub with an adjacent cluster.
Handling of Singletons (main.go)
Excellent. Disconnected/low-degree nodes are naturally isolated as singletons.41
Excellent. Disconnected nodes will form their own singleton clusters.
Tunable. A singleton will be merged unless the resolution_parameter is high enough. May be hard to balance.
Key Parameter
--two-level (for flat partition) 25

-N <trials> (for stability) 42
inflation (float, e.g., 1.4-4.0).10 Controls granularity.
resolution_parameter (float).14 Controls granularity. Must be tuned < 1.0.19
Stability
High. Heuristic, but multiple trials (-N) produce stable results.42
Deterministic. Given the same input and parameters, will always produce the same output.
High. Leiden is a stable algorithm.


IV. Proposed Solution Framework: Graph Modeling and Weighting Strategy

The failure of the current system is not solely due to algorithm choice. The graph model itself—using a uniform weight=1.0 for all edges—is a critical flaw. It treats a hard, explicit dependency (import) as semantically identical to a soft, heuristic grouping (directory coupling). This "flattens" the information landscape and confuses any clustering algorithm, especially flow-based ones.
A random walker on the current graph sees no difference between following a critical import path and simply moving to an adjacent file in the same directory. To fix this, the graph model must be rebuilt to reflect the semantics of the dependencies.

Recommended Graph Model: Directed and Weighted

Use a Directed Graph: Code dependency is fundamentally directional. handlers.go imports models.go; information flows from models to handlers. This is not a bidirectional relationship. Infomap is explicitly designed to leverage the information in directed graphs 25 and has specific flow models (like --flow-model directed) to handle this.25 Using an undirected graph (as Leiden-CPM may require 13) throws away critical information.
Use Weighted Edges: In flow-based algorithms like Infomap, edge weights are not arbitrary "strengths"; they represent the probability that a random walker will follow that edge.25 The weights must be set to reflect this.

Proposed Weighting Heuristic

This is a domain-specific weighting strategy 45 designed to model the "developer workflow" proxy.
Directed import edges: weight = 1.0
Rationale: These are the "superhighways" of information flow. If handlers.go imports models.go, a developer working on handlers.go must (conceptually) follow this path to understand the data. This is a high-probability, non-negotiable flow of information.
Bidirectional directory coupling edges: weight = 0.25 (or some other $w \ll 1.0$)
Rationale: This represents the "local roads." It is a weaker heuristic. It suggests a developer working on auth/handlers.go might also look at auth/routes.go because they are in the same feature. The bidirectional nature reflects this non-directional "browsing" or "co-location" coupling.
Critically: The weight must be significantly lower than the import weight.

The Impact of the New Model

This differentiated, directed, weighted graph 46 is the essential prerequisite for Infomap or MCL to function correctly. Consider the impact on a random walker (and thus, Infomap's objective function):
Scenario: The walker is at auth/handlers.go.
Old Model (All weight=1.0): The walker has (for example) 1 import link out, 1 import link in (treated as 'out' in an undirected graph), and 2 directory links. The probability of following the correct import to auth/models.go is 1/4 = 25%. The probability of leaving the slice to shared/utils.go is 1/4 = 25%. The flow is confused and diluted.
New Model (Weighted, Directed): The walker is at auth/handlers.go.
It has one outgoing import edge to shared/utils.go (weight 1.0).
It has two outgoing directory edges to auth/models.go (weight 0.25) and auth/routes.go (weight 0.25).
It has two incoming directory edges from models and routes (weights 0.25 each).
An import from auth/models.go is an incoming edge and does not define an outgoing path for the walker.
Result: The total outgoing flow from handlers is $1.0 + 0.25 + 0.25 = 1.5$.
The probability of leaving the slice (to utils) is $1.0 / 1.5 = 66.7\%$.
The probability of staying in the slice (via directory links) is $(0.25 + 0.25) / 1.5 = 33.3\%$.
Wait, this analysis reveals a flaw in the heuristic. The import link (a strong dependency) is drowning out the weak (but community-forming) directory links. The model must be refined.
Refined Weighting Heuristic (Version 2):
The problem is that import weights define inter-community flow, while directory weights define intra-community flow. The goal is to make the total intra-community flow high.
Let's re-examine the user's graph. The imports are sparse. The directory coupling creates the cliques. This means the directory coupling edges are the primary community-forming links, and the import edges are the (undesirable) bridges between them.
Bidirectional directory coupling edges: weight = 1.0
Rationale: These define the "vertical slice" clique. This is the strongest, most important signal. Flow should be trapped here.
Directed import edges: weight = 0.1 (or $w \ll 1.0$)
Rationale: These are the leaks between slices. A developer can follow them, but it represents "leaving" the feature. The flow probability should be low.
Impact of Refined Model (Version 2):
Scenario: The walker is at auth/handlers.go.
Refined Model:
It has one outgoing import edge to shared/utils.go (weight 0.1).
It has two outgoing directory edges to auth/models.go (weight 1.0) and auth/routes.go (weight 1.0).
Result: The total outgoing flow from handlers is $0.1 + 1.0 + 1.0 = 2.1$.
The probability of leaving the slice (to utils) is $0.1 / 2.1 \approx 4.8\%$.
The probability of staying in the slice (via directory links) is $(1.0 + 1.0) / 2.1 \approx 95.2\%$.
This is a dramatically better model. It creates a powerful information-flow "trap" within the auth/ directory, which is precisely what Infomap is designed to detect.3 This refined, weighted, directed graph model is the essential prerequisite for success.

V. Handling the Critical Edge Cases: Singletons, Hubs, and Circularity

The success of the "Arela" tool hinges on its ability to correctly handle the specific topological edge cases defined in the user's success criteria. A "dumb" clustering algorithm will fail. A flow-based algorithm, however, provides conceptually correct (though perhaps counter-intuitive) behavior that can be leveraged.

1. The Singleton (main.go)

Topology: This file is a "source" of information flow. It has a high out-degree (it imports auth, combat, resources, etc.) but a zero in-degree (no feature slice imports main.go).
Flow-Based Behavior (Infomap/MCL):
A random walker, upon arriving at main.go (e.g., via a teleportation event, which is part of the underlying Markov model), has a 100% probability of immediately leaving to one of the feature slices it imports.
It is impossible for the walker to get "trapped" in this node. It is a source, not a trap.
Result: Both Infomap and MCL will correctly and naturally identify main.go as its own singleton community. It is topologically distinct from all other modules. Infomap's maintainers confirm that disconnected or source/sink nodes are typically placed in their own singleton modules.38
Modularity-Based Behavior (Leiden-CPM):
This is far less certain. The resolution_parameter ($\gamma$) creates a tuning conflict.
To merge the feature slices into 4-6 large communities, $\gamma$ must be set low (e.g., $< 1.0$).19
But to prevent main.go from being merged with one of its neighbors, $\gamma$ must be set high.
It may be impossible to find a single $\gamma$ value that simultaneously merges the large slices and isolates the main.go singleton. This is another strong argument against the Leiden-CPM approach.

2. The Hub (shared/utils.go)

This is the most complex and critical edge case.
Topology: This file is a "connector hub" 39 or "utility." It has a high in-degree (all feature slices import it) but a zero or very low out-degree (it is self-contained).
The User's Paradox: The user's success criteria are contradictory. They want main.go (a singleton) to be kept as a slice, but utils.go (also a singleton, as we will see) to be ignored as a slice. No clustering algorithm can distinguish semantic intent ("this is the main app" vs. "this is a shared lib"). It can only report topological facts.
Modularity-Based Failure (Leiden-CPM):
Modularity and CPM optimization algorithms will fail this test. A hub node is a "community bridge".48 The algorithm, in its greedy optimization, will be forced to make a "bad" decision: merge utils.go with one of the slices, likely the one it is "most" connected to or the largest one. This is arbitrary, incorrect, and will "pollute" the auth slice (for example) with a shared utility.
Flow-Based Behavior (Infomap/MCL):
This is where flow-based models demonstrate their conceptual superiority. utils.go is a sink node.
Flow arrives at utils.go from auth, combat, and resources. Because utils.go has no out-links, the random walker, upon arriving, is "stuck."
In a standard random walk model, this is handled via "teleportation." The walker teleports to a random node in the graph. This means flow arrives at utils.go from all slices and immediately dissipates across the entire graph.
Result: utils.go is not a "trap." It is a "flow distributor" 37 or a "sink".38 It does not belong to auth, nor combat, nor resources. The flow-based algorithm correctly identifies this topological fact and isolates utils.go as its own singleton community.

The Hybrid Solution: A Post-Processing Singleton Classifier

The analysis reveals that the correct output of a flow-based algorithm on the "Zombie" graph (with main.go and utils.go) is not 5 slices, but 7 clusters:
[auth/handlers.go, auth/models.go, auth/routes.go]
[combat/handlers.go, combat/models.go, combat/routes.go]
[survivors/handlers.go, survivors/models.go, survivors/routes.go]
[resources/handlers.go, resources/models.go, resources/routes.go]
[main.go] (Singleton 1)
[shared/utils.go] (Singleton 2)
(any other disconnected components)
The problem is not the algorithm; it's the interpretation of the output. The user's tool, "Arela," must distinguish types of singletons. This cannot be done at the clustering level. It must be done at the application level with a simple topological filter.
Proposed Post-Processing Algorithm ("Singleton Classifier"):
This algorithm is applied after Infomap/MCL has returned its cluster list.



# G is the directed, weighted graph
# 'communities' is the list of clusters from Infomap/MCL
# (e.g., [[main], [auth1, auth2], [utils]])

# K_in_threshold (e.g., 3): Min in-degree to be considered a "hub"
# L_out_threshold (e.g., 1): Max out-degree to be considered a "hub"

vertical_slices =

for C in communities:
    if len(C) > 1:
        # This is a multi-node feature slice. KEEP.
        vertical_slices.append(C)
    else:
        # This is a singleton community. We must classify it.
        node_id = C
        node = G.nodes[node_id]
        
        in_degree = G.in_degree(node_id)
        out_degree = G.out_degree(node_id)

        if in_degree > K_in_threshold and out_degree <= L_out_threshold:
            # High in-degree, low out-degree
            # -> This is a "Shared Utility" (utils.go). IGNORE.
            pass
        else:
            # Low in-degree, high out-degree (main.go)
            # OR an isolated, disconnected file
            # -> This is a "Singleton Slice." KEEP.
            vertical_slices.append(C)

# 'vertical_slices' now contains only the desired feature slices
# and the 'main.go' singleton, while the 'utils.go' hub is filtered out.


This hybrid, two-stage process is the only robust solution. It uses the flow-based algorithm for what it's good at (finding flow boundaries) and a simple topological heuristic for what it is good at (classifying node roles).

3. Circular Dependencies

Topology: Slice A imports slice B, and slice B imports slice A.
Flow-Based Behavior: This is a non-issue. It simply creates a strong, bidirectional flow path between the nodes/communities. A random walker entering A will flow to B, and from B will flow back to A. This creates a powerful "trap" that spans both A and B.
Result: Infomap and MCL will (correctly) be more likely to merge A and B into a single community. This is the correct semantic interpretation: a strong circular dependency implies that A and B are no longer two separate "vertical slices" but have become one highly-coupled "feature area."

4. Disconnected Components

Topology: Two feature modules (auth and inventory) that have zero import links between them and are in separate directories.
Flow-Based Behavior: Trivial. A random walker in auth can never flow to inventory.
Result: The graph consists of two (or more) disconnected components. All three algorithms (Infomap, MCL, Leiden-CPM) will, by definition, place these components in separate clusters.21 This is a core strength of all community detection methods.

VI. Practical Implementation & Tuning: A Guide for Infomap, Leiden-CPM, and MCL

This section provides actionable, code-level guidance for implementing the three analyzed algorithms, focusing on the specific libraries and parameters required for the codebase analysis use case.

1. Algorithm 1: Infomap (Primary Recommendation)

Installation: The official mapequation Python package is the recommended method.
Bash
pip install infomap

This provides the latest C++ backend with a Python API.25
Graph Construction & Execution (Python API):
Python
import infomap
import networkx as nx # Assuming graph data comes from NetworkX

# --- 1. Create a NetworkX DiGraph with the Refined Weighting Model ---
# (This is just an example; the graph can be built directly in Infomap)
G_nx = nx.DiGraph()

# Add nodes (files)
# G_nx.add_node(0, name="main.go")
# G_nx.add_node(1, name="auth/handlers.go")
# G_nx.add_node(2, name="auth/models.go")
#...

# Add edges (dependencies)
# Refined Model: directory coupling = 1.0, import = 0.1

# Example: auth slice (clique-forming edges)
G_nx.add_edge(1, 2, weight=1.0) # dir: handlers <-> models
G_nx.add_edge(2, 1, weight=1.0)
# G_nx.add_edge(1, 3, weight=1.0) # dir: handlers <-> routes
# G_nx.add_edge(3, 1, weight=1.0)
# G_nx.add_edge(2, 3, weight=1.0) # dir: models <-> routes
# G_nx.add_edge(3, 2, weight=1.0)

# Example: main importing auth (leakage edge)
G_nx.add_edge(0, 1, weight=0.1) # import: main -> auth/handlers

# Example: auth importing utils (leakage edge)
# G_nx.add_edge(1, 4, weight=0.1) # import: handlers -> utils.go


# --- 2. Instantiate Infomap with Recommended Flags ---
# We pass arguments as a string to the constructor [49]
# --directed: Critical for modeling 'import' flow 
# --two-level: Forces a flat partition (for 4-6 slices) 
# -N 20: Number of trials. Essential for stability on heuristic search [26, 42]
# --silent: Suppresses console output
im = infomap.Infomap("--directed --two-level -N 20 --silent")

# --- 3. Add Graph Data to Infomap ---
# The Infomap Python API can add links directly.
# We can also use NetworkX integration.
for source, target, data in G_nx.edges(data=True):
    # Infomap's add_link takes (source_id, target_id, weight)
    im.add_link(source, target, data.get('weight', 1.0)) [42, 49]

# --- 4. Run the Algorithm ---
im.run()

print(f"Infomap found {im.num_top_modules} top-level modules.")

# --- 5. Parse the --two-level Output ---
# The output is a flat structure, easy to parse.
# 'im.tree' provides an iterator over the hierarchy.
slices = {}
for node in im.tree:
    if node.is_leaf:
        # node.module_id is the top-level slice/community ID
        # node.node_id is the original file ID (if added sequentially)
        if node.module_id not in slices:
            slices[node.module_id] =
        slices[node.module_id].append(node.node_id)

# 'slices' is now a dict: {1: , 2: , 3: ,...}

# --- 6. Apply Post-Processing Filter (from Section V) ---
# (Implement the singleton classification logic here)


Hierarchical Output (Alternative): If the features -> slices -> files model is desired, simply remove the --two-level flag. The default multi-level output 25 can be parsed by iterating im.tree and inspecting the node.path attribute, which gives the full hierarchical assignment (e.g., `` meaning feature 1 -> slice 2 -> file 4).1

2. Algorithm 2: MCL (Primary Alternative)

Installation: The markov_clustering library is available, but it is often easier to use the cdlib (Community Detection Library) package, which provides a standardized wrapper for MCL and many other algorithms.11
Bash
pip install cdlib networkx markov_clustering

(cdlib requires markov_clustering to be installed 52)
Graph Construction & Execution (cdlib API):
Python
import networkx as nx
from cdlib import algorithms

# --- 1. Create the NetworkX DiGraph (G_nx) ---
# (Use the same G_nx from the Infomap example)

# --- 2. Run MCL via cdlib ---
# The key parameter is 'inflation' 
# Default is 2.0. To get fewer, larger clusters (4-6),
# a *lower* inflation value (e.g., 1.4, 1.6) is needed.

inflation_to_try = 1.6 # Start here and tune

# cdlib's MCL wrapper takes the NetworkX graph directly [11]
coms = algorithms.markov_clustering(
    G_nx,
    inflation=inflation_to_try,
    pruning_threshold=0.001, # Default, helps performance
    iterations=100 # Default, max iterations
)

# --- 3. Parse the Output ---
# 'coms' is a NodeClustering object.
# 'coms.communities' is a list of lists.
slices = coms.communities

print(f"MCL (inflation={inflation_to_try}) found {len(slices)} slices.")
# Example output: [, , ,...]

# --- 4. Apply Post-Processing Filter (from Section V) ---
# (Implement the singleton classification logic here)



3. Algorithm 3: Leiden-CPM (The Finicky Fix)

Installation: Requires the leidenalg and python-igraph libraries.14
Bash
pip install leidenalg python-igraph


Graph Construction & Execution (leidenalg API):
Python
import igraph as ig
import leidenalg as la
import networkx as nx

# --- 1. Create the NetworkX DiGraph (G_nx) ---
# (Use the same G_nx from the Infomap example)

# --- 2. Convert to igraph (with a key limitation) ---
# The Leiden C++ backend's CPM objective function
# is best supported for UNDIRECTED graphs.
# This is a major conceptual loss, as we lose flow direction.
# We must "flatten" the graph.

# Create an undirected igraph Graph
G_ig = ig.Graph.from_networkx(G_nx, create_using=ig.Graph(directed=False))

# Ensure weights are carried over
G_ig.es['weight'] = G_nx.get_edge_attributes('weight').values()

# --- 3. Run Leiden, specifying CPMVertexPartition ---
# This is the most critical step. DO NOT use the default.
# We *must* use CPMVertexPartition.[13, 14, 22]

# The key is 'resolution_parameter'. The user is getting 13 singletons,
# so the default resolution is too high. We must tune < 1.0
# to *force* the algorithm to merge nodes.

resolution_to_try = 0.2 # Start low and tune upwards

partition = la.find_partition(
    G_ig,
    la.CPMVertexPartition,
    weights='weight', # Tell it to use the 'weight' edge attribute [22]
    resolution_parameter=resolution_to_try,
    n_iterations=-1 # Run until convergence
)

# --- 4. Parse the Output ---
# 'partition' is a VertexClustering object
slices = list(partition) # Simply cast to a list of lists

print(f"Leiden-CPM (res={resolution_to_try}) found {len(slices)} slices.")
# Example output: [, , ,...]

# --- 5. Apply Post-Processing Filter (from Section V) ---
# (Implement the singleton classification logic here)



VII. Definitive Recommendation and Validation Protocol


Final Verdict

Primary Recommendation: Infomap. This algorithm is the only one analyzed that is 100% conceptually aligned with the project's "information flow" model. It natively supports the required directed, weighted graph. Its handling of hubs (utils.go) and sources (main.go) as singletons is algorithmically correct and, most importantly, predictable. This predictability is essential for building the required post-processing filter.
Secondary Recommendation: MCL. This is a very strong, flow-based alternative. Its primary benefits are its deterministic output and its simplicity of tuning (a single inflation parameter). Its proven strength on clique-recovery benchmarks 6 is a powerful argument, and it may be more stable or faster than Infomap in this specific dense, small-graph regime. It is highly recommended to benchmark this algorithm alongside Infomap.
Do Not Use (Unless Necessary): Leiden-CPM. While this method can be forced to work, it is a "brute force" fix that is conceptually misaligned with the problem. It requires abandoning the directed nature of the graph, which is a major loss of information. Furthermore, it relies on tuning a non-intuitive resolution_parameter 35 that will likely be brittle and require re-tuning for different codebases with different sizes or densities, making it a poor choice for a general-purpose tool.

Proposed Validation Protocol

To validate this report's findings and the proposed hybrid solution, the following step-by-step protocol is recommended.
Implement the Graph Model:
Take the "Zombie Survival" example graph (13 files).
Build the graph as a networkx.DiGraph.
Add nodes for all 13 files.
Add bidirectional directory coupling edges between all files in the same directory (e.S_S., auth/handlers.go $\leftrightarrow$ auth/models.go) with weight = 1.0.
Add directed import edges (e.g., main.go $\rightarrow$ auth/handlers.go) with weight = 0.1.
Run Infomap:
Pass the weighted, directed graph to Infomap using the implementation from Section VI.
Use the flags: Infomap("--directed --two-level -N 20").
Success: The output should be exactly 5 communities, corresponding to the 5 expected slices (Main, Auth, Combat, Survivors, Resources). main.go should be in its own singleton community.
Run MCL:
Pass the same graph to cdlib.algorithms.markov_clustering.
Tune the inflation parameter (start at 2.0, then try 1.8, 1.6, 1.4) until the number of output communities is 5.
Success: A stable 5-community partition is found at a reasonable inflation level (e.g., $1.4 \le r \le 2.0$).
Test the Critical "Hub" Edge Case:
Add a synthetic 14th node: shared/utils.go.
Add directed import edges from all 4 feature slices (e.g., from auth/handlers.go, combat/handlers.go, etc.) to shared/utils.go with weight = 0.1.
Do not add any directory coupling edges to this node.
Re-run and Verify:
Run Infomap (with the same parameters) on this new 14-node graph.
Expected Result: Infomap should now return 6 communities. The 5 original slices should be unchanged, and shared/utils.go should be in its own, new singleton community.
Run MCL (with the previously-tuned inflation parameter) on the 14-node graph.
Expected Result: MCL should also return 6 communities, with utils.go isolated as a singleton.
Apply Post-Processing Filter:
Implement the "Singleton Classifier" algorithm from Section V.
Feed the 6-community output from Infomap/MCL into the classifier.
Define the filter thresholds (e.g., K_in_threshold = 3, L_out_threshold = 1).
Success: The classifier must correctly:
Identify the [main.go] community, see its low in-degree (0), and classify it as a "Singleton Slice" (KEEP).
Identify the [shared/utils.go] community, see its high in-degree (>=4) and low out-degree (0), and classify it as a "Shared Utility" (IGNORE).
Identify the 4 feature slices, see their size > 1, and (KEEP).
Final Output: The tool's "Arela" output should be the 5 desired slices.
This flow-based, hybrid approach (Infomap/MCL + Refined Graph Model + Post-Processing Filter) is the only method that will be robust, stable, and conceptually sound, fulfilling all of the project's complex requirements.
Works cited
Identifying flow modules in ecological networks using Infomap - bioRxiv, accessed on November 13, 2025, https://www.biorxiv.org/content/10.1101/2020.04.14.040519v2.full
Infomap community detection understanding - Stack Overflow, accessed on November 13, 2025, https://stackoverflow.com/questions/48528648/infomap-community-detection-understanding
Know thy tools! Limits of popular algorithms used for topic reconstruction - MIT Press Direct, accessed on November 13, 2025, https://direct.mit.edu/qss/article/3/4/1054/113321/Know-thy-tools-Limits-of-popular-algorithms-used
Leiden - Neo4j Graph Data Science, accessed on November 13, 2025, https://neo4j.com/docs/graph-data-science/current/algorithms/leiden/
Community Detection with Louvain and Infomap - statworx, accessed on November 13, 2025, https://www.statworx.com/en/content-hub/blog/community-detection-with-louvain-and-infomap
Selecting Clustering Algorithms for IBD Mapping - bioRxiv, accessed on November 13, 2025, https://www.biorxiv.org/content/10.1101/2021.08.11.456036v1.full.pdf
Selecting Clustering Algorithms for Identity-By-Descent Mapping - PMC, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC9782725/
Louvain method - Wikipedia, accessed on November 13, 2025, https://en.wikipedia.org/wiki/Louvain_method
Performance of Community Detection Algorithms Supported by Node Embeddings - Department of Mathematics, accessed on November 13, 2025, https://math.ryerson.ca/~pralat/papers/2024_community_detection.pdf
MCL - a cluster algorithm for graphs - Micans, accessed on November 13, 2025, https://micans.org/mcl/
cdlib.algorithms.markov_clustering — CDlib - Community Discovery library - Read the Docs, accessed on November 13, 2025, https://cdlib.readthedocs.io/en/0.2.0/reference/cd_algorithms/algs/cdlib.algorithms.markov_clustering.html
An efficient algorithm for large-scale detection of protein families - PMC - NIH, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC101833/
Leiden algorithm - igraph R manual pages, accessed on November 13, 2025, https://igraph.org/r/html/1.3.5/cluster_leiden.html
Introduction — leidenalg 0.10.3.dev0+gcb0bc63.d20240122 documentation, accessed on November 13, 2025, https://leidenalg.readthedocs.io/en/stable/intro.html
Leiden-Based Parallel Community Detection - KIT - ITI Algorithmik, accessed on November 13, 2025, https://i11www.iti.kit.edu/_media/teaching/theses/ba-nguyen-21.pdf
SignedLouvain: Louvain for signed networks - arXiv, accessed on November 13, 2025, https://arxiv.org/html/2407.19288v1
Empirical Comparison of Algorithms for Network Community Detection - CS Stanford, accessed on November 13, 2025, https://cs.stanford.edu/people/jure/pubs/communities-www10.pdf
Modularity-Maximizing Graph Communities via Mathematical Programming - Google Research, accessed on November 13, 2025, https://research.google.com/pubs/archive/34878.pdf
Leiden - Graph Analytics & Algorithms - Ultipa, accessed on November 13, 2025, https://www.ultipa.com/docs/graph-analytics-algorithms/leiden
How to Accelerate Community Detection in Python Using GPU-Powered Leiden, accessed on November 13, 2025, https://developer.nvidia.com/blog/how-to-accelerate-community-detection-in-python-using-gpu-powered-leiden/
From Louvain to Leiden: guaranteeing well-connected communities, accessed on November 13, 2025, https://www.traag.net/wp/wp-content/papercite-data/pdf/traag_leiden_algo_2018.pdf
Understanding the Leiden Algorithm | by Pelin Balci - Medium, accessed on November 13, 2025, https://medium.com/@balci.pelin/understanding-the-leiden-algorithm-0b9fc95b277d
Top Community Detection Algorithms Compared - Hypermode, accessed on November 13, 2025, https://hypermode.com/blog/community-detection-algorithms
MapEquation, accessed on November 13, 2025, https://www.mapequation.org/
Infomap - Network community detection using the Map Equation framework, accessed on November 13, 2025, https://www.mapequation.org/infomap/
Community detection with InfoMap algorithm producing one massive module, accessed on November 13, 2025, https://stackoverflow.com/questions/20364939/community-detection-with-infomap-algorithm-producing-one-massive-module
Demystifying Markov Clustering. Introduction to markov clustering… | by Anurag Kumar Mishra | Analytics Vidhya | Medium, accessed on November 13, 2025, https://medium.com/analytics-vidhya/demystifying-markov-clustering-aeb6cdabbfc7
Clustering on Graphs: The Markov Cluster Algorithm (MCL) - CS@UCSB, accessed on November 13, 2025, https://sites.cs.ucsb.edu/~xyan/classes/CS595D-2009winter/MCL_Presentation2.pdf
GRAPH CLUSTERING - DataJobs.com, accessed on November 13, 2025, https://datajobs.com/data-science-repo/Markov-Clustering-[van-Dongen].pdf
HipMCL: a high-performance parallel implementation of the Markov clustering algorithm for large-scale networks | Nucleic Acids Research | Oxford Academic, accessed on November 13, 2025, https://academic.oup.com/nar/article/46/6/e33/4791133
The mcl manual - Micans, accessed on November 13, 2025, https://micans.org/mcl/man/mcl.html
What parameters can I play with using mcl? - Stack Overflow, accessed on November 13, 2025, https://stackoverflow.com/questions/22347315/what-parameters-can-i-play-with-using-mcl
Leiden algorithm - Wikipedia, accessed on November 13, 2025, https://en.wikipedia.org/wiki/Leiden_algorithm
Reference — leidenalg 0.10.3.dev0+gcb0bc63.d20240122 documentation, accessed on November 13, 2025, https://leidenalg.readthedocs.io/en/stable/reference.html
Optimal Community Detection - Usage - igraph support forum, accessed on November 13, 2025, https://igraph.discourse.group/t/optimal-community-detection/1438
Community detection in networks using graph embeddings | Phys. Rev. E, accessed on November 13, 2025, https://link.aps.org/doi/10.1103/PhysRevE.103.022316
Quantifying the Complexity of Nodes in Higher-Order Networks Using the Infomap Algorithm, accessed on November 13, 2025, https://www.researchgate.net/publication/383702011_Quantifying_the_complexity_of_nodes_in_higher-order_networks_using_the_Infomap_algorithm
Adapting InfoMap to Absorbing Random Walks Using Absorption-Scaled Graphs - SIAM.org, accessed on November 13, 2025, https://epubs.siam.org/doi/10.1137/21M1466803
A mechanistic model of connector hubs, modularity and cognition - PMC - PubMed Central, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC6322416/
The behaviour of modularity-optimizing community detection algorithms - UCLA Mathematics, accessed on November 13, 2025, https://www.math.ucla.edu/~mason/research/sally_dissertation_final.pdf
Where are the communities for disconnected nodes of a graph? · mapequation infomap · Discussion #194 - GitHub, accessed on November 13, 2025, https://github.com/mapequation/infomap/discussions/194
infomap module — Infomap 2.8.0 documentation - GitHub Pages, accessed on November 13, 2025, https://mapequation.github.io/infomap/python/infomap.html
cdlib.algorithms.infomap — CDlib 0.4.0 documentation, accessed on November 13, 2025, https://cdlib.readthedocs.io/en/stable/reference/generated/cdlib.algorithms.infomap.html
Infomap | RelationalAI Docs, accessed on November 13, 2025, https://docs.relational.ai/build/reasoners/graph/sample-notebooks/infomap/
How do multi-attribute edge-weights influence community detection? - Cross Validated, accessed on November 13, 2025, https://stats.stackexchange.com/questions/95161/how-do-multi-attribute-edge-weights-influence-community-detection
Unraveling the Complexity: How Software Dependencies Graphs Streamline Development, accessed on November 13, 2025, https://ones.com/blog/software-dependencies-graphs-streamline-development/
What is Weighted Graph with Applications, Advantages and Disadvantages, accessed on November 13, 2025, https://www.geeksforgeeks.org/dsa/applications-advantages-and-disadvantages-of-weighted-graph/
Measuring Node Contribution to Community Structure with Modularity Vitality - arXiv, accessed on November 13, 2025, https://arxiv.org/abs/2003.00056
Infomap Python API - GitHub Pages, accessed on November 13, 2025, https://mapequation.github.io/infomap/python/
Multilevel URL Community Detection with Infomap - Seong Hyun Hwang, accessed on November 13, 2025, https://stathwang.github.io/multilevel-url-community-detection-with-infomap.html
Quick Start — CDlib 0.4.0 documentation, accessed on November 13, 2025, https://cdlib.readthedocs.io/en/latest/tutorial.html
GuyAllard/markov_clustering: markov clustering in python - GitHub, accessed on November 13, 2025, https://github.com/GuyAllard/markov_clustering
Effective community detection with Markov Clustering | by Fra Gadaleta | Medium, accessed on November 13, 2025, https://frag.medium.com/effective-community-detection-with-markov-clustering-d5c6abee11b2
vtraag/leidenalg: Implementation of the Leiden algorithm for various quality functions to be used with igraph in Python. - GitHub, accessed on November 13, 2025, https://github.com/vtraag/leidenalg
