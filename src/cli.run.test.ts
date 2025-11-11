import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import {
  buildRunCommand,
  handleRunCommand,
  RunCommandOptions,
  UnsupportedPlatformError,
} from "./cli.js";

function createProgramWithRunCommand(handler = vi.fn().mockResolvedValue(undefined)) {
  const program = new Command();
  buildRunCommand(program, handler);
  program.exitOverride();
  return { program, handler };
}

describe("arela run command", () => {
  it("parses defaults for mobile execution", async () => {
    const { program, handler } = createProgramWithRunCommand();

    await program.parseAsync(["run", "mobile"], { from: "user" });

    expect(handler).toHaveBeenCalledWith(
      "mobile",
      expect.objectContaining({
        platform: "ios",
        flow: "default",
        device: undefined,
        app: undefined,
      })
    );
  });

  it("passes user supplied mobile options to handler", async () => {
    const { program, handler } = createProgramWithRunCommand();
    const args = [
      "run",
      "mobile",
      "--platform",
      "android",
      "--device",
      "Pixel 7",
      "--flow",
      "onboarding",
      "--app",
      "./app.apk",
    ];

    await program.parseAsync(args, { from: "user" });

    expect(handler).toHaveBeenCalledWith(
      "mobile",
      expect.objectContaining({
        platform: "android",
        device: "Pixel 7",
        flow: "onboarding",
        app: "./app.apk",
      })
    );
  });

  it("throws a friendly error when platform is unsupported", async () => {
    const opts: RunCommandOptions = {
      flow: "default",
      url: "http://localhost:3000",
    };

    await expect(handleRunCommand("desktop", opts)).rejects.toBeInstanceOf(
      UnsupportedPlatformError
    );
  });
});
