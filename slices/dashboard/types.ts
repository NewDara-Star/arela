export type DashboardData = {
    generated: string;
    stats: {
        files: number;
        links: number;
    };
    nodes: Array<{ id: string; group: string }>;
    links: Array<{ source: string; target: string; type?: string }>;
    prd?: {
        path: string;
        features: Array<{
            id: string;
            name: string;
            status?: string;
            priority?: string;
            alignment?: string;
        }>;
    };
    tickets?: {
        path: string;
        total: number;
        byStatus: Record<string, number>;
        items: Array<{
            id: string;
            status: string;
            featureId?: string;
            path: string;
        }>;
    };
    tests?: {
        path: string;
        total: number;
        features: Array<{
            id: string;
            name: string;
            scenarios: number;
            path: string;
            status?: string;
        }>;
        results: Array<{
            featurePath: string;
            success: boolean;
            durationMs: number;
            timestamp: string;
        }>;
    };
    changes?: {
        modified: string[];
        added: string[];
        deleted: string[];
        commits: Array<{
            hash: string;
            date: string;
            message: string;
        }>;
    };
    system?: {
        graphUpdatedAt?: string;
        ragUpdatedAt?: string;
        ollama?: boolean;
    };
};
