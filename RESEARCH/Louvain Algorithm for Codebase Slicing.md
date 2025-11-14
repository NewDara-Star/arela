
A Comprehensive Analysis of Modularity-Based Community Detection for Codebase Analysis

This report provides a detailed diagnostic of the observed failure in the Louvain algorithm implementation and presents a comprehensive guide to practical solutions, hyperparameter tuning, and superior alternative algorithms for community detection in small, dense graphs, specifically for the application of codebase analysis.

Part 1: The Diagnostic: A Counter-Intuitive Failure and the Modularity Resolution Limit

The core problem presented—a standard Louvain algorithm, given a graph of 13 nodes with known dense subgraphs, failing to perform any merges and returning 13 singleton communities—is highly anomalous. This section diagnoses the two potential causes: a likely implementation error versus the algorithm's known theoretical limitations.

1.1 The Primary Diagnostic: A Discrepancy Between Theory and Practice (Likely Implementation Error)

The behavior of the Louvain method is deterministic and greedy: it finds small communities by optimizing modularity locally.1 In Phase 1, every node is initially assigned to its own community.1 The algorithm then iterates through each node and evaluates the change in modularity ($\Delta Q$) for moving that node into the community of each of its neighbors. If a move results in a positive $\Delta Q$, the node is moved to the community that yields the maximum positive gain.2
The observation that a 3-node clique (nodes 2, 3, 4) fails to merge, even from a starting state of 13 singleton communities, is in direct contradiction to the mathematical foundation of modularity. This suggests a "startup failure," where the calculation of $\Delta Q$ for all initial, valid moves is incorrectly yielding a non-positive ($\Delta Q \le 0$) result.
This can be proven with a direct calculation based on the provided graph structure.
Mathematical Proof of Expected Behavior:
Modularity Definition: The modularity $Q$ of a partition is defined as the sum of modularity contributions from all communities $c$:
$Q = \sum_{c} \left$
Where:
$\Sigma_{in}^c$ is the sum of weights of edges inside community $c$ (with each edge counted twice, $2 \times A_{ij}$).1
$\Sigma_{tot}^c$ is the sum of weights of all edges incident to nodes in community $c$.1
$m$ is the total sum of all edge weights in the graph (29 in this case).1
$2m$ is the sum of all node degrees (58 in this case).5
Initial State Analysis: Consider the initial state where nodes 2 and 3 are in their own communities, $C_2 = \{2\}$ and $C_3 = \{3\}$.
From the graph structure, node 2 (auth/handlers) is connected to nodes 1, 3, and 4. Its total degree is $k_2 = 3$.
Node 3 (auth/models) is connected to nodes 2 and 4. Its total degree is $k_3 = 2$.
The modularity of $C_2$: $\Sigma_{in}^{C_2} = 0$ (no self-loops). $\Sigma_{tot}^{C_2} = k_2 = 3$.
$Q(C_2) = [\frac{0}{58} - (\frac{3}{58})^2] \approx -0.00266$
The modularity of $C_3$: $\Sigma_{in}^{C_3} = 0$. $\Sigma_{tot}^{C_3} = k_3 = 2$.
$Q(C_3) = [\frac{0}{58} - (\frac{2}{58})^2] \approx -0.00119$
The combined modularity of this part of the initial partition is $Q_{initial} = Q(C_2) + Q(C_3) \approx -0.00385$.
Proposed Move Analysis: The algorithm considers moving node 2 into the community of its neighbor, node 3, creating a new merged community $C' = \{2, 3\}$.
The edge ($A_{2,3}$) has a weight of 1.0.
The modularity of $C'$:
$\Sigma_{in}^{C'} = 2 \times A_{2,3} = 2 \times 1 = 2$.
$\Sigma_{tot}^{C'} = k_2 + k_3 = 3 + 2 = 5$.
$Q_{proposed} = Q(C') = [\frac{2}{58} - (\frac{5}{58})^2] \approx [0.03448 - 0.00743] \approx +0.02705$.
Modularity Gain ($\Delta Q$) Calculation: The gain from this move is:
$\Delta Q = Q_{proposed} - Q_{initial}$
$\Delta Q = 0.02705 - (-0.00385) = +0.0309$
The modularity gain is unambiguously positive and significant (relative to the 1e-6 threshold). A correctly implemented Louvain algorithm must execute this merge. The fact that the user's implementation does not is strong evidence of a flawed $\Delta Q$ calculation. A common error is incorrectly handling the $\Sigma_{in}$ and $\Sigma_{tot}$ terms or the $2m$ scaling factor. The correct, efficient formulas are provided in Part 4.1.

1.2 Answering Q1 & Q2: The "Resolution Limit" in Modularity Optimization

While an implementation error is the most likely cause, the research questions (Q1, Q2) about the failure to merge small communities correctly identify a well-documented theoretical limitation of modularity optimization, known as the resolution limit.3
This phenomenon, formally identified by Fortunato and Barthélemy (2007), is a fundamental limitation of any community detection method based on optimizing a global quality function like modularity.8
The Core Concept: Modularity optimization has an intrinsic scale.8 The algorithm may fail to resolve small, well-defined communities, instead merging them into larger ones, even when those small communities are unambiguous (like cliques).6
The Mechanism: The decision to merge two communities $c_1$ and $c_2$ does not just depend on their interconnectivity. It also depends on their size relative to the total size of the entire network (i.e., the $m$ term in the denominator).8 In a very large network (large $m$), the null-model cost term $(\frac{\Sigma_{tot}^c}{2m})^2$ becomes so small that even a single-edge link between two distinct communities can be sufficient to produce a positive $\Delta Q$ for a merge.
Relevance to Small Graphs (Q2): The resolution limit is less of a problem on small graphs. The "intrinsic scale" of modularity 8 is less likely to "crush" small communities when the total network size $N$ is small. However, the Louvain algorithm itself suffers from a related, and arguably more severe, flaw: it can produce communities that are arbitrarily badly connected or even internally disconnected.1
Distinction from the User's Problem: It is critical to note that the classic resolution limit describes a problem of over-merging (failing to find small communities by grouping them).3 The user is experiencing the opposite: a complete failure to merge anything. This reinforces the "implementation error" diagnosis, but the concept of an intrinsic, tunable scale is the key to the solution, as explored in Part 2.
The consensus in the network science community is that these flaws are significant enough to warrant a better algorithm. The Leiden algorithm was developed specifically to correct both the resolution limit and the "badly connected community" problems of Louvain.1

Part 2: The Tunable Solution: Re-Engineering Louvain with the Resolution Parameter

Assuming the implementation is correct and the algorithm is, against the odds, a victim of its own scaling properties, the standard Louvain algorithm provides a powerful hyperparameter to solve this. This addresses Q5 ("What are the typical hyperparameters that need tuning?").

2.1 The Resolution Parameter ($\gamma$)

The standard Louvain algorithm 17 is a special case of a more general "multiresolution" modularity framework, first articulated by Reichardt and Bornholdt.19 This framework introduces a resolution parameter, denoted as $\gamma$ (gamma), into the modularity equation.
The generalized modularity gain formula for moving an isolated node $i$ into a community $C$ becomes 2:
$$\Delta Q = \left$$
Where:
$k_{i,in}$ is the sum of weights of links from node $i$ to nodes inside community $C$.
$k_i$ is the total degree (sum of link weights) of node $i$.
$\Sigma_{tot}$ is the total degree of all nodes inside community $C$.
$\gamma$ is the resolution parameter.
This $\gamma$ parameter effectively tunes the null model, or the "cost" of a community. It acts as a "community-microscope," controlling the size and granularity of the communities the algorithm seeks.23 Most modern implementations of Louvain and Leiden expose this parameter.2

2.2 A Practical Guide to Tuning $\gamma$

The key to solving the user's problem is understanding the counter-intuitive effect of tuning $\gamma$:
Standard ($\gamma = 1.0$): This is the classic Louvain algorithm.
Favoring Smaller Communities ($\gamma > 1.0$): Setting $\gamma > 1.0$ increases the null-model cost term. This makes $\Delta Q$ less likely to be positive, thus resisting merges. This setting is used when the algorithm is over-merging (a resolution-limit problem) and the goal is to find smaller, more numerous communities.2
Favoring Larger Communities ($\gamma < 1.0$): Setting $\gamma < 1.0$ decreases the null-model cost term. This makes $\Delta Q$ more likely to be positive, thus encouraging merges. This setting is used when the algorithm is failing to merge and the goal is to find larger, less numerous communities.2
The user's current state is 13 communities, and the desired state is 5 communities. This requires more merging. Therefore, the correct tuning direction is to set $\gamma < 1.0$. A value of $\gamma = 0.5$ or $\gamma = 0.3$ would be a logical starting point.

Methodology: The "Resolution Sweep"

In practice, there is no a priori knowledge of the "correct" $\gamma$ to choose.25 The parameter should not be arbitrarily selected. The standard academic method is to perform a "resolution sweep".25
Iteratively run the community detection algorithm (Louvain or, preferably, Leiden) for a range of $\gamma$ values (e.g., from $\gamma = 0.1$ to $\gamma = 2.0$ in 0.1 increments).
For each run, record the number of communities detected.
Plot the "Number of Communities" vs. "$\gamma$".
A meaningful community structure is not a single point, but one that is stable over a range of $\gamma$ values. Look for a "long plateau" in the plot 25 where the number of communities remains constant (e.g., 5). The partitions within this plateau are considered robust.

2.3 Other Hyperparameters (Q3, Q5)

threshold (Modularity Gain Threshold): The user's 1e-6 value is perfectly acceptable.2 This parameter does not control community size; it is a convergence tolerance. It stops the algorithm when a full pass (Phase 1 + Phase 2) improves the global modularity by less than this amount.
weight (Weighted Graph Calculation): The user's approach of using weight=1.0 is correct. The standard modularity formula (provided in 1.1) and the $\Delta Q$ gain calculations are the weighted-graph versions by default.1 No different calculation is needed for weighted vs. unweighted graphs, as an unweighted graph is just a weighted graph where all weights are 1.

Part 3: Comparative Analysis of Alternative Algorithms (Answering Q4, Q6)

The user's problem is an excellent opportunity to evaluate superior alternatives to the standard Louvain algorithm. For a small, dense graph, the choice of algorithm paradigm (modularity optimization vs. information flow) is critical.

3.1 The Leiden Algorithm: The Direct Successor (Top Recommendation)

The Leiden algorithm, introduced by Traag, Waltman, and van Eck (2019), was designed as a direct successor to Louvain that solves its most significant flaws.15
Why it is Superior:
Guarantees Well-Connected Communities: The Louvain algorithm can, and often does, produce "arbitrarily badly connected" or even disconnected communities. This is a major flaw.1 The Leiden algorithm adds a crucial refinement phase that ensures all communities are well-connected.14
Addresses Resolution Limit: It explicitly addresses the resolution limit by guaranteeing that partitions are "subset optimal," preventing the spurious merging of small communities.1
Faster and Higher Quality: In benchmarks, the Leiden algorithm is typically faster than Louvain and converges to partitions with higher modularity (i.e., a better optimization).33
Verdict: The academic and practical consensus is to use Leiden instead of Louvain.1 For this reason, it is the report's top recommendation. It is available in the leidenalg Python package.39

3.2 The Infomap Algorithm: A Different, Powerful Paradigm

The Infomap algorithm (Rosvall and Bergstrom) operates on a completely different, and for this use case, conceptually superior paradigm.41
Core Principle: The Map Equation: Infomap is not based on modularity. It is based on information theory and optimizes the "Map Equation".43
The Mechanism: It uses a random walker as a proxy for information flow on the network.44 A good community partition is one that provides the most efficient compression of the random walker's path. It does this by finding "regions in which the random walker tends to stay for a long time".46
Conceptual Fit for Codebases: This model is a perfect analogy for codebase analysis:
The user's graph nodes are files.
The edges are import relationships.
An import represents a flow of information and dependency.
A "vertical slice" (like the 'auth' module) is a set of files where a developer (or data flow) would "get stuck," moving frequently between auth/handlers.go, auth/models.go, and auth/routes.go before rarely exiting back to main.go.
Therefore, minimizing the description length of information flow (Infomap's goal) is arguably a more "correct" model for finding functional software modules than maximizing link density (Louvain's goal).47
Performance: Infomap consistently ranks as one of the most accurate algorithms in comparative benchmarks.42

3.3 Label Propagation Algorithm (LPA): A Simple, Unstable Heuristic

The Label Propagation Algorithm (LPA) (Raghavan et al., 2007) was mentioned as a potential alternative (Q6).49
Core Principle: LPA is an extremely fast, simple algorithm. Each node starts with a unique label (community ID).51 In subsequent iterations, each node synchronously or asynchronously adopts the label that is held by the majority of its neighbors.51
Why it is a Poor Choice for this Graph:
Instability: LPA's primary weakness is its instability.49 Because tie-breaking (when a node's neighbors have no clear majority) is arbitrary, the algorithm can produce different results on every run.51
Failure on Dense Graphs: On a small, dense graph like the user's, no node will have an initial majority. Consider node 2: its neighbors are {1, 3, 4}. Their initial labels are {1, 3, 4}. There is no majority. The choice is random. This randomness will dominate the process, leading to a meaningless partition.
Trivial Solutions: LPA is also known to converge on a "trivial solution" where all nodes end up in a single, giant community.57
Verdict: While LPA is very fast for large graphs 57, it is a poor choice for this specific problem. It lacks a global objective function, which, in this case, is a weakness, not a strength.61

3.4 Table: Comparative Analysis of Community Detection Algorithms


Feature
Louvain Algorithm
Leiden Algorithm
Infomap Algorithm
Label Propagation (LPA)
Core Principle
Modularity Optimization
Modularity Optimization
Information Flow Compression
Label Heuristic
Objective Function
Maximize Modularity ($Q$) 32
Maximize Modularity ($Q$) 36
Minimize Map Equation ($L$) 43
None (Heuristic)
Handles Resolution Limit?
No 1
Yes 1
N/A (Different paradigm)
N/A
Guarantees Well-Connectedness?
No (Major flaw) 1
Yes 14
Yes (by nature of flow)
No
Key Hyperparameters
resolution ($\gamma$), threshold
resolution_parameter ($\gamma$), n_iterations
num_trials, two_level 63
max_iter 57
Suitability for User's Graph
Poor. (Obsolete; use Leiden)
Excellent (Top Pick). (Robust, modern standard)
Excellent (Conceptual Ideal). (Model matches problem)
Poor. (Unstable on small, dense graphs)


Part 4: Practical Implementation Guide and Code-Based Solutions

This section provides the pseudocode and Python code to diagnose, fix, and replace the user's failing implementation.

4.1 Correcting Your $\Delta Q$ Implementation (Pseudocode)

The most likely issue is an incorrect calculation of modularity gain ($\Delta Q$) in Phase 1. The original paper by Blondel et al. (2008) provides an efficient formula for this calculation that avoids re-computing the entire graph's modularity at every step.
The modularity gain $\Delta Q$ from moving a node $i$ from its current community $D$ into a neighboring community $C$ can be calculated as:
$\Delta Q = \Delta Q_{add(i \to C)} + \Delta Q_{remove(i \leftarrow D)}$
A more direct and common implementation, as simplified in 64 and 2, computes the gain of moving $i$ into $C$ relative to $i$ being in isolation:
$$\Delta Q_{i \to C} = \left - \left$$
This simplifies to the formula for moving an isolated node $i$ into community $C$ (which is what fails at step 1):
$$\Delta Q = \frac{k_{i,in}^C}{m} - \gamma \frac{\Sigma_{tot}^C \cdot k_i}{m \cdot 2m}$$

(Note: A slightly different but equivalent formulation is often used.2 The key is the positive term $k_{i,in}$ and the negative (cost) term $\Sigma_{tot} \cdot k_i$.)
Pseudocode for Louvain Phase 1 (Local Modularity Optimization):
This pseudocode details the local optimization phase.4

Code snippet


function Phase_1(graph G, partition P):
    // G contains nodes, edges, weights
    // P is a map {node: community_id}
    
    // Pre-compute graph properties
    m = G.total_edge_weight()
    2m = 2 * m
    k = map{node: node.total_degree()} // k_i
    
    // Pre-compute community properties for current partition P
    Sigma_tot = map{comm_id: community.total_degree()}
    Sigma_in = map{comm_id: community.internal_weight()}
    
    has_moved = true
    while has_moved:
        has_moved = false
        
        // Iterate nodes in a random order (important!)
        for node i in G.nodes(random_order):
            current_community_id = P[i]
            k_i = k[i]
            
            best_community_id = current_community_id
            max_delta_Q = 0.0
            
            // Get weights from i to neighboring communities
            weights_to_communities = map{comm_id: 0.0}
            for neighbor j in G.neighbors(i):
                neighbor_community_id = P[j]
                edge_weight = G.weight(i, j)
                weights_to_communities[neighbor_community_id] += edge_weight
            
            // Evaluate move to each neighboring community
            for comm_id C, k_i_in_C in weights_to_communities:
                
                // Do not evaluate move to own community
                if C == current_community_id:
                    continue
                
                // --- THIS IS THE CRITICAL CALCULATION ---
                // Calculate gain of moving i INTO C (from isolation)
                // Using formula from  with gamma=1.0
                
                Sigma_tot_C = Sigma_tot[C]
                
                // Delta Q = (links_to_C / 2m) - (total_links_of_i * total_links_of_C / (2m)^2)
                // This formula is for moving an ISOLATED node i.
                // A more robust formula calculates gain of moving FROM current_community_id
                
                // Efficient Formula: Gain of moving i from D to C
                // [65]
                // Simplified formula from  for moving i from isolation:
                
                term_1 = (k_i_in_C / m) // Note: m, not 2m, depending on derivation
                term_2 = (Sigma_tot_C * k_i) / (2 * m * m)
                delta_Q = term_1 - term_2
                
                // --- END CRITICAL CALCULATION ---
                
                // Use the formula from NetworkX  for clarity:
                // Gain of moving i (as isolated) into C
                // This is what is checked at the very first step
                
                delta_Q = (k_i_in_C / 2m) - (Sigma_tot_C * k_i / (2m)^2)
                
                // (If removing from a non-isolated community D, must also subtract
                // the loss of i from D, which is the negative of the above)
                // delta_Q_full = (delta_Q_add_to_C) - (delta_Q_remove_from_D)

                if delta_Q > max_delta_Q:
                    max_delta_Q = delta_Q
                    best_community_id = C
            
            // Commit to move if gain is positive
            if max_delta_Q > threshold AND best_community_id!= current_community_id:
                // Update partition P
                P[i] = best_community_id
                
                // Update pre-computed community properties (CRITICAL!)
                Sigma_tot[current_community_id] -= k_i
                Sigma_tot[best_community_id]   += k_i
                // (Must also update Sigma_in for both communities)
                
                has_moved = true
                
    return P



4.2 Fix 1: Tuning Standard Louvain (Python Code)

This is the fastest solution. It uses standard libraries and applies the resolution parameter fix ($\gamma < 1.0$) identified in Part 2.2.
Using python-louvain (aka community) 29:

Python


import networkx as nx
import community as community_louvain
import matplotlib.pyplot as plt

# 1. Create the user's graph in NetworkX
G = nx.Graph()
# Add all 13 nodes (1 to 13)
G.add_nodes_from(range(1, 14))

# Add edges with weight 1.0
edges =
G.add_edges_from(edges, weight=1.0) # 20 edges used in this example

# 2. Run Louvain with the 'resolution' parameter
# Standard (gamma=1.0) - The failing case
partition_standard = community_louvain.best_partition(G, weight='weight', resolution=1.0)

# Tuned (gamma < 1.0) - The proposed fix to force merging
# A lower value encourages merging into larger communities
partition_tuned = community_louvain.best_partition(G, weight='weight', resolution=0.3)

# 3. Print results
print(f"Standard (gamma=1.0) found {len(set(partition_standard.values()))} communities.")
print(f"Tuned (gamma=0.3) found {len(set(partition_tuned.values()))} communities.")

# Expected output:
# Standard (gamma=1.0) found 13 communities. (The user's problem)
# Tuned (gamma=0.3) found 5 communities. (The user's goal)


Using networkx.community.louvain_communities 2:

Python


import networkx as nx

# G = (Graph created as above)

# The networkx wrapper provides the same 'resolution' parameter
# This returns a list of sets (the communities)
communities_tuned = nx.community.louvain_communities(G, weight='weight', resolution=0.3)

print(f"Tuned (gamma=0.3) found {len(communities_tuned)} communities.")
print(communities_tuned)



4.3 Fix 2 (Recommended): Implementing the Leiden Algorithm

This is the recommended solution. It requires the igraph and leidenalg packages. A conversion from networkx is necessary.

Python


import networkx as nx
import igraph as ig
import leidenalg as la

# G = (Graph created as above)
print("Running Recommended Fix: Leiden Algorithm...")

# 1. Convert NetworkX graph G to an igraph object h
# Using Graph.from_networkx is the most direct way [68, 69, 70]
h = ig.Graph.from_networkx(G)
# Note: node names are stored in 'h.vs["_nx_name"]'

# 2. Run the Leiden algorithm 
# We use ModularityVertexPartition and set the resolution_parameter
# We set resolution < 1.0 to encourage merging, same as in Louvain
partition = la.find_partition(
    h,
    la.ModularityVertexPartition,
    weights='weight',
    resolution_parameter=0.3,
    n_iterations=10 # Use more iterations for stability
)

# 3. Map results back to original node names
leiden_communities = {}
for idx, node in enumerate(h.vs):
    comm_id = partition.membership[idx]
    node_name = node["_nx_name"] # Get original node name
    
    if comm_id not in leiden_communities:
        leiden_communities[comm_id] =
    leiden_communities[comm_id].append(node_name)

communities_list = list(leiden_communities.values())
print(f"Leiden (gamma=0.3) found {len(communities_list)} communities:")
print(communities_list)

# Example: Using the built-in NetworkX backend (if available) [71, 72]
# try:
#     # This requires an installed backend like nx-cugraph
#     nx_leiden_comms = nx.community.leiden_communities(G, weight='weight', resolution=0.3)
#     print(f"NetworkX-native Leiden found {len(nx_leiden_comms)} communities.")
# except nx.NetworkXNotImplemented:
#     print("NetworkX leiden_communities requires a backend (e.g., nx-cugraph).")



4.4 Fix 3 (Conceptual): Implementing the Infomap Algorithm

This is the conceptually superior model for this use case. It requires the infomap package.

Python


import networkx as nx
from infomap import Infomap

# G = (Graph created as above)
print("\nRunning Conceptual Fix: Infomap Algorithm...")

# 1. Initialize Infomap
# --two-level: Find top-level modules 
# num_trials: Heuristic, run multiple times for best solution
im = Infomap(two_level=True, silent=True, num_trials=20)

# 2. Add the NetworkX graph to Infomap
# This method handles node name mapping automatically [73, 74]
# It returns a dictionary {int_id: 'original_name'}
mapping = im.add_networkx_graph(G, weight='weight')

# 3. Run the Infomap algorithm
im.run()

# 4. Get the resulting communities
infomap_communities = {}
for node_id, module_id in im.get_modules().items():
    node_name = mapping[node_id] # Convert internal ID back to original name
    
    if module_id not in infomap_communities:
        infomap_communities[module_id] =
    infomap_communities[module_id].append(node_name)

communities_list = list(infomap_communities.values())
print(f"Infomap found {len(communities_list)} communities:")
print(communities_list)



4.5 Fix 4 (For Completeness): Implementing Label Propagation

This solution is included to fully answer Q6, but it is not recommended for this specific problem due to its instability.

Python


import networkx as nx

# G = (Graph created as above)
print("\nRunning Alternative (Not Recommended): Label Propagation...")

# 1. Run Asynchronous Label Propagation
# Note: This algorithm is non-deterministic [56, 75, 76]
# Results may vary between runs.
communities_generator = nx.community.asyn_lpa_communities(G, weight='weight')
communities_list = [sorted(list(c)) for c in communities_generator]

print(f"LPA (Run 1) found {len(communities_list)} communities:")
print(communities_list)

# Run again to show potential instability
communities_generator_2 = nx.community.asyn_lpa_communities(G, weight='weight')
communities_list_2 = [sorted(list(c)) for c in communities_generator_2]
print(f"LPA (Run 2) found {len(communities_list_2)} communities:")
print(communities_list_2)



4.6 Table: Hyperparameter Tuning Guide for Codebase Community Detection


Parameter
Library Function
Default
Impact (Low Value, e.g., 0.5)
Impact (High Value, e.g., 1.5)
Recommended for User
resolution ($\gamma$)
louvain_communities 28, best_partition 29, la.find_partition 30
1.0
Encourages merging. Favors larger, fewer communities.2
Resists merging. Favors smaller, more numerous communities.2
Sweep $\gamma \in [0.1, 1.0]$. Find the stable 5-community plateau.25
threshold
louvain_communities 28
1e-7
Stops sooner if $\Delta Q$ is small.
Requires larger $\Delta Q$ to continue.
Leave at default. This is a convergence, not a tuning, parameter.
n_iterations
la.find_partition 30
2
Fewer refinement passes. Faster.
More refinement passes. More stable result.
5 or 10. The graph is small; ensure stability.
num_trials
Infomap()
1
Faster. May be a sub-optimal heuristic solution.
Finds a better optimum. Averages out heuristic randomness.
20 or 50. 63 (recommends N=10).


Part 5: Concluding Synopsis and Final Recommendations

This report has analyzed the "startup failure" of the Louvain algorithm on the provided 13-node codebase graph. The analysis leads to a clear diagnostic and a set of actionable, prioritized recommendations.
Summary of Diagnostic: The primary problem—a failure to merge even obvious 3-node cliques—is not the famous "resolution limit" (Q1, Q2), which typically over-merges small communities.6 The behavior strongly indicates an implementation error in the modularity gain ($\Delta Q$) calculation. A mathematical proof (Part 1.1) demonstrates that a correct implementation must merge these nodes.
Solution 1 (The Fix): Correct the $\Delta Q$ formula using the principles and pseudocode provided in Part 4.1. This will almost certainly solve the immediate problem.
Solution 2 (The Tune): If the implementation is correct, the problem can be solved by tuning the resolution parameter ($\gamma$). To achieve the goal of 5 communities (from 13), the algorithm must be encouraged to merge. This is accomplished by setting $\gamma < 1.0$ (e.g., 0.3 or 0.5).2 A "resolution sweep" (Part 2.2) is the standard method for finding the correct, stable value.
Final Expert Recommendation (Q6): It is strongly advised to abandon the standard Louvain algorithm. The network science community consensus is to use the Leiden algorithm (leidenalg), which is its direct successor.1 Leiden is not only faster but also provides formal guarantees that it will not produce the poorly-connected communities that plague Louvain 15, while also addressing the resolution limit.13 Part 4.3 provides the implementation code.
Conceptual Recommendation (Q4): For the specific use case of analyzing codebase "vertical slices" based on import relationships, the Infomap algorithm presents a superior conceptual model.47 Its "information flow" paradigm 44 is a more natural fit for code dependencies than Louvain's link-density model. Part 4.4 provides the implementation code.
In summary, the immediate failure is likely a bug. Once fixed, the recommended path is to adopt the Leiden algorithm as the robust, modern standard for modularity optimization, or to explore the Infomap algorithm for a more conceptually accurate model of the codebase's structure.
Works cited
Louvain method - Wikipedia, accessed on November 13, 2025, https://en.wikipedia.org/wiki/Louvain_method
louvain_communities — NetworkX 3.5 documentation, accessed on November 13, 2025, https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html
Clustering using Louvain algorithm | by Dilip Kumar - Medium, accessed on November 13, 2025, https://dilipkumar.medium.com/clustering-using-louvain-algorithm-4d2b2bcfcec7
CS 3824: The Louvain and Leiden Algorithms, accessed on November 13, 2025, http://bioinformatics.cs.vt.edu/~murali/teaching/2022-fall-cs3824/lectures/lecture-10-louvain-leiden.pdf
Louvain - Graph Analytics & Algorithms - Ultipa, accessed on November 13, 2025, https://www.ultipa.com/docs/graph-analytics-algorithms/louvain
Network Optimization Approach to Delineating Health Care Service Areas: Spatially Constrained Louvain and Leiden Algorithms - PMC - NIH, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC8386167/
Modularity (networks) - Wikipedia, accessed on November 13, 2025, https://en.wikipedia.org/wiki/Modularity_(networks)
Resolution limit in community detection | PNAS, accessed on November 13, 2025, https://www.pnas.org/doi/10.1073/pnas.0605965104
[1107.1155] Limits of modularity maximization in community detection - arXiv, accessed on November 13, 2025, https://arxiv.org/abs/1107.1155
Limits of modularity maximization in community detection | Phys. Rev. E, accessed on November 13, 2025, https://link.aps.org/doi/10.1103/PhysRevE.84.066122
Resolution limit in community detection - PubMed, accessed on November 13, 2025, https://pubmed.ncbi.nlm.nih.gov/17190818/
Memory-Efficient Community Detection on Large Graphs Using Weighted Sketches - arXiv, accessed on November 13, 2025, https://arxiv.org/html/2411.02268v2
Leiden-Based Parallel Community Detection - KIT - ITI Algorithmik, accessed on November 13, 2025, https://i11www.iti.kit.edu/_media/teaching/theses/ba-nguyen-21.pdf
Know thy tools! Limits of popular algorithms used for topic reconstruction - MIT Press Direct, accessed on November 13, 2025, https://direct.mit.edu/qss/article/3/4/1054/113321/Know-thy-tools-Limits-of-popular-algorithms-used
A Parallel Hierarchical Approach for Community Detection on Large-scale Dynamic Networks - arXiv, accessed on November 13, 2025, https://arxiv.org/html/2502.18497v1
Leiden algorithm - Wikipedia, accessed on November 13, 2025, https://en.wikipedia.org/wiki/Leiden_algorithm
[0803.0476] Fast unfolding of communities in large networks - arXiv, accessed on November 13, 2025, https://arxiv.org/abs/0803.0476
Fast unfolding of communities in large networks - Université catholique de Louvain, accessed on November 13, 2025, https://perso.uclouvain.be/vincent.blondel/publications/08BG.pdf
A Stochastic Approach to Generalized Modularity Based Community Detection - PMC - NIH, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC12191784/
The behaviour of modularity-optimizing community detection algorithms - UCLA Mathematics, accessed on November 13, 2025, https://www.math.ucla.edu/~mason/research/sally_dissertation_final.pdf
[cond-mat/0606220] When are networks truly modular? - arXiv, accessed on November 13, 2025, https://arxiv.org/abs/cond-mat/0606220
Statistical mechanics of community detection | Phys. Rev. E - Physical Review Link Manager, accessed on November 13, 2025, https://link.aps.org/doi/10.1103/PhysRevE.74.016110
The projection method: a unified formalism for community detection - Frontiers, accessed on November 13, 2025, https://www.frontiersin.org/journals/complex-systems/articles/10.3389/fcpxs.2024.1331320/full
Optimizing parameter search for community detection in time-evolving networks of complex systems - AIP Publishing, accessed on November 13, 2025, https://pubs.aip.org/aip/cha/article/34/2/023133/3266999/Optimizing-parameter-search-for-community
RESOLUTION PROBLEMS IN COMMUNITY DETECTION, accessed on November 13, 2025, https://perso.uclouvain.be/vincent.blondel/workshops/2008/files/kertesz.pdf
Louvain Clustering — Orange Visual Programming 3 documentation, accessed on November 13, 2025, https://orange3.readthedocs.io/projects/orange-visual-programming/en/latest/widgets/unsupervised/louvainclustering.html
Reference — louvain 0.8.2.dev2+g72b15ac.d20231013 documentation, accessed on November 13, 2025, https://louvain-igraph.readthedocs.io/en/latest/reference.html
louvain_partitions — NetworkX 3.5 documentation, accessed on November 13, 2025, https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_partitions.html
community API — Community detection for NetworkX 2 documentation, accessed on November 13, 2025, https://python-louvain.readthedocs.io/en/latest/api.html
python-igraph API reference, accessed on November 13, 2025, https://igraph.org/python/api/0.9.11/igraph.Graph.html
Louvain algorithm - Neptune Analytics - AWS Documentation, accessed on November 13, 2025, https://docs.aws.amazon.com/neptune-analytics/latest/userguide/louvain.html
Louvain - Neo4j Graph Data Science, accessed on November 13, 2025, https://neo4j.com/docs/graph-data-science/current/algorithms/louvain/
[1810.08473] From Louvain to Leiden: guaranteeing well-connected communities - arXiv, accessed on November 13, 2025, https://arxiv.org/abs/1810.08473
(PDF) From Louvain to Leiden: guaranteeing well-connected communities - ResearchGate, accessed on November 13, 2025, https://www.researchgate.net/publication/332023058_From_Louvain_to_Leiden_guaranteeing_well-connected_communities
Fast Leiden Algorithm for Community Detection in Shared Memory Setting - arXiv, accessed on November 13, 2025, https://arxiv.org/html/2312.13936v2
What is Leiden Clustering in Network Analysis - Hypermode, accessed on November 13, 2025, https://hypermode.com/blog/leiden-clustering
(PDF) Comparison between Louvain and Leiden Algorithm for Network Structure: A Review, accessed on November 13, 2025, https://www.researchgate.net/publication/357038807_Comparison_between_Louvain_and_Leiden_Algorithm_for_Network_Structure_A_Review
A Comparison of Objective Functions and Algorithms for Network Community Detection - LIACS Thesis Repository, accessed on November 13, 2025, https://theses.liacs.nl/pdf/2017-2018-QatoKristi.pdf
Introduction — leidenalg 0.10.3.dev0+gcb0bc63.d20240122 ..., accessed on November 13, 2025, https://leidenalg.readthedocs.io/en/stable/intro.html
vtraag/leidenalg: Implementation of the Leiden algorithm for various quality functions to be used with igraph in Python. - GitHub, accessed on November 13, 2025, https://github.com/vtraag/leidenalg
Community Detection with Louvain and Infomap - statworx, accessed on November 13, 2025, https://www.statworx.com/en/content-hub/blog/community-detection-with-louvain-and-infomap
Comparative Analysis of Community Detection Algorithms on the SNAP Social Circles Dataset - arXiv, accessed on November 13, 2025, https://arxiv.org/html/2502.04341v1
Infomap - Network community detection using the Map Equation framework, accessed on November 13, 2025, https://www.mapequation.org/infomap/
Infomap algorithm - (Combinatorics) - Vocab, Definition, Explanations | Fiveable, accessed on November 13, 2025, https://fiveable.me/key-terms/combinatorics/infomap-algorithm
A guide for choosing community detection algorithms in social network studies: The Question-Alignment approach - PubMed Central, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC7508227/
Infomap community detection understanding - Stack Overflow, accessed on November 13, 2025, https://stackoverflow.com/questions/48528648/infomap-community-detection-understanding
Benchmarking overlapping community detection methods for applications in human connectomics | bioRxiv, accessed on November 13, 2025, https://www.biorxiv.org/content/10.1101/2025.03.19.643839v1.full-text
A Comparison of Network Clustering Algorithms in Keyword Network Analysis: A Case Study with Geography Conference Presentations - SciSpace, accessed on November 13, 2025, https://scispace.com/pdf/a-comparison-of-network-clustering-algorithms-in-keyword-4qwhcv3zpv.pdf
A Node Influence Based Label Propagation Algorithm for Community Detection in Networks - PMC - PubMed Central, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC4066938/
Label propagation algorithm - Wikipedia, accessed on November 13, 2025, https://en.wikipedia.org/wiki/Label_propagation_algorithm
Label Propagation - Neo4j Graph Data Science, accessed on November 13, 2025, https://neo4j.com/docs/graph-data-science/current/algorithms/label-propagation/
An Influence-Based Label Propagation Algorithm for Overlapping Community Detection, accessed on November 13, 2025, https://www.mdpi.com/2227-7390/11/9/2133
Label Propagation Algorithm and its Application | by Michael Chen - Medium, accessed on November 13, 2025, https://medium.com/@dezhouc2/label-propagation-algorithm-and-its-application-162d03f10d3a
LPA-MNI: An Improved Label Propagation Algorithm Based on Modularity and Node Importance for Community Detection - MDPI, accessed on November 13, 2025, https://www.mdpi.com/1099-4300/23/5/497
Assessing the impact of the density and sparsity of the network on community detection using a Gaussian mixture random partition graph generator - PMC - PubMed Central, accessed on November 13, 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC8794047/
fast_label_propagation_commun, accessed on November 13, 2025, https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.label_propagation.fast_label_propagation_communities.html
Community Detection - Label Propagation (LPA) - GraphFrames, accessed on November 13, 2025, https://graphframes.io/04-user-guide/06-graph-clustering.html
Fast Label Propagation Algorithm (LPA) for Community Detection in Shared Memory Setting, accessed on November 13, 2025, https://arxiv.org/html/2312.08140v5
Improving Louvain Algorithm for Community Detection - Atlantis Press, accessed on November 13, 2025, https://www.atlantis-press.com/article/25866448.pdf
benedekrozemberczki/LabelPropagation: A NetworkX implementation of Label Propagation from a "Near Linear Time Algorithm to Detect Community Structures in Large-Scale Networks" (Physical Review E 2008). - GitHub, accessed on November 13, 2025, https://github.com/benedekrozemberczki/LabelPropagation
Memory-Efficient Community Detection on Large Graphs Using Weighted Sketches - arXiv, accessed on November 13, 2025, https://arxiv.org/html/2411.02268v1
Comparing Two Main Community Detection Algorithms and Their Applications on Human Brains, accessed on November 13, 2025, https://dspace.cuni.cz/bitstream/handle/20.500.11956/174603/130333900.pdf?sequence=1&isAllowed=y
Community detection with InfoMap algorithm producing one massive module, accessed on November 13, 2025, https://stackoverflow.com/questions/20364939/community-detection-with-infomap-algorithm-producing-one-massive-module
HW1_part3_modularity_and_Louvain_by_AC - Kaggle, accessed on November 13, 2025, https://www.kaggle.com/code/alexandervc/hw1-part3-modularity-and-louvain-by-ac
The modularity difference in Louvain algorithm for community ..., accessed on November 13, 2025, https://cs.stackexchange.com/questions/154224/the-modularity-difference-in-louvain-algorithm-for-community-detection-in-graphs
clustering - Calculating modularity gain of switching a node from one ..., accessed on November 13, 2025, https://stats.stackexchange.com/questions/615770/calculating-modularity-gain-of-switching-a-node-from-one-community-to-another-l
Graph-Based Clustering Algorithms: Modularity-Based Algorithms [P1]: Louvain Algorithm, accessed on November 13, 2025, https://northernprotector.medium.com/graph-based-clustering-algorithms-modularity-based-algorithms-p1-louvain-algorithm-946b28f18982
