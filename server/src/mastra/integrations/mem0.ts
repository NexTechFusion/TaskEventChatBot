import dotenv from "dotenv";

dotenv.config();

/**
 * Mem0 Integration with Local Vector Store
 * 
 * Uses local-friendly settings:
 * - In-memory vector store for fast access
 * - SQLite for history storage
 * - Local embeddings and LLM (or OpenAI if API key provided)
 * 
 * This provides persistent memory across sessions without external dependencies
 * beyond optional OpenAI API key for better embeddings.
 */

// Lazy import to avoid loading mem0ai and all peer dependencies at module load time
let memory: any = null;
let MemoryClass: any = null;

async function getMemory() {
  if (!memory) {
    if (!MemoryClass) {
      // Dynamic import to avoid loading peer deps until needed
      const mem0Module = await import("mem0ai/oss");
      MemoryClass = mem0Module.Memory;
    }

    // Create memory instance with local-friendly settings
    // According to docs: uses OpenAI gpt-4.1-nano-2025-04-14, text-embedding-3-small, 
    // in-memory vector store, and SQLite history by default
    const memoryConfig: any = {
      version: "v1.1",
      // In-memory vector store for local operation (as requested)
      vectorStore: {
        provider: "memory",
        config: {
          collectionName: "memories",
          dimension: 1536,
        },
      },
      // SQLite database for history storage (local file)
      historyDbPath: process.env.MEM0_DB_PATH || "./mem0.db",
    };

    // Add OpenAI embedder if API key is available (otherwise uses default)
    if (process.env.OPENAI_API_KEY) {
      memoryConfig.embedder = {
        provider: "openai",
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: "text-embedding-3-small",
        },
      };
      // Also add LLM config if API key available
      memoryConfig.llm = {
        provider: "openai",
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: "gpt-4-turbo-preview",
        },
      };
    }

    memory = new MemoryClass(memoryConfig);
  }
  return memory;
}

/**
 * Add a memory for a user
 * @param messages - Conversation messages to extract memories from
 * @param userId - User ID to associate the memory with
 * @param metadata - Optional metadata to attach to the memory
 */
export async function addMemory(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  metadata?: Record<string, any>
) {
  try {
    const mem = await getMemory();
    await mem.add(messages, {
      userId,
      metadata: metadata || {},
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding memory:", error);
    throw error;
  }
}

/**
 * Search memories for a user
 * @param query - Search query
 * @param userId - User ID to search memories for
 * @param limit - Maximum number of results to return
 */
export async function searchMemory(
  query: string,
  userId: string,
  limit: number = 5
) {
  try {
    const mem = await getMemory();
    const results = await mem.search(query, {
      userId,
      limit,
    });

    if (results.results && results.results.length > 0) {
      // Return the most relevant memory
      return results.results[0].memory;
    }

    return null;
  } catch (error) {
    console.error("Error searching memory:", error);
    return null;
  }
}

/**
 * Get all memories for a user
 * @param userId - User ID to get memories for
 */
export async function getAllMemories(userId: string) {
  try {
    const mem = await getMemory();
    const results = await mem.search("", {
      userId,
      limit: 100, // Get up to 100 memories
    });

    return results.results || [];
  } catch (error) {
    console.error("Error getting all memories:", error);
    return [];
  }
}

/**
 * Delete a memory by ID
 * @param memoryId - Memory ID to delete
 * @param userId - User ID (for verification)
 */
export async function deleteMemory(memoryId: string, userId: string) {
  try {
    const mem = await getMemory();
    await mem.delete(memoryId, userId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting memory:", error);
    throw error;
  }
}

export default getMemory;

