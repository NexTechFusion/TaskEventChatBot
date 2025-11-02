# Mem0 Persistent Memory Integration

This integration adds persistent memory capabilities to your Mastra agents using Mem0 with a local vector store.

## Overview

- **Local Vector Store**: In-memory vector store for fast access
- **SQLite History**: Local SQLite database for conversation history
- **Optional OpenAI**: Uses OpenAI embeddings/LLM if API key is available, otherwise defaults to local

## Installation

The following packages have been installed:
- `mem0ai` - Mem0 Node SDK
- `ollama` - Required peer dependency for OSS version

## Files Created

1. **`server/src/mastra/integrations/mem0.ts`** - Mem0 integration with local configuration
2. **`server/src/mastra/tools/mem0-tools.ts`** - Tools for remembering and memorizing

## Tools Available

### `mem0-remember`
Searches for and retrieves stored memories for a user.

**Usage Example:**
- "What timezone does the user prefer?"
- "What are the user's preferences for task priorities?"

### `mem0-memorize`
Saves important information about the user for future reference.

**Usage Example:**
- "User prefers EST timezone"
- "User always wants high priority for urgent tasks"

### `mem0-list-memories`
Lists all memories stored for a user (for debugging/review).

## Agents Updated

### Task Agent
- Added `mem0RememberTool` and `mem0MemorizeTool`
- Updated instructions to use Mem0 for preferences
- Will check user preferences before creating tasks

### Event Agent
- Added `mem0RememberTool` and `mem0MemorizeTool`
- Updated instructions to use Mem0 for timezone/scheduling preferences
- Will check user preferences before creating events

## Configuration

### Environment Variables

Optional:
- `OPENAI_API_KEY` - If set, uses OpenAI for embeddings/LLM (better quality)
- `MEM0_DB_PATH` - Path for SQLite database (default: `./mem0.db`)

### Default Behavior

Without `OPENAI_API_KEY`:
- Uses default local embeddings
- Uses default local LLM
- In-memory vector store
- SQLite history storage

With `OPENAI_API_KEY`:
- Uses OpenAI `text-embedding-3-small` for embeddings
- Uses OpenAI `gpt-4-turbo-preview` for LLM
- In-memory vector store (as requested)
- SQLite history storage

## Usage Examples

### Agent automatically remembering preferences

**User**: "I prefer morning meetings"

**Agent**: Uses `mem0-memorize` to save: "User prefers morning meetings (9am-12pm)"

**Next Session**:
**User**: "Schedule a meeting tomorrow"

**Agent**: Uses `mem0-remember` to check: "What are the user's preferences for meeting times?"
**Agent**: Finds: "User prefers morning meetings (9am-12pm)"
**Agent**: Suggests morning times automatically

### Agent checking preferences before actions

**User**: "Create an urgent task"

**Agent**: 
1. Uses `mem0-remember`: "What are the user's preferences for urgent task priorities?"
2. Finds: "User always wants high priority for urgent tasks"
3. Creates task with `priority: "high"` automatically

## How It Works

1. **Memory Storage**: When agents use `mem0-memorize`, memories are stored in:
   - Vector store (in-memory) for semantic search
   - SQLite database for history persistence

2. **Memory Retrieval**: When agents use `mem0-remember`, it:
   - Performs semantic search in the vector store
   - Returns the most relevant memory based on the query
   - Works across sessions using the userId

3. **Integration with Agents**:
   - Agents automatically check preferences before actions
   - Agents save preferences when users express them
   - Works alongside Mastra's conversation history memory

## Benefits

1. **Persistent Preferences**: User preferences persist across sessions
2. **Personalization**: Agents adapt to user's preferences automatically
3. **Context Retention**: Important facts about users are remembered
4. **Local Operation**: Works entirely locally (no external API needed)
5. **Fast Access**: In-memory vector store provides fast retrieval

## Notes

- Mem0 memories work alongside Mastra memory (conversation history)
- Mastra memory = conversation history for Agent.network()
- Mem0 memory = persistent facts/preferences across sessions
- Both complement each other for a complete memory system

