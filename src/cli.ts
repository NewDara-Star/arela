#!/usr/bin/env node
/**
 * Arela CLI
 * 
 * The AI's Memory Layer for Vibecoding
 */

import { Command } from "commander";
import { runServer } from "./mcp/server.js";

const program = new Command();

program
    .name("arela")
    .description("The AI's Memory Layer for Vibecoding")
    .version("5.0.0");

program
    .command("mcp")
    .description("Start MCP server for IDE integration")
    .option("--cwd <dir>", "Working directory", process.cwd())
    .action(async (options) => {
        await runServer({ cwd: options.cwd });
    });

program.parse();
