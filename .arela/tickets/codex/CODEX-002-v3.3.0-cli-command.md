# CODEX-002: Add "arela run mobile" CLI Command

**Agent:** codex  
**Priority:** high  
**Complexity:** simple  
**Status:** pending  
**Depends on:** CLAUDE-001

## Context
Add the `arela run mobile` command to the CLI that invokes the Appium mobile runner.

## Technical Task
Update `src/cli.ts` to add mobile platform support to the existing `run` command:
- Add mobile platform handling to existing `run` command
- Options: --platform, --device, --flow, --app
- Integration with mobile runner
- Help text and examples

## Acceptance Criteria
- [ ] `arela run mobile` command works
- [ ] All options are supported (--platform, --device, --flow, --app)
- [ ] Help text is clear and helpful
- [ ] Defaults are sensible (platform=ios, flow=default)
- [ ] Error messages are user-friendly

## Files to Modify
- `src/cli.ts`

## Implementation
Update the existing `run` command to handle both web and mobile:

```typescript
program
  .command("run")
  .description("Run and test your app like a real user")
  .argument("<platform>", "Platform: web or mobile")
  .option("--url <url>", "URL for web apps", "http://localhost:3000")
  .option("--platform <platform>", "Mobile platform: ios or android", "ios")
  .option("--device <name>", "Device name (e.g., 'iPhone 15 Pro')")
  .option("--app <path>", "Path to .app or .apk file (auto-detects Expo)")
  .option("--flow <name>", "User flow to test", "default")
  .option("--headless", "Run browser in headless mode (web only)", false)
  .option("--record", "Record video of test execution", false)
  .addHelpText(
    "after",
    "\nExamples:\n" +
    "  $ arela run web\n" +
    "  $ arela run web --url http://localhost:8080\n" +
    "  $ arela run web --flow signup --headless\n" +
    "  $ arela run mobile\n" +
    "  $ arela run mobile --platform android\n" +
    "  $ arela run mobile --device 'Pixel 7' --flow onboarding\n"
  )
  .action(async (platform, opts) => {
    if (platform === "web") {
      try {
        const { runWebApp } = await import("./run/web.js");
        await runWebApp({
          url: opts.url,
          flow: opts.flow,
          headless: Boolean(opts.headless),
          record: Boolean(opts.record),
        });
      } catch (error) {
        console.error(pc.red(`\n😵‍💫 Web runner hit a snag: ${(error as Error).message}\n`));
        process.exit(1);
      }
      return;
    }

    if (platform === "mobile") {
      try {
        const { runMobileApp } = await import("./run/mobile.js");
        await runMobileApp({
          platform: opts.platform as "ios" | "android",
          device: opts.device,
          flow: opts.flow,
          app: opts.app,
        });
      } catch (error) {
        console.error(pc.red(`\n😵‍💫 Mobile runner hit a snag: ${(error as Error).message}\n`));
        process.exit(1);
      }
      return;
    }

    console.error(pc.red(`Platform "${platform}" not supported.`));
    console.log(pc.gray("Supported platforms: web, mobile"));
    process.exit(1);
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
  --platform <platform> Mobile platform: ios or android (default: "ios")
  --device <name>     Device name (e.g., 'iPhone 15 Pro')
  --app <path>        Path to .app or .apk file (auto-detects Expo)
  --flow <name>       User flow to test (default: "default")
  --headless          Run browser in headless mode (web only) (default: false)
  --record            Record video of test execution (default: false)
  -h, --help          Display help for command

Examples:
  $ arela run web
  $ arela run web --url http://localhost:8080
  $ arela run web --flow signup --headless
  $ arela run mobile
  $ arela run mobile --platform android
  $ arela run mobile --device 'Pixel 7' --flow onboarding
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
