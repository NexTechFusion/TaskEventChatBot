import { createTool } from "@mastra/core";
import { z } from "zod";
import { addMemory, searchMemory, getAllMemories } from "../integrations/mem0";

/**
 * Mem0 Tools for Persistent Memory
 * 
 * These tools allow agents to:
 * - Remember user preferences and facts across sessions
 * - Search for relevant memories when needed
 * - Store important context that persists beyond conversation history
 */

/**
 * Tool to search and retrieve memories for the user
 */
export const mem0RememberTool = createTool({
  id: "mem0-remember",
  description: `Remember information about the user from past conversations and preferences. 
    Use this to recall user preferences, facts, or context before taking actions.
    
    Examples:
    - "What timezone does the user prefer?"
    - "What are the user's preferences for task priorities?"
    - "What did the user say about their work schedule?"
    - "What preferences does the user have for meeting times?"
    
    Returns the most relevant memory or null if nothing found.`,
  inputSchema: z.object({
    question: z
      .string()
      .describe("Question to search memories (e.g., 'What timezone does the user prefer?', 'What are the user's preferences for task priorities?')"),
    userId: z.string().describe("User ID to search memories for"),
  }),
  outputSchema: z.object({
    answer: z
      .string()
      .describe("Retrieved memory or 'No relevant memory found' if nothing was found"),
    found: z.boolean().describe("Whether a relevant memory was found"),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`🔍 Searching memory for user ${context.userId}: "${context.question}"`);
      
      const memory = await searchMemory(context.question, context.userId, 1);
      
      if (memory) {
        console.log(`✅ Found memory: "${memory}"`);
        return {
          answer: memory,
          found: true,
        };
      }
      
      console.log(`ℹ️ No relevant memory found for: "${context.question}"`);
      return {
        answer: "No relevant memory found",
        found: false,
      };
    } catch (error) {
      console.error("Error in mem0-remember:", error);
      return {
        answer: "Error searching memory",
        found: false,
      };
    }
  },
});

/**
 * Tool to store new memories for the user
 */
export const mem0MemorizeTool = createTool({
  id: "mem0-memorize",
  description: `Save important information about the user for future reference. 
    Use this to remember preferences, facts, or context that should persist across sessions.
    
    Examples of what to remember:
    - "User prefers EST timezone"
    - "User always wants high priority for urgent tasks"
    - "User prefers morning meetings (9am-12pm)"
    - "User works Monday to Friday, 9am-5pm"
    - "User likes detailed task descriptions"
    - "User's team is called 'DevOps Squad'"
    
    This information will be available in future conversations.`,
  inputSchema: z.object({
    statement: z
      .string()
      .describe("Important fact or preference to remember (e.g., 'User prefers EST timezone', 'User always wants high priority for urgent tasks')"),
    userId: z.string().describe("User ID to associate the memory with"),
    metadata: z
      .record(z.any())
      .optional()
      .describe("Optional metadata to attach to the memory (e.g., { category: 'preferences', type: 'timezone' })"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the memory was saved successfully"),
    message: z.string().describe("Confirmation message"),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`💾 Memorizing for user ${context.userId}: "${context.statement}"`);
      
      // Create conversation messages that encode the memory
      const messages = [
        {
          role: "user" as const,
          content: context.statement,
        },
        {
          role: "assistant" as const,
          content: `I'll remember that: ${context.statement}`,
        },
      ];

      await addMemory(
        messages,
        context.userId,
        context.metadata || {}
      );
      
      console.log(`✅ Memory saved: "${context.statement}"`);
      
      return {
        success: true,
        message: `Remembered: ${context.statement}`,
      };
    } catch (error) {
      console.error("Error in mem0-memorize:", error);
      return {
        success: false,
        message: `Error saving memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Tool to get all memories for a user (for debugging or review)
 */
export const mem0ListMemoriesTool = createTool({
  id: "mem0-list-memories",
  description: `List all memories stored for the user. 
    Useful for reviewing what information is stored about the user.
    Returns up to 100 memories.`,
  inputSchema: z.object({
    userId: z.string().describe("User ID to list memories for"),
  }),
  outputSchema: z.object({
    memories: z
      .array(
        z.object({
          id: z.string(),
          memory: z.string(),
          metadata: z.record(z.any()).optional(),
        })
      )
      .describe("List of stored memories"),
    count: z.number().describe("Total number of memories found"),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`📋 Listing memories for user ${context.userId}`);
      
      const memories = await getAllMemories(context.userId);
      
      return {
        memories: memories.map((m: any) => ({
          id: m.id || "",
          memory: m.memory || "",
          metadata: m.metadata || {},
        })),
        count: memories.length,
      };
    } catch (error) {
      console.error("Error in mem0-list-memories:", error);
      return {
        memories: [],
        count: 0,
      };
    }
  },
});

