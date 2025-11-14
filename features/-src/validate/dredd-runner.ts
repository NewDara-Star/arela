import Dredd from 'dredd';
import path from 'path';

export interface DreddConfiguration {
  endpoint: string;
  path: string[];
  hookfiles?: string[];
  reporter?: string[];
  output?: string[];
  header?: string[];
  sorted?: boolean;
  user?: string | null;
  inlineErrors?: boolean;
  details?: boolean;
  method?: string[];
  only?: string[];
  color?: boolean;
  loglevel?: string;
  timestamp?: boolean;
  dry?: boolean;
  server?: string;
  request?: any;
  response?: any;
  [key: string]: any;
}

export interface DreddStats {
  total: number;
  failures: number;
  errors: number;
  passes: number;
  skipped: number;
  tests: Array<{
    title: string;
    status: string;
    expected?: any;
    actual?: any;
    message?: string;
  }>;
}

export async function runDredd(
  configuration: DreddConfiguration
): Promise<{ stats: DreddStats; error?: Error }> {
  return new Promise((resolve) => {
    try {
      const dredd = new Dredd(configuration);

      dredd.run((error: any, stats: any) => {
        if (error) {
          resolve({
            stats: {
              total: stats?.total || 0,
              failures: stats?.failures || 0,
              errors: stats?.errors || 0,
              passes: stats?.passes || 0,
              skipped: stats?.skipped || 0,
              tests: stats?.tests || [],
            },
            error,
          });
        } else {
          resolve({
            stats: {
              total: stats.total || 0,
              failures: stats.failures || 0,
              errors: stats.errors || 0,
              passes: stats.passes || 0,
              skipped: stats.skipped || 0,
              tests: stats.tests || [],
            },
          });
        }
      });
    } catch (error) {
      resolve({
        stats: {
          total: 0,
          failures: 0,
          errors: 1,
          passes: 0,
          skipped: 0,
          tests: [],
        },
        error: error as Error,
      });
    }
  });
}

export function getDreddConfig(
  specPath: string,
  serverUrl: string,
  hookfiles?: string[]
): DreddConfiguration {
  return {
    endpoint: serverUrl,
    path: [specPath],
    hookfiles: hookfiles || [],
    reporter: ['json'],
    output: [],
    header: [],
    sorted: false,
    user: null,
    'inline-errors': false,
    details: true,
    method: [],
    only: [],
    color: true,
    loglevel: 'warning',
    timestamp: false,
    dry: false,
  };
}
