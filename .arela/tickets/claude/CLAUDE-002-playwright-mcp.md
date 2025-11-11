# CLAUDE-002: Playwright MCP Server

**Agent:** claude  
**Priority:** medium  
**Complexity:** complex  
**Status:** pending  
**Depends on:** CLAUDE-001

## Context
Create an MCP server that exposes Playwright browser control as tools, allowing Windsurf to interactively control and test web apps.

## Technical Task
Create `src/mcp/playwright.ts` with:
- MCP server setup with Playwright tools
- Browser lifecycle management
- Tool implementations for all flow actions
- Screenshot and video capture
- Integration with existing MCP framework

## Acceptance Criteria
- [ ] MCP server exposes Playwright tools
- [ ] Tools: navigate, click, type, waitFor, screenshot, evaluate
- [ ] Browser persists across tool calls
- [ ] Screenshots returned as base64 or file paths
- [ ] Proper cleanup on server shutdown
- [ ] Works alongside existing RAG MCP server

## Files to Create
- `src/mcp/playwright.ts`

## MCP Tools to Expose
```typescript
{
  tools: [
    {
      name: "playwright_navigate",
      description: "Navigate browser to URL",
      inputSchema: {
        url: z.string().url()
      }
    },
    {
      name: "playwright_click",
      description: "Click element by selector",
      inputSchema: {
        selector: z.string()
      }
    },
    {
      name: "playwright_type",
      description: "Type text into input field",
      inputSchema: {
        selector: z.string(),
        text: z.string()
      }
    },
    {
      name: "playwright_screenshot",
      description: "Capture screenshot of page",
      inputSchema: {
        name: z.string().optional()
      }
    },
    {
      name: "playwright_evaluate",
      description: "Execute JavaScript in browser",
      inputSchema: {
        script: z.string()
      }
    }
  ]
}
```

## Server Lifecycle
```typescript
export function createPlaywrightMcpServer(options: {
  headless?: boolean;
}): McpServer;

export async function runPlaywrightMcpServer(options: {
  headless?: boolean;
}): Promise<void>;
```

## Integration with Main MCP
Update `src/cli.ts` to support multiple MCP modes:
```bash
arela mcp                    # RAG only (default)
arela mcp --mode playwright  # Browser control
arela mcp --mode all         # Both RAG and Playwright
```

## Browser Management
- Launch browser on first tool call
- Keep browser alive between calls
- Close browser on server shutdown
- Support both headless and headed modes

## Screenshot Handling
- Save to `.arela/screenshots/`
- Return file path in tool response
- Optional base64 encoding for inline display

## Dependencies
- playwright: ^1.40.0 (already added)
- @modelcontextprotocol/sdk (already in dependencies)

## Tests Required
- Integration tests with MCP client
- Test each tool individually
- Test browser lifecycle
- Test error handling

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Example of MCP tool usage
- Test output showing browser control working
