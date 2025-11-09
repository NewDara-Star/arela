import fs from "fs-extra";
import path from "path";
import crypto from "crypto";

export interface NetAllowConfig {
  enabled: boolean;
  domains: string[];
  rate_limit_per_min: number;
  timeout_ms: number;
  max_bytes: number;
}

export interface FetchResult {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  cached: boolean;
  bytes: number;
}

const requestLog: Array<{ ts: number; url: string }> = [];

export async function loadAllowConfig(cwd: string): Promise<NetAllowConfig | null> {
  const configPath = path.join(cwd, ".arela", "net.allow.json");
  
  if (!(await fs.pathExists(configPath))) {
    return null;
  }
  
  return await fs.readJson(configPath);
}

export async function netFetch(
  cwd: string,
  url: string,
  opts: { force?: boolean } = {}
): Promise<FetchResult> {
  // Check if network is disabled
  if (process.env.ARELA_NET_DISABLED === "1") {
    throw new Error("Network access disabled (ARELA_NET_DISABLED=1)");
  }
  
  // Load allowlist
  const config = await loadAllowConfig(cwd);
  
  if (!config) {
    throw new Error("Network allowlist not found (.arela/net.allow.json)");
  }
  
  if (!config.enabled) {
    throw new Error("Network access disabled in config");
  }
  
  // Check domain allowlist
  const urlObj = new URL(url);
  const allowed = config.domains.some(domain => {
    if (domain.startsWith("*.")) {
      return urlObj.hostname.endsWith(domain.slice(2));
    }
    return urlObj.hostname === domain;
  });
  
  if (!allowed) {
    throw new Error(`Domain not allowed: ${urlObj.hostname}`);
  }
  
  // Check rate limit
  const now = Date.now();
  const recentRequests = requestLog.filter(r => now - r.ts < 60000);
  
  if (recentRequests.length >= config.rate_limit_per_min) {
    throw new Error(`Rate limit exceeded (${config.rate_limit_per_min}/min)`);
  }
  
  // Check budget
  const budget = process.env.ARELA_NET_BUDGET
    ? parseInt(process.env.ARELA_NET_BUDGET)
    : Infinity;
  
  if (requestLog.length >= budget) {
    throw new Error(`Budget exceeded (${budget} requests)`);
  }
  
  // Check cache
  const cacheDir = path.join(cwd, ".arela", "cache", "http");
  await fs.ensureDir(cacheDir);
  
  const urlHash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
  const cachePath = path.join(cacheDir, `${urlHash}.json`);
  const cacheMetaPath = path.join(cacheDir, `${urlHash}.meta.json`);
  
  if (!opts.force && (await fs.pathExists(cachePath))) {
    const meta = await fs.readJson(cacheMetaPath);
    const cacheTTL = process.env.ARELA_NET_CACHE_TTL
      ? parseInt(process.env.ARELA_NET_CACHE_TTL)
      : 86400;
    
    if (now - meta.ts < cacheTTL * 1000) {
      const body = await fs.readFile(cachePath, "utf8");
      
      await logRequest(cwd, {
        url,
        status: meta.status,
        bytes: body.length,
        cached: true,
      });
      
      return {
        url,
        status: meta.status,
        headers: meta.headers,
        body,
        cached: true,
        bytes: body.length,
      };
    }
  }
  
  // Fetch
  requestLog.push({ ts: now, url });
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout_ms);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Arela/1.0",
      },
    });
    
    clearTimeout(timeout);
    
    // Check size
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > config.max_bytes) {
      throw new Error(`Response too large (${contentLength} > ${config.max_bytes})`);
    }
    
    const body = await response.text();
    
    if (body.length > config.max_bytes) {
      throw new Error(`Response too large (${body.length} > ${config.max_bytes})`);
    }
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Cache
    await fs.writeFile(cachePath, body);
    await fs.writeJson(cacheMetaPath, {
      url,
      ts: now,
      status: response.status,
      headers,
    });
    
    await logRequest(cwd, {
      url,
      status: response.status,
      bytes: body.length,
      cached: false,
    });
    
    return {
      url,
      status: response.status,
      headers,
      body,
      cached: false,
      bytes: body.length,
    };
  } catch (error) {
    clearTimeout(timeout);
    
    if ((error as Error).name === "AbortError") {
      throw new Error(`Request timeout (${config.timeout_ms}ms)`);
    }
    
    throw error;
  }
}

async function logRequest(
  cwd: string,
  entry: { url: string; status: number; bytes: number; cached: boolean }
): Promise<void> {
  const logPath = path.join(cwd, ".arela", "logs", "net.log");
  await fs.ensureDir(path.dirname(logPath));
  
  const line = `${new Date().toISOString()} ${entry.cached ? "CACHE" : "FETCH"} ${entry.status} ${entry.bytes}b ${entry.url}\n`;
  await fs.appendFile(logPath, line);
}

export async function checkUrl(cwd: string, url: string): Promise<boolean> {
  const config = await loadAllowConfig(cwd);
  
  if (!config || !config.enabled) {
    return false;
  }
  
  const urlObj = new URL(url);
  return config.domains.some(domain => {
    if (domain.startsWith("*.")) {
      return urlObj.hostname.endsWith(domain.slice(2));
    }
    return urlObj.hostname === domain;
  });
}
