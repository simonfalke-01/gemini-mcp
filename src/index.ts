#!/usr/bin/env node

/**
 * MCP Server Gemini - Integrates Google's Gemini models with Claude Code
 * 
 * This MCP server provides access to Gemini models for use in Claude Code.
 * Features include direct queries, brainstorming, and analysis tools.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseArgs } from "node:util";

// Import tools
import { registerQueryTool } from "./tools/query.js";
import { registerBrainstormTool } from "./tools/brainstorm.js";
import { registerAnalyzeTool } from "./tools/analyze.js";
import { registerSummarizeTool } from "./tools/summarize.js";
import { registerImageGenTool } from "./tools/image-gen.js";

// Import Gemini client and logger
import { initGeminiClient } from "./gemini-client.js";
import { setupLogger, logger, LogLevel } from "./utils/logger.js";

// Parse command line arguments
const { values } = parseArgs({
  options: {
    verbose: {
      type: "boolean",
      short: "v",
      default: false,
    },
    quiet: {
      type: "boolean",
      short: "q",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    }
  }
});

// Show help if requested
if (values.help) {
  console.log(`
MCP Server Gemini - Integrates Google's Gemini models with Claude Code

Usage:
  gemini-mcp [options]

Options:
  -v, --verbose    Enable verbose logging (shows all prompts and responses)
  -q, --quiet      Run in quiet mode (minimal logging)
  -h, --help       Show this help message

Environment Variables:
  GEMINI_API_KEY   (required) Your Google Gemini API key
  VERBOSE          (optional) Set to "true" to enable verbose logging
  QUIET            (optional) Set to "true" to enable quiet mode
  GEMINI_MODEL     (optional) Default Gemini model to use
  GEMINI_PRO_MODEL (optional) Specify Pro model variant
  GEMINI_FLASH_MODEL (optional) Specify Flash model variant
  `);
  process.exit(0);
}

// Configure logging mode based on command line args or environment variables
let logLevel: LogLevel = "normal";
if (values.verbose || process.env.VERBOSE === "true") {
  logLevel = "verbose";
} else if (values.quiet || process.env.QUIET === "true") {
  logLevel = "quiet";
}
setupLogger(logLevel);

// Check for required API key
if (!process.env.GEMINI_API_KEY) {
  logger.error("Error: GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

// Get model name from environment or use default
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-pro-preview-03-25";

async function main() {
  logger.info(`Starting MCP Gemini Server with model: ${geminiModel}`);
  logger.info(`Logging mode: ${logLevel}`);

  try {
    // Initialize Gemini client
    await initGeminiClient();

    // Create MCP server
    const server = new McpServer({
      name: "Gemini",
      version: "0.1.0"
    });

    // Register tools
    registerQueryTool(server);
    registerBrainstormTool(server);
    registerAnalyzeTool(server);
    registerSummarizeTool(server);
    registerImageGenTool(server);

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("MCP Gemini Server running");

    // Handle process termination
    process.on("SIGINT", async () => {
      logger.info("Shutting down MCP Gemini Server");
      await server.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Shutting down MCP Gemini Server");
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start MCP Gemini Server:", error);
    process.exit(1);
  }
}

main();