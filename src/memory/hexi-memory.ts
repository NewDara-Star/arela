import { SessionMemory } from "./session.js";
import { ProjectMemory } from "./project.js";
import { UserMemory } from "./user.js";
import { VectorMemory } from "./vector.js";
import { GraphMemory } from "./graph.js";
import { GovernanceMemory } from "./governance.js";

export enum MemoryLayer {
  SESSION = "session",
  PROJECT = "project",
  USER = "user",
  VECTOR = "vector",
  GRAPH = "graph",
  GOVERNANCE = "governance",
}

export interface QueryOptions {
  layers?: MemoryLayer[];
  limit?: number;
  includeContext?: boolean;
}

export interface QueryResult {
  query: string;
  results: any[];
  layers: MemoryLayer[];
  totalResults: number;
  executionTime: number;
}

export interface MultiLayerResult {
  session?: any;
  project?: any;
  user?: any;
  vector?: any[];
  graph?: any;
  governance?: any[];
}

export interface HexiMemoryStats {
  session: any;
  project: any;
  user: any;
  vector: any;
  graph: any;
  governance: any;
  totalMemoryUsage: number;
}

/**
 * HexiMemory - Unified orchestrator for all 6 memory layers
 * 
 * Provides a single API to query across:
 * - Session (short-term, current task)
 * - Project (medium-term, project-specific)
 * - User (long-term, cross-project)
 * - Vector (semantic search)
 * - Graph (structural dependencies)
 * - Governance (audit trail)
 */
export class HexiMemory {
  private session!: SessionMemory;
  private project!: ProjectMemory;
  private user!: UserMemory;
  private vector!: VectorMemory;
  private graph!: GraphMemory;
  private governance!: GovernanceMemory;
  private projectPath!: string;

  /**
   * Initialize all 6 memory layers
   */
  async init(projectPath: string): Promise<void> {
    this.projectPath = projectPath;

    // Initialize all layers in parallel for speed
    const [session, project, user] = await Promise.all([
      (async () => {
        const s = new SessionMemory();
        await s.init();
        return s;
      })(),
      (async () => {
        const p = new ProjectMemory();
        await p.init(projectPath);
        return p;
      })(),
      (async () => {
        const u = new UserMemory();
        await u.init();
        return u;
      })(),
    ]);

    this.session = session;
    this.project = project;
    this.user = user;

    // Initialize remaining layers
    this.vector = new VectorMemory(projectPath);
    await this.vector.init(projectPath);

    this.graph = new GraphMemory(projectPath);
    await this.graph.init(projectPath);

    this.governance = new GovernanceMemory(projectPath);
    await this.governance.init(projectPath);
  }

  /**
   * Query all 6 layers in parallel
   */
  async queryAll(query: string): Promise<MultiLayerResult> {
    const startTime = Date.now();

    // Query all layers in parallel with error handling
    const [session, project, user, vector, graph, governance] =
      await Promise.all([
        this.querySession(query).catch((err) => {
          console.warn("Session query failed:", err.message);
          return null;
        }),
        this.queryProject(query).catch((err) => {
          console.warn("Project query failed:", err.message);
          return null;
        }),
        this.queryUser(query).catch((err) => {
          console.warn("User query failed:", err.message);
          return null;
        }),
        this.queryVector(query).catch((err) => {
          console.warn("Vector query failed:", err.message);
          return [];
        }),
        this.queryGraph(query).catch((err) => {
          console.warn("Graph query failed:", err.message);
          return null;
        }),
        this.queryGovernance(query).catch((err) => {
          console.warn("Governance query failed:", err.message);
          return [];
        }),
      ]);

    const executionTime = Date.now() - startTime;
    console.log(`✅ Queried all 6 layers in ${executionTime}ms`);

    return {
      session,
      project,
      user,
      vector,
      graph,
      governance,
    };
  }

  /**
   * Query specific layers only
   */
  async queryLayers(
    query: string,
    layers: MemoryLayer[]
  ): Promise<MultiLayerResult> {
    const startTime = Date.now();
    const result: MultiLayerResult = {};

    const promises: Promise<void>[] = [];

    if (layers.includes(MemoryLayer.SESSION)) {
      promises.push(
        this.querySession(query)
          .then((r) => {
            result.session = r;
          })
          .catch((err) => {
            console.warn("Session query failed:", err.message);
            result.session = null;
          })
      );
    }

    if (layers.includes(MemoryLayer.PROJECT)) {
      promises.push(
        this.queryProject(query)
          .then((r) => {
            result.project = r;
          })
          .catch((err) => {
            console.warn("Project query failed:", err.message);
            result.project = null;
          })
      );
    }

    if (layers.includes(MemoryLayer.USER)) {
      promises.push(
        this.queryUser(query)
          .then((r) => {
            result.user = r;
          })
          .catch((err) => {
            console.warn("User query failed:", err.message);
            result.user = null;
          })
      );
    }

    if (layers.includes(MemoryLayer.VECTOR)) {
      promises.push(
        this.queryVector(query)
          .then((r) => {
            result.vector = r;
          })
          .catch((err) => {
            console.warn("Vector query failed:", err.message);
            result.vector = [];
          })
      );
    }

    if (layers.includes(MemoryLayer.GRAPH)) {
      promises.push(
        this.queryGraph(query)
          .then((r) => {
            result.graph = r;
          })
          .catch((err) => {
            console.warn("Graph query failed:", err.message);
            result.graph = null;
          })
      );
    }

    if (layers.includes(MemoryLayer.GOVERNANCE)) {
      promises.push(
        this.queryGovernance(query)
          .then((r) => {
            result.governance = r;
          })
          .catch((err) => {
            console.warn("Governance query failed:", err.message);
            result.governance = [];
          })
      );
    }

    await Promise.all(promises);

    const executionTime = Date.now() - startTime;
    console.log(
      `✅ Queried ${layers.length} layer(s) in ${executionTime}ms`
    );

    return result;
  }

  /**
   * Query session memory (current task, open files, recent messages)
   */
  async querySession(query: string): Promise<any> {
    return {
      currentTask: await this.session.getCurrentTask(),
      activeTicket: await this.session.getActiveTicket(),
      openFiles: await this.session.getOpenFiles(),
      recentMessages: await this.session.getRecentMessages(5),
      context: await this.session.getAllContext(),
    };
  }

  /**
   * Query project memory (architecture, decisions, patterns)
   */
  async queryProject(query: string): Promise<any> {
    return {
      architecture: await this.project.getArchitecture(),
      techStack: await this.project.getTechStack(),
      decisions: await this.project.searchDecisions(query),
      patterns: await this.project.getPatterns(),
      todos: await this.project.getTodos(),
      conventions: await this.project.getAllConventions(),
    };
  }

  /**
   * Query user memory (preferences, expertise, patterns)
   */
  async queryUser(query: string): Promise<any> {
    return {
      preferences: await this.user.getAllPreferences(),
      expertise: await this.user.getAllExpertise(),
      patterns: await this.user.getTopPatterns(5),
      conventions: await this.user.getAllConventions(),
      recentProjects: await this.user.getRecentProjects(5),
    };
  }

  /**
   * Query vector memory (semantic search)
   */
  async queryVector(query: string, limit: number = 10): Promise<any[]> {
    return await this.vector.search(query, limit);
  }

  /**
   * Query graph memory (structural dependencies)
   */
  async queryGraph(query: string): Promise<any> {
    // For now, return general stats
    // Future: Parse query to determine specific graph queries
    const stats = await this.graph.getStats();

    return {
      stats,
      // Could add: searchFiles, getImports, etc based on query
    };
  }

  /**
   * Query governance memory (audit trail, decisions, changes)
   */
  async queryGovernance(query: string, limit: number = 10): Promise<any[]> {
    // Return recent events by default
    // Future: Parse query to filter by type, agent, etc
    return await this.governance.getRecentEvents(limit);
  }

  /**
   * Get aggregated stats from all layers
   */
  async getStats(): Promise<HexiMemoryStats> {
    const [session, project, user, vector, graph, governance] =
      await Promise.all([
        this.session.getStats().catch(() => ({})),
        this.project.getStats().catch(() => ({})),
        this.user.getStats().catch(() => ({})),
        this.vector.getStats().catch(() => ({})),
        this.graph.getStats().catch(() => ({})),
        this.governance.getStats().catch(() => ({})),
      ]);

    return {
      session,
      project,
      user,
      vector,
      graph,
      governance,
      totalMemoryUsage: 0, // TODO: Calculate actual memory usage
    };
  }

  /**
   * Get individual layer instances (for advanced usage)
   */
  getSession(): SessionMemory {
    return this.session;
  }

  getProject(): ProjectMemory {
    return this.project;
  }

  getUser(): UserMemory {
    return this.user;
  }

  getVector(): VectorMemory {
    return this.vector;
  }

  getGraph(): GraphMemory {
    return this.graph;
  }

  getGovernance(): GovernanceMemory {
    return this.governance;
  }
}
