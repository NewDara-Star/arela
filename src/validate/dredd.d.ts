declare module 'dredd' {
  interface DreddConfiguration {
    endpoint: string;
    path: string[];
    hookfiles?: string[];
    reporter?: string[];
    output?: string[];
    header?: string[];
    sorted?: boolean;
    user?: string | null;
    'inline-errors'?: boolean;
    details?: boolean;
    method?: string[];
    only?: string[];
    color?: boolean;
    loglevel?: string;
    timestamp?: boolean;
    [key: string]: any;
  }

  interface DreddStats {
    total: number;
    failures: number;
    errors: number;
    passes: number;
    skipped: number;
    tests?: Array<{
      title: string;
      status: string;
      expected?: any;
      actual?: any;
      message?: string;
    }>;
  }

  interface DreddInstance {
    run(callback: (error: any, stats: DreddStats) => void): void;
  }

  class Dredd {
    constructor(configuration: DreddConfiguration);
    run(callback: (error: any, stats: DreddStats) => void): void;
  }

  export = Dredd;
}
