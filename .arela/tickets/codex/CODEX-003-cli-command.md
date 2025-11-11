# CODEX-003: Add "arela run web" CLI Command

**Agent:** codex  
**Priority:** high  
**Complexity:** simple  
**Status:** pending  
**Depends on:** CLAUDE-001

## Context
Add the new `arela run web` command to the CLI that invokes the Playwright web runner.

## Technical Task
Update `src/cli.ts` to add:
- New `run` command with `web` subcommand
- Options: --url, --flow, --headless, --record
- Integration with web runner
- Help text and examples

## Acceptance Criteria
- [ ] `arela run web` command works
- [ ] All options are supported (--url, --flow, --headless, --record)
- [ ] Help text is clear and helpful
- [ ] Defaults are sensible (localhost:3000, headless=false)
- [ ] Error messages are user-friendly

## Files to Modify
- `src/cli.ts`

## Command Specification
```bash
arela run web [options]

Options:
  --url <url>         URL to test (default: "http://localhost:3000")
  --flow <name>       Flow to execute (default: "default")
  --headless          Run browser in headless mode (default: false)
  --record            Record video of test execution (default: false)
  -h, --help          Display help for command
```

## Implementation
```typescript
program
  .command("run")
  .description("Run and test your app like a real user")
  .argument("<platform>", "Platform: web or mobile")
  .option("--url <url>", "URL for web apps", "http://localhost:3000")
  .option("--flow <name>", "User flow to test", "default")
  .option("--headless", "Run browser in headless mode", false)
  .option("--record", "Record video of test execution", false)
  .action(async (platform, opts) => {
    if (platform === "web") {
      const { runWebApp } = await import("./run/web.js");
      await runWebApp(opts);
    } else {
      console.error(pc.red(`Platform "${platform}" not supported yet.`));
      console.log(pc.gray("Supported platforms: web"));
      process.exit(1);
    }
  });
```

## Help Output
```
Usage: arela run <platform> [options]

Run and test your app like a real user

Arguments:
  platform            Platform: web or mobile

Options:
  --url <url>         URL for web apps (default: "http://localhost:3000")
  --flow <name>       User flow to test (default: "default")
  --headless          Run browser in headless mode (default: false)
  --record            Record video of test execution (default: false)
  -h, --help          Display help for command

Examples:
  $ arela run web
  $ arela run web --url http://localhost:8080
  $ arela run web --flow signup --headless
```

## Tests Required
- Test command parsing
- Test option defaults
- Test error handling for unsupported platforms

## Report Required
- Summary of implementation
- Confirmation of each acceptance criterion
- Example of command help output
- Test showing command execution
