import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import type { CoreMessage } from 'ai';
import { getTaskAgent } from './mastra/agents/task-agent';
import { getEventAgent } from './mastra/agents/event-agent';
import { getRoutingAgent } from './mastra/agents/routing-agent';
import { getResearchAgent, conductDeepResearch, enrichResearchPrompt } from './mastra/agents/research-agent';
import { initializeDatabase, query } from './config/database';
import { mastra } from './mastra';
import { streamAgentNetwork } from './routes/stream';
import { getAllMemories, deleteMemory } from './mastra/integrations/mem0';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Helper function to fetch and format conversation history for Mastra agents
async function getConversationHistoryForAgent(
  userId: string, 
  conversationId?: string, 
  sessionId?: string,
  limit: number = 10
): Promise<CoreMessage[]> {
  try {
    // Build query conditions
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;
    
    if (conversationId) {
      whereConditions.push(`conversation_id = $${paramIndex}`);
      queryParams.push(conversationId);
      paramIndex++;
    }
    
    if (sessionId) {
      whereConditions.push(`session_id = $${paramIndex}`);
      queryParams.push(sessionId);
      paramIndex++;
    }
    
    // Add limit
    queryParams.push(limit);
    
    const queryText = `
      SELECT role, content, actions
      FROM conversation_history 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    
    const result = await query(queryText, queryParams);
    
    // Convert to Mastra format (reverse to get chronological order)
    const messages = result.rows.reverse().map((row: any) => {
      let content = row.content;
      
      // For assistant messages with actions, enrich the content with context
      if (row.role === 'assistant' && row.actions && Array.isArray(row.actions) && row.actions.length > 0) {
        const actionContext = row.actions.map((action: any) => {
          if (action.type === 'task' && action.data) {
            return `[Task ID: ${action.data.id}, Title: "${action.data.title}", Priority: ${action.data.priority}, Status: ${action.data.status}]`;
          }
          if (action.type === 'event' && action.data) {
            return `[Event ID: ${action.data.id}, Title: "${action.data.title}", Date: ${action.data.start_date}]`;
          }
          return '';
        }).filter(Boolean).join('\n');
        
        if (actionContext) {
          content = `${content}\n\nContext - Items mentioned:\n${actionContext}`;
        }
      }
      
      return {
        role: row.role as 'user' | 'assistant' | 'system',
        content
      };
    });
    
    return messages;
  } catch (error) {
    console.error('Error fetching conversation history for agent:', error);
    return [];
  }
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'task-track-bot-server',
    aiEnabled: hasApiKey,
    mode: 'mastra-agents-network',
    features: {
      streaming: true,
      agentNetwork: true,
      memory: true
    }
  });
});

// Streaming Agent Network API - Uses Agent.network() with SSE streaming
app.post('/api/agent/stream', streamAgentNetwork);

// General Agent API - Uses Mastra Intelligent Routing Workflow
app.post('/api/agent/general', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, userId, context } = req.body;
    
    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'OpenAI API key is required. Please set OPENAI_API_KEY in your .env file. Get one at: https://platform.openai.com/api-keys'
      });
      return;
    }

    // Fetch conversation history to provide context
    const conversationHistory = await getConversationHistoryForAgent(
      userId,
      context?.conversationId,
      context?.sessionId,
      10 // Last 10 messages
    );
    
    // Add current date/time context at the beginning
    const currentDateTime = context?.currentDateTime || new Date().toISOString();
    const timezone = context?.timezone || 'UTC';
    const dateTimeContext: CoreMessage = {
      role: 'system',
      content: `🔴 CRITICAL - CURRENT DATE AND TIME: ${currentDateTime} (Timezone: ${timezone})

YOU MUST USE THIS DATE AS YOUR REFERENCE POINT!
- Today is: ${new Date(currentDateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone })}
- When calculating "tomorrow", "next week", "Monday", etc., ALWAYS start from this date
- NEVER use dates from 2023 or any past years - we are in ${new Date(currentDateTime).getFullYear()}
- Double-check all dates you generate are in the correct year: ${new Date(currentDateTime).getFullYear()}`
    };
    
    console.log(`📜 Loaded ${conversationHistory.length} previous messages for context`);
    console.log(`📅 Current date/time: ${currentDateTime} (${timezone})`);

    // Check if this looks like a batch operation
    const lowerMessage = message.toLowerCase();
    const isBatchDelete = (lowerMessage.includes('delete') && (
      lowerMessage.includes('these') || lowerMessage.includes('those') || 
      lowerMessage.includes('them') || lowerMessage.includes('all')
    ));
    const isBatchComplete = (lowerMessage.includes('complete') || lowerMessage.includes('finish')) && (
      lowerMessage.includes('these') || lowerMessage.includes('those') || 
      lowerMessage.includes('them') || lowerMessage.includes('all')
    );

    let responseData;

    // Route to batch workflow if it's a batch operation
    if (isBatchDelete || isBatchComplete) {
      console.log('📦 Using Batch Operations Workflow');
      
      const workflow = mastra.getWorkflow('batchTaskWorkflow');
      const run = await workflow.createRunAsync();
      
      // @ts-ignore - Type mismatch in conversation history
      const result = await run.start({
        inputData: {
          message,
          conversationHistory: [
            dateTimeContext,
            ...conversationHistory
          ].map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : ''
          })),
          operation: isBatchDelete ? 'delete' : 'complete'
        }
      });

      if (result.status === 'success') {
        responseData = {
          response: result.result.message || 'Batch operation completed',
          message: result.result.message || 'Batch operation completed',
          actions: result.result.actions || [],
          agent: 'batch'
        };
      } else {
        throw new Error('Batch workflow failed');
      }
    } else {
      // Use intelligent routing workflow for regular requests
      console.log('🧠 Using Intelligent Routing Workflow');
      
      const workflow = mastra.getWorkflow('intelligentRoutingWorkflow');
      const run = await workflow.createRunAsync();
      
      // @ts-ignore - Type mismatch in conversation history
      const result = await run.start({
        inputData: {
          message,
          conversationHistory: [
            dateTimeContext,
            ...conversationHistory
          ]
            .filter(msg => msg.role !== 'tool') // Filter out tool messages
            .map(msg => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: typeof msg.content === 'string' ? msg.content : ''
            })),
          userId
        }
      });

      if (result.status === 'success') {
        // Debug: Log the full result structure
        console.log('🔍 Full workflow result:', JSON.stringify(result.result, null, 2));
        
        // The branched step result might be nested differently
        // Check if result has the expected structure or if it's wrapped
        // @ts-ignore - Dynamic property access from workflow result
        const workflowResult: any = result.result;
        const stepResult = workflowResult.handleWithTaskAgent || 
                          workflowResult.handleWithEventAgent || 
                          workflowResult.handleWithAnswerAgent ||
                          workflowResult.handleWithResearchAgent ||
                          workflowResult.handleWithBothAgents ||
                          workflowResult;
        
        responseData = {
          // @ts-ignore - Dynamic property access
          response: stepResult.response || 'Request processed',
          // @ts-ignore - Dynamic property access
          message: stepResult.response || 'Request processed',
          // @ts-ignore - Dynamic property access
          actions: stepResult.actions || [],
          // @ts-ignore - Dynamic property access
          agent: stepResult.agent || 'unknown'
        };
      } else {
        throw new Error('Routing workflow failed');
      }
    }

    console.log(`✅ Response: ${responseData.response?.substring(0, 100) || 'No response'}...`);
    console.log(`   Actions: ${responseData.actions?.length || 0} items`);
    console.log(`   Agent: ${responseData.agent}`);

    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('❌ Error in general agent:', error);
    
    // Fallback to direct agent call if workflow fails
    try {
      const { message, userId, context } = req.body;
      const conversationHistory = await getConversationHistoryForAgent(
        userId,
        context?.conversationId,
        context?.sessionId,
        10
      );
      
      // Add current date/time context
      const currentDateTime = context?.currentDateTime || new Date().toISOString();
      const timezone = context?.timezone || 'UTC';
      
      const messages = [
        { 
          role: 'system' as const, 
          content: `🔴 CRITICAL - CURRENT DATE AND TIME: ${currentDateTime} (Timezone: ${timezone})

YOU MUST USE THIS DATE AS YOUR REFERENCE POINT!
- Today is: ${new Date(currentDateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone })}
- When calculating "tomorrow", "next week", "Monday", etc., ALWAYS start from this date
- NEVER use dates from 2023 or any past years - we are in ${new Date(currentDateTime).getFullYear()}
- Double-check all dates you generate are in the correct year: ${new Date(currentDateTime).getFullYear()}`
        },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];
      
      console.log('⚠️  Falling back to direct agent call');
      const taskAgent = getTaskAgent();
      const response = await taskAgent.generate(messages);
      
      const actions: any[] = [];
      (response.toolResults || []).forEach((result: any) => {
        const toolResult = result.payload?.result;
        if (!toolResult || typeof toolResult !== 'object') return;
        
        if (toolResult.task) {
          actions.push({ type: 'task', data: toolResult.task });
        }
        if (toolResult.tasks && Array.isArray(toolResult.tasks)) {
          toolResult.tasks.forEach((task: any) => {
            actions.push({ type: 'task', data: task });
          });
        }
      });
      
      res.json({
        success: true,
        data: {
          response: response.text || 'Request processed',
          message: response.text || 'Request processed',
          actions,
          agent: 'fallback'
        }
      });
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
});

// Task Agent API - Direct access to task management
app.post('/api/agent/task', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, userId, context } = req.body;
    
    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'OpenAI API key required'
      });
      return;
    }

    console.log('🎯 Task Agent processing:', message);
    
    // Fetch conversation history to provide context
    const conversationHistory = await getConversationHistoryForAgent(
      userId,
      context?.conversationId,
      context?.sessionId,
      10 // Last 10 messages
    );
    
    // Add current date/time context
    const currentDateTime = context?.currentDateTime || new Date().toISOString();
    const timezone = context?.timezone || 'UTC';
    
    // Build message array with history + current message
    const messages = [
      { 
        role: 'system' as const, 
        content: `🔴 CRITICAL - CURRENT DATE AND TIME: ${currentDateTime} (Timezone: ${timezone})

YOU MUST USE THIS DATE AS YOUR REFERENCE POINT!
- Today is: ${new Date(currentDateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone })}
- When calculating "tomorrow", "next week", "Monday", etc., ALWAYS start from this date
- NEVER use dates from 2023 or any past years - we are in ${new Date(currentDateTime).getFullYear()}
- Double-check all dates you generate are in the correct year: ${new Date(currentDateTime).getFullYear()}`
      },
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ];
    
    console.log(`📜 Loaded ${conversationHistory.length} previous messages for context`);
    console.log(`📅 Current date/time: ${currentDateTime} (${timezone})`);
    
    const taskAgent = getTaskAgent();
    const response = await taskAgent.generate(messages);

    // Extract tool results/actions and flatten them for the frontend
    const actions: any[] = [];
    
    console.log(`🔍 Extracting from ${response.toolResults?.length || 0} tool results...`);
    
    (response.toolResults || []).forEach((result: any, index: number) => {
      console.log(`\n   === Tool ${index + 1} ===`);
      console.log(`   All keys:`, Object.keys(result));
      
      // Try multiple possible locations for the data
      const possibleDataLocations = [
        { name: 'result.payload.result', data: result.payload?.result },  // Mastra stores it here!
        { name: 'result.result', data: result.result },
        { name: 'result.output', data: result.output },
        { name: 'result.data', data: result.data },
        { name: 'result itself', data: result },
      ];
      
      for (const location of possibleDataLocations) {
        const toolResult = location.data;
        if (!toolResult || typeof toolResult !== 'object') continue;
        
        // Handle single task
        if (toolResult.task) {
          console.log(`   ✅ Found single task at ${location.name}`);
          actions.push({
            type: 'task',
            data: toolResult.task
          });
          break;
        }
        
        // Handle list of tasks
        if (toolResult.tasks && Array.isArray(toolResult.tasks)) {
          console.log(`   ✅ Found ${toolResult.tasks.length} tasks at ${location.name}`);
          toolResult.tasks.forEach((task: any) => {
            actions.push({
              type: 'task',
              data: task
            });
          });
          break;
        }
      }
    });

    res.json({
      success: true,
      data: {
        response: response.text || 'Task processed',
        message: response.text || 'Task processed',
        actions
      }
    });
    
  } catch (error) {
    console.error('❌ Error in task agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Research Agent API - Direct access to web research
app.post('/api/agent/research', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, userId, context } = req.body;
    
    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'OpenAI API key required'
      });
      return;
    }

    console.log('🔍 Research Agent processing:', message);
    
    try {
      // Enrich the query for better results
      const enrichedQuery = await enrichResearchPrompt(message);
      console.log(`📝 Enriched query: "${enrichedQuery.substring(0, 100)}..."`);
      
      // Conduct deep research
      const result = await conductDeepResearch({
        query: enrichedQuery,
        useBackgroundMode: false,
        maxToolCalls: context?.maxToolCalls || 10
      });
      
      // Format response with citations
      let responseText = result.outputText;
      
      if (result.citations.length > 0) {
        responseText += '\n\n**Sources:**\n';
        const uniqueCitations = new Map();
        result.citations.forEach(citation => {
          if (!uniqueCitations.has(citation.url)) {
            uniqueCitations.set(citation.url, citation.title);
          }
        });
        
        Array.from(uniqueCitations.entries()).forEach(([url, title], index) => {
          responseText += `${index + 1}. [${title}](${url})\n`;
        });
      }
      
      console.log(`✅ Research completed with ${result.citations.length} citations`);
      
      // Format actions for frontend
      const actions = [{
        type: 'research',
        data: {
          query: message,
          report: result.outputText,
          citations: result.citations,
          searchCount: result.webSearchCalls.length
        }
      }];

      res.json({
        success: true,
        data: {
          response: responseText,
          message: responseText,
          actions
        }
      });
      
    } catch (researchError) {
      console.error('❌ Research error:', researchError);
      throw researchError;
    }
    
  } catch (error) {
    console.error('❌ Error in research agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Event Agent API - Direct access to event management
app.post('/api/agent/event', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, userId, context } = req.body;
    
    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'OpenAI API key required'
      });
      return;
    }

    console.log('📅 Event Agent processing:', message);
    
    // Fetch conversation history to provide context
    const conversationHistory = await getConversationHistoryForAgent(
      userId,
      context?.conversationId,
      context?.sessionId,
      10 // Last 10 messages
    );
    
    // Add current date/time context
    const currentDateTime = context?.currentDateTime || new Date().toISOString();
    const timezone = context?.timezone || 'UTC';
    
    // Build message array with history + current message
    const messages = [
      { 
        role: 'system' as const, 
        content: `🔴 CRITICAL - CURRENT DATE AND TIME: ${currentDateTime} (Timezone: ${timezone})

YOU MUST USE THIS DATE AS YOUR REFERENCE POINT!
- Today is: ${new Date(currentDateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone })}
- When calculating "tomorrow", "next week", "Monday", etc., ALWAYS start from this date
- NEVER use dates from 2023 or any past years - we are in ${new Date(currentDateTime).getFullYear()}
- Double-check all dates you generate are in the correct year: ${new Date(currentDateTime).getFullYear()}`
      },
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ];
    
    console.log(`📜 Loaded ${conversationHistory.length} previous messages for context`);
    console.log(`📅 Current date/time: ${currentDateTime} (${timezone})`);
    
    const eventAgent = getEventAgent();
    const response = await eventAgent.generate(messages);

    // Extract tool results/actions and flatten them for the frontend
    const actions: any[] = [];
    
    console.log(`🔍 Extracting from ${response.toolResults?.length || 0} tool results...`);
    
    (response.toolResults || []).forEach((result: any, index: number) => {
      console.log(`\n   === Tool ${index + 1} ===`);
      console.log(`   All keys:`, Object.keys(result));
      
      // Try multiple possible locations for the data
      const possibleDataLocations = [
        { name: 'result.payload.result', data: result.payload?.result },  // Mastra stores it here!
        { name: 'result.result', data: result.result },
        { name: 'result.output', data: result.output },
        { name: 'result.data', data: result.data },
        { name: 'result itself', data: result },
      ];
      
      for (const location of possibleDataLocations) {
        const toolResult = location.data;
        if (!toolResult || typeof toolResult !== 'object') continue;
        
        // Handle single event
        if (toolResult.event) {
          console.log(`   ✅ Found single event at ${location.name}`);
          actions.push({
            type: 'event',
            data: toolResult.event
          });
          break;
        }
        
        // Handle list of events
        if (toolResult.events && Array.isArray(toolResult.events)) {
          console.log(`   ✅ Found ${toolResult.events.length} events at ${location.name}`);
          toolResult.events.forEach((event: any) => {
            actions.push({
              type: 'event',
              data: event
            });
          });
          break;
        }
      }
    });

    res.json({
      success: true,
      data: {
        response: response.text || 'Event processed',
        message: response.text || 'Event processed',
        actions
      }
    });
    
  } catch (error) {
    console.error('❌ Error in event agent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// ==================== TASK CRUD ENDPOINTS ====================

// Get all tasks
app.get('/api/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, userId, limit = '50', offset = '0' } = req.query;
    
    let whereClause = 'WHERE user_id = $1';
    const values: any[] = [userId];
    let paramCount = 2;
    
    if (status) {
      whereClause += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }
    
    if (priority) {
      whereClause += ` AND priority = $${paramCount}`;
      values.push(priority);
      paramCount++;
    }
    
    values.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(
      `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
});

// Get a single task
app.get('/api/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

// Create a new task
app.post('/api/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, priority = 'medium', status = 'pending', dueDate, tags = [], userId } = req.body;
    
    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Title is required'
      });
      return;
    }
    
    const result = await query(
      `INSERT INTO tasks (title, description, priority, status, due_date, tags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, priority, status, dueDate ? new Date(dueDate) : null, tags, userId]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

// Update a task
app.put('/api/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = ['title', 'description', 'status', 'priority', 'due_date', 'tags'];
    
    Object.entries(updates).forEach(([key, value]) => {
      const dbKey = key === 'dueDate' ? 'due_date' : key;
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updateFields.push(`${dbKey} = $${paramCount}`);
        if (key === 'dueDate') {
          values.push(value ? new Date(value as string) : null);
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const result = await query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

// Delete a task
app.delete('/api/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

// ==================== EVENT CRUD ENDPOINTS ====================

// Get all events
app.get('/api/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, status, userId, limit = '50', offset = '0', upcoming } = req.query;
    
    let whereClause = 'WHERE user_id = $1';
    const values: any[] = [userId];
    let paramCount = 2;
    
    if (type) {
      whereClause += ` AND type = $${paramCount}`;
      values.push(type);
      paramCount++;
    }
    
    if (status) {
      whereClause += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }
    
    if (upcoming === 'true') {
      whereClause += ` AND start_date >= NOW()`;
    }
    
    values.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(
      `SELECT * FROM events ${whereClause} ORDER BY start_date ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// Get a single event
app.get('/api/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query('SELECT * FROM events WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Event not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

// Create a new event
app.post('/api/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      location, 
      type = 'other', 
      status = 'scheduled', 
      attendees = [], 
      userId 
    } = req.body;
    
    if (!title || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Title, startDate, and endDate are required'
      });
      return;
    }
    
    const result = await query(
      `INSERT INTO events (title, description, start_date, end_date, location, type, status, attendees, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, new Date(startDate), new Date(endDate), location, type, status, attendees, userId]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Update an event
app.put('/api/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = ['title', 'description', 'start_date', 'end_date', 'location', 'type', 'status', 'attendees'];
    
    Object.entries(updates).forEach(([key, value]) => {
      const dbKey = key === 'startDate' ? 'start_date' : key === 'endDate' ? 'end_date' : key;
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updateFields.push(`${dbKey} = $${paramCount}`);
        if (key === 'startDate' || key === 'endDate') {
          values.push(new Date(value as string));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const result = await query(
      `UPDATE events SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Event not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// Delete an event
app.delete('/api/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Event not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Daily Summary API
app.get('/api/summary/daily', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    
    // Get task statistics
    const taskStats = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
       FROM tasks WHERE user_id = $1`,
      [userId]
    );
    
    // Get event statistics
    const eventStats = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE start_date >= NOW() AND status = 'scheduled') as upcoming,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM events WHERE user_id = $1`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        tasks: {
          total: parseInt(taskStats.rows[0].total),
          completed: parseInt(taskStats.rows[0].completed),
          pending: parseInt(taskStats.rows[0].pending),
          inProgress: parseInt(taskStats.rows[0].in_progress)
        },
        events: {
          total: parseInt(eventStats.rows[0].total),
          upcoming: parseInt(eventStats.rows[0].upcoming),
          completed: parseInt(eventStats.rows[0].completed)
        },
        message: 'Daily summary'
      }
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        tasks: { total: 0, completed: 0, pending: 0, inProgress: 0 },
        events: { total: 0, upcoming: 0, completed: 0 },
        message: 'Daily summary (error fetching data)'
      }
    });
  }
});

// Search endpoint
app.post('/api/search', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: []
  });
});

// Conversation history endpoints
app.get('/api/conversation/history', async (req: Request, res: Response) => {
  try {
    const { userId, conversationId, sessionId, limit = '50' } = req.query;
    
    console.log('📜 Fetching conversation history:', { userId, conversationId, sessionId, limit });
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }
    
    // Build query conditions
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;
    
    if (conversationId) {
      whereConditions.push(`conversation_id = $${paramIndex}`);
      queryParams.push(conversationId);
      paramIndex++;
    }
    
    if (sessionId) {
      whereConditions.push(`session_id = $${paramIndex}`);
      queryParams.push(sessionId);
      paramIndex++;
    }
    
    // Add limit
    queryParams.push(parseInt(limit as string));
    
    const queryText = `
      SELECT id, role, content, actions, created_at
      FROM conversation_history 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    
    const result = await query(queryText, queryParams);
    
    // Transform to frontend format
    const messages = result.rows.map((row: any) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.created_at,
      actions: row.actions || []
    })).reverse(); // Reverse to get chronological order
    
    res.json({
      success: true,
      data: messages
    });
    
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation history'
    });
  }
});

app.post('/api/conversation/message', async (req: Request, res: Response) => {
  try {
    const { userId, conversationId, sessionId, role, content, context } = req.body;
    
    console.log('💬 Storing conversation message:', { userId, conversationId, sessionId, role });
    
    if (!userId || !role || !content) {
      res.status(400).json({
        success: false,
        error: 'userId, role, and content are required'
      });
      return;
    }
    
    const result = await query(
      `INSERT INTO conversation_history (user_id, conversation_id, session_id, role, content, actions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [userId, conversationId, sessionId, role, content, JSON.stringify(context?.actions || [])]
    );
    
    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        timestamp: result.rows[0].created_at
      }
    });
    
  } catch (error) {
    console.error('Error storing conversation message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store conversation message'
    });
  }
});

app.delete('/api/conversation/history', async (req: Request, res: Response) => {
  try {
    const { userId, conversationId, sessionId } = req.query;
    
    console.log('🗑️  Clearing conversation history:', { userId, conversationId, sessionId });
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }
    
    // Build query conditions
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;
    
    if (conversationId) {
      whereConditions.push(`conversation_id = $${paramIndex}`);
      queryParams.push(conversationId);
      paramIndex++;
    }
    
    if (sessionId) {
      whereConditions.push(`session_id = $${paramIndex}`);
      queryParams.push(sessionId);
      paramIndex++;
    }
    
    const result = await query(
      `DELETE FROM conversation_history WHERE ${whereConditions.join(' AND ')}`,
      queryParams
    );
    
    res.json({
      success: true,
      message: 'Conversation history cleared',
      deletedCount: result.rowCount
    });
    
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear conversation history'
    });
  }
});

// Memory endpoints - using Mem0 integration
app.get('/api/memory/:userId/all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required'
      });
      return;
    }

    console.log(`🧠 Fetching all memories for user: ${userId}`);
    
    const memories = await getAllMemories(userId);
    
    res.json({
      success: true,
      data: {
        memories: memories.map((m: any) => ({
          id: m.id || m.memory_id || Math.random().toString(),
          memory: m.memory || m.content || '',
          metadata: m.metadata || {},
          created_at: m.created_at || m.timestamp || new Date().toISOString()
        })),
        count: memories.length
      }
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memories'
    });
  }
});

app.delete('/api/memory/:userId/:memoryId', async (req: Request, res: Response) => {
  try {
    const { userId, memoryId } = req.params;
    
    if (!userId || !memoryId) {
      res.status(400).json({
        success: false,
        error: 'userId and memoryId are required'
      });
      return;
    }

    console.log(`🗑️  Deleting memory ${memoryId} for user: ${userId}`);
    
    await deleteMemory(memoryId, userId);
    
    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory'
    });
  }
});

// Legacy memory endpoints (for backward compatibility)
app.get('/api/memory/:userId', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: []
  });
});

app.delete('/api/memory/:userId', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Memory cleared'
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Initialize and start
const startServer = async () => {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  WARNING: OpenAI API key not configured!');
      console.warn('   Set OPENAI_API_KEY in your .env file');
      console.warn('   Get one at: https://platform.openai.com/api-keys');
      console.warn('   The AI agents will not work without it.');
    } else {
      console.log('🤖 Mastra AI Agents: ENABLED');
      console.log('   - Task Agent: Ready');
      console.log('   - Event Agent: Ready');
      console.log('   - Research Agent: Ready (Deep Research)');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Task Track Bot Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🤖 General Agent: POST http://localhost:${PORT}/api/agent/general`);
      console.log(`🎯 Task Agent: POST http://localhost:${PORT}/api/agent/task`);
      console.log(`📅 Event Agent: POST http://localhost:${PORT}/api/agent/event`);
      console.log(`🔍 Research Agent: POST http://localhost:${PORT}/api/agent/research`);
      console.log(`✅ Server ready with Mastra AI agents + Deep Research!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});
