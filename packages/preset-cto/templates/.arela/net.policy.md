---
id: arela.net_policy
title: Network Access Policy
version: 1.0.0
tags: [security, network]
---

# Network Access Policy

## Rules

- Agents MUST call the Arela fetcher, not raw http(s)
- Arela enforces domain allowlist, rate limits, byte caps
- All external pulls get cached under `.arela/cache/http/`
- Doctor fails if `enabled=true` and no allowlist found

## Usage

```bash
# Fetch with allowlist enforcement
npx arela net fetch <url> [--json]

# Check allowlist
npx arela net check <url>

# View cache
npx arela net cache ls
```

## Allowlist

Configured in `.arela/net.allow.json`:

- **enabled**: `true` to enforce, `false` to disable
- **domains**: Allowed domains (exact match or wildcard)
- **rate_limit_per_min**: Max requests per minute
- **timeout_ms**: Request timeout
- **max_bytes**: Max response size

## Cache

All fetched content is cached in `.arela/cache/http/` with:

- URL hash as filename
- Metadata (URL, timestamp, headers)
- Content

Cache is reused for identical URLs within 24 hours.

## Provenance

All network requests are logged to `.arela/logs/net.log` with:

- Timestamp
- URL
- Status
- Bytes
- Cache hit/miss

## Environment Variables

- `ARELA_NET_DISABLED=1` - Hard-kill network access
- `ARELA_NET_BUDGET=50` - Max requests per job
- `ARELA_NET_CACHE_TTL=86400` - Cache TTL in seconds

## Security

- No raw `curl`, `wget`, or `fetch` allowed
- All requests go through Arela
- Allowlist enforced at CLI level
- Budget prevents abuse
- Cache prevents redundant requests
