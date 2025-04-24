/**
 * Image Generation Tool - Proxy for text-to-image capabilities
 * 
 * This tool provides a proxy for image generation capabilities.
 * Note: Actual image generation depends on Claude's rendering capabilities.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateWithGeminiPro } from "../gemini-client.js";

/**
 * Register image generation tools with the MCP server
 */
export function registerImageGenTool(server: McpServer): void {
  server.tool(
    "gemini-image-prompt",
    {
      description: z.string().describe("Description of the image to generate"),
      style: z.string().optional().describe("The artistic style for the image"),
      mood: z.string().optional().describe("The mood or atmosphere of the image"),
      details: z.string().optional().describe("Additional details to include")
    },
    async ({ description, style, mood, details }) => {
      console.log(`Generating image prompt for: ${description}`);
      
      try {
        const prompt = `
You are an expert at creating detailed text-to-image prompts for generative AI art tools. 
Based on the following description, create a highly detailed, structured prompt that would produce the best possible image.

Description: ${description}
${style ? `Style: ${style}` : ''}
${mood ? `Mood: ${mood}` : ''}
${details ? `Additional details: ${details}` : ''}

Format your response as follows:
1. A refined one-paragraph image prompt that's highly detailed and descriptive
2. Key elements that should be emphasized
3. Technical suggestions (like camera angle, lighting, etc.)
4. Style references that would work well

Use detail-rich, vivid language that generative AI image models would respond well to.
`;

        const response = await generateWithGeminiPro(prompt);
        
        return {
          content: [{ 
            type: "text", 
            text: response 
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error generating image prompt: ${errorMessage}`);
        
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${errorMessage}` 
          }],
          isError: true
        };
      }
    }
  );
}