/**
 * Brainstorm Tool - Enables collaborative brainstorming between Claude and Gemini
 * 
 * This tool facilitates multi-round collaborative planning between Claude and Gemini.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateWithGeminiPro } from "../gemini-client.js";

interface BrainstormRound {
  round: number;
  claudeInput: string;
  geminiResponse: string;
}

/**
 * Register brainstorm tool with the MCP server
 */
export function registerBrainstormTool(server: McpServer): void {
  server.tool(
    "gemini-brainstorm",
    {
      prompt: z.string().describe("The problem statement or query to brainstorm about"),
      round: z.number().int().min(1).default(1).describe("The current round of brainstorming"),
      claudeInput: z.string().optional().describe("Claude's latest perspective (required for round > 1)"),
      history: z.array(z.object({
        round: z.number(),
        claudeInput: z.string(),
        geminiResponse: z.string(),
      })).optional().describe("The history of previous brainstorming rounds")
    },
    async ({ prompt, round, claudeInput, history = [] }) => {
      console.log(`Brainstorming round ${round} with Gemini`);
      
      try {
        // For round 1, generate initial thoughts
        if (round === 1) {
          const initialPrompt = `
You are participating in a collaborative brainstorming session with Claude, another AI assistant.
Together, you will create a plan to address the following request:

---
${prompt}
---

Please provide your initial thoughts, considering:
1. How you would approach this problem
2. What information or resources you might need
3. Any challenges you anticipate
4. The steps you would take to implement a solution

Remember, this is the first round of a collaborative discussion, so focus on sharing your initial perspective rather than a complete solution.
`;

          const geminiResponse = await generateWithGeminiPro(initialPrompt);
          
          return {
            content: [{ 
              type: "text", 
              text: geminiResponse 
            }]
          };
        } 
        // For subsequent rounds, consider Claude's input and history
        else {
          if (!claudeInput) {
            return {
              content: [{ 
                type: "text", 
                text: "Error: Claude's input is required for rounds after the first one" 
              }],
              isError: true
            };
          }

          const historyText = history.map(entry => `
Round ${entry.round}:
- Claude: ${entry.claudeInput.substring(0, 500)}...
- Gemini: ${entry.geminiResponse.substring(0, 500)}...
`).join("\n");

          const collaborationPrompt = `
You are in round ${round} of a collaborative brainstorming session about this request:

---
${prompt}
---

${history.length > 0 ? `Here's a summary of the previous rounds:\n${historyText}` : ''}

Claude's latest perspective:
${claudeInput}

Based on Claude's perspective${history.length > 0 ? ' and the previous discussion' : ''}, please:
1. Identify areas where you agree with Claude
2. Note any valuable insights from Claude that you hadn't considered
3. Respectfully point out any potential issues with Claude's approach
4. Build upon both your ideas to refine the approach
5. Suggest concrete next steps or details to consider

Remember, this is a collaborative process to develop the best possible solution.
`;

          const geminiResponse = await generateWithGeminiPro(collaborationPrompt);
          
          return {
            content: [{ 
              type: "text", 
              text: geminiResponse 
            }]
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in brainstorming: ${errorMessage}`);
        
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
  
  // Final synthesis tool after brainstorming
  server.tool(
    "gemini-brainstorm-synthesis",
    {
      prompt: z.string().describe("The original problem statement or query"),
      history: z.array(z.object({
        round: z.number(),
        claudeInput: z.string(),
        geminiResponse: z.string(),
      })).describe("The complete history of brainstorming rounds")
    },
    async ({ prompt, history }) => {
      console.log(`Creating brainstorm synthesis with Gemini`);
      
      try {
        const historyText = history.map(entry => `
Round ${entry.round}:
- Claude: ${entry.claudeInput.substring(0, 500)}...
- Gemini: ${entry.geminiResponse.substring(0, 500)}...
`).join("\n");

        const synthesisPrompt = `
You've participated in a collaborative brainstorming session with Claude about this request:

---
${prompt}
---

Here's the complete conversation history:
${historyText}

Based on this collaborative discussion, please provide:
1. A comprehensive synthesis of the best ideas from both assistants
2. A clear, step-by-step plan to address the user's request
3. Required resources, tools, or information needed
4. Any potential challenges and how to address them
5. A conclusion summarizing the unified approach

Present this as a unified final plan that represents the best collaborative thinking of both assistants.
`;

        const geminiResponse = await generateWithGeminiPro(synthesisPrompt);
        
        return {
          content: [{ 
            type: "text", 
            text: geminiResponse 
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in brainstorm synthesis: ${errorMessage}`);
        
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