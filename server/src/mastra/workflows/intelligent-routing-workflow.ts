/**
 * Intelligent Routing Workflow
 * 
 * Uses LLM to intelligently route user requests to the appropriate agent
 * with proper context and parameter extraction.
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { llm } from '../llm';
import { taskAgent } from '../agents/task-agent';
import { eventAgent, getEventAgent } from '../agents/event-agent';
import { researchAgent } from '../agents/research-agent';
import { answerAgent } from '../agents/answer-agent';

// Router agent that decides which agent to use
const routerAgent = new Agent({
  name: 'Router',
  instructions: `You are a routing assistant that analyzes user messages and determines the best agent to handle them.
  
You MUST return one of these values for agentType:
- "answer" - for general knowledge questions, definitions, explanations (no web search needed)
- "task" - for task management (creating, updating, listing, deleting tasks, todos)
- "event" - for calendar/scheduling (meetings, appointments, calendar events)
- "research" - for web research, analysis, current information gathering, market research
- "both" - when the message involves both tasks AND events

**CRITICAL ROUTING RULES**:

1. **Route to "answer" for:**
   - What is / What does / Define
   - Explain / How does / How to
   - Tell me about / Describe
   - General knowledge questions that don't need current web data
   - Examples: "What is AI?", "Explain REST APIs", "How to learn Python?"

2. **Route to "research" ONLY when:**
   - They explicitly ask to search the web / research / find information
   - They want current/trending information
   - They ask "latest", "current", "recent", "trending"
   - They need data-backed analysis with citations
   - Examples: "Search for latest AI trends", "Research competitors", "What's trending?"

3. **Route to "task" for:**
   - Creating, updating, listing, deleting tasks
   - Todo management
   - Marking things complete/done
   - General queries about user's work
   
4. **Route to "event" for:**
   - Scheduling meetings/appointments
   - Calendar operations
   - Setting reminders
   
5. **Route to "both" ONLY when:**
   - Message explicitly mentions BOTH tasks AND calendar/scheduling

**Examples:**
- "What is machine learning?" → answer (not research!)
- "Explain REST APIs" → answer (not research!)
- "Search the web for latest AI trends" → research
- "Tell me about React" → answer
- "Create a task" → task
- "Schedule a meeting" → event
- "What's on my plate?" → task`,
  model: llm,
});

// Step 1: Analyze and route the request
const analyzeRequest = createStep({
  id: 'analyzeRequest',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })).default([]),
    userId: z.string(),
  }),
  outputSchema: z.object({
    agentType: z.string(),
    confidence: z.number(),
    message: z.string(),
    conversationHistory: z.array(z.any()),
    userId: z.string(),
  }),
  execute: async ({ inputData }) => {
    const prompt = `Analyze this user message and determine if it's about tasks, events, research, general knowledge, or both:
"${inputData.message}"

Consider the conversation history to understand context.

IMPORTANT DISTINCTION:
- "What is X?" or "Explain Y?" = answer (general knowledge, no web search)
- "Search for X" or "Research latest X" = research (needs web search)

Return a JSON object with:
- agentType: "answer" (general knowledge), "task" (task management), "event" (calendar/scheduling), "research" (web search/analysis), or "both" (tasks+events)
- confidence: a number between 0 and 1
- reasoning: explanation of why this routing was chosen`;

    const routingSchema = z.object({
      agentType: z.enum(['answer', 'task', 'event', 'research', 'both']),
      confidence: z.number(),
      reasoning: z.string()
    });

    const response = await routerAgent.generate(prompt, {
      output: routingSchema
    });

    // Use the routing decision from the agent
    const agentType = response.object?.agentType || 'answer';

    console.log(`🎯 Routing decision: ${agentType} (confidence: ${response.object?.confidence || 0})`);
    console.log(`   Reasoning: ${response.object?.reasoning || 'No reasoning provided'}`);

    return {
      agentType: agentType,
      confidence: response.object.confidence,
      message: inputData.message,
      conversationHistory: inputData.conversationHistory,
      userId: inputData.userId,
    };
  },
});

// Step 2a: Handle with Task Agent
const handleWithTaskAgent = createStep({
  id: 'handleWithTaskAgent',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.any()),
    userId: z.string(),
    agentType: z.string(),
    confidence: z.number(),
  }),
  outputSchema: z.object({
    response: z.string(),
    actions: z.array(z.any()),
    agent: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Add userId to the conversation context as a system message
    const userIdMessage = {
      role: 'system' as const,
      content: `User ID: ${inputData.userId}`
    };

    const messages = [
      userIdMessage,
      ...inputData.conversationHistory,
      { role: 'user' as const, content: inputData.message }
    ];

    const response = await taskAgent.generate(messages);

    // Extract actions from tool results (using the same logic as server.ts)
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

    return {
      response: response.text || 'Task processed',
      actions,
      agent: 'task'
    };
  },
});

// Step 2b: Handle with Event Agent
const handleWithEventAgent = createStep({
  id: 'handleWithEventAgent',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.any()),
    userId: z.string(),
    agentType: z.string(),
    confidence: z.number(),
  }),
  outputSchema: z.object({
    response: z.string(),
    actions: z.array(z.any()),
    agent: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Add userId to the conversation context as a system message
    const userIdMessage = {
      role: 'system' as const,
      content: `User ID: ${inputData.userId}`
    };

    const messages = [
      userIdMessage,
      ...inputData.conversationHistory,
      { role: 'user' as const, content: inputData.message }
    ];

    const response = await eventAgent.generate(messages);

    // Extract actions from tool results
    const actions: any[] = [];

    (response.toolResults || []).forEach((result: any) => {
      const toolResult = result.payload?.result;
      if (!toolResult || typeof toolResult !== 'object') return;

      if (toolResult.event) {
        actions.push({ type: 'event', data: toolResult.event });
      }

      if (toolResult.events && Array.isArray(toolResult.events)) {
        toolResult.events.forEach((event: any) => {
          actions.push({ type: 'event', data: event });
        });
      }
    });

    return {
      response: response.text || 'Event processed',
      actions,
      agent: 'event'
    };
  },
});

// Step 2c: Handle with Research Agent
const handleWithResearchAgent = createStep({
  id: 'handleWithResearchAgent',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.any()),
    userId: z.string(),
    agentType: z.string(),
    confidence: z.number(),
  }),
  outputSchema: z.object({
    response: z.string(),
    actions: z.array(z.any()),
    agent: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log('🔍 Calling ResearchAgent with tools...');
    
    try {
      // Add userId to the conversation context as a system message
      const userIdMessage = {
        role: 'system' as const,
        content: `User ID: ${inputData.userId}`
      };

      const messages = [
        userIdMessage,
        ...inputData.conversationHistory,
        { role: 'user' as const, content: inputData.message }
      ];

      // Use the research agent with its tools
      const response = await researchAgent.generate(messages);

      // Extract research results from tool calls
      const actions: any[] = [];
      let hasResearchResults = false;

      (response.toolResults || []).forEach((result: any) => {
        const toolResult = result.payload?.result;
        if (!toolResult || typeof toolResult !== 'object') return;

        // Check if this is a research tool result
        if (toolResult.report || toolResult.answer) {
          hasResearchResults = true;
          actions.push({ 
            type: 'research', 
            data: {
              query: inputData.message,
              report: toolResult.report || toolResult.answer,
              citations: toolResult.citations || [],
              searchCount: toolResult.searchCount || 0
            }
          });
        }
      });

      console.log(`✅ Research agent completed. Tool results: ${hasResearchResults ? 'Yes' : 'No'}`);
      
      return {
        response: response.text || 'Research completed',
        actions,
        agent: 'research'
      };
      
    } catch (error) {
      console.error('❌ Research agent error:', error);
      return {
        response: `I encountered an error while researching: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        actions: [],
        agent: 'research'
      };
    }
  },
});

// Step 2c: Handle with Answer Agent
const handleWithAnswerAgent = createStep({
  id: 'handleWithAnswerAgent',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.any()),
    userId: z.string(),
    agentType: z.string(),
    confidence: z.number(),
  }),
  outputSchema: z.object({
    response: z.string(),
    actions: z.array(z.any()),
    agent: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log('💡 Calling AnswerAgent for general knowledge question...');
    
    const userIdMessage = {
      role: 'system' as const,
      content: `User ID: ${inputData.userId}`
    };

    const messages = [
      userIdMessage,
      ...inputData.conversationHistory,
      { role: 'user' as const, content: inputData.message }
    ];

    const response = await answerAgent.generate(messages);

    return {
      response: response.text || 'Answer provided',
      actions: [],
      agent: 'answer'
    };
  },
});

// Step 2d: Handle with both agents
const handleWithBothAgents = createStep({
  id: 'handleWithBothAgents',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.any()),
    userId: z.string(),
    agentType: z.string(),
    confidence: z.number(),
  }),
  outputSchema: z.object({
    response: z.string(),
    actions: z.array(z.any()),
    agent: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Add userId to the conversation context as a system message
    const userIdMessage = {
      role: 'system' as const,
      content: `User ID: ${inputData.userId}`
    };

    // Call both agents and combine their results
    const messages = [
      userIdMessage,
      ...inputData.conversationHistory,
      { role: 'user' as const, content: inputData.message }
    ];

    // Execute both agents in parallel
    const [taskResponse, eventResponse] = await Promise.all([
      taskAgent.generate(messages),
      eventAgent.generate(messages)
    ]);

    const actions: any[] = [];

    // Extract task actions
    (taskResponse.toolResults || []).forEach((result: any) => {
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

    // Extract event actions
    (eventResponse.toolResults || []).forEach((result: any) => {
      const toolResult = result.payload?.result;
      if (!toolResult || typeof toolResult !== 'object') return;

      if (toolResult.event) {
        actions.push({ type: 'event', data: toolResult.event });
      }

      if (toolResult.events && Array.isArray(toolResult.events)) {
        toolResult.events.forEach((event: any) => {
          actions.push({ type: 'event', data: event });
        });
      }
    });

    // Combine responses intelligently
    const taskText = taskResponse.text || '';
    const eventText = eventResponse.text || '';
    
    let combinedResponse = '';
    if (taskText && eventText) {
      // Both agents returned responses - combine them
      combinedResponse = `${taskText}\n\n${eventText}`;
    } else {
      // One or both returned nothing - use whichever has content
      combinedResponse = taskText || eventText || 'Request processed';
    }

    return {
      response: combinedResponse,
      actions,
      agent: 'both'
    };
  },
});

// Create the workflow with branching
export const intelligentRoutingWorkflow = createWorkflow({
  id: 'intelligent-routing',
  inputSchema: z.object({
    message: z.string(),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })).default([]),
    userId: z.string(),
  }),
  outputSchema: z.object({
    response: z.string(),
    actions: z.array(z.any()),
    agent: z.string(),
  }),
})
  .then(analyzeRequest)
  // @ts-ignore - Type mismatch between workflow step schemas
  .branch([
    [
      async ({ inputData }) => inputData.agentType === 'task',
      handleWithTaskAgent
    ],
    [
      async ({ inputData }) => inputData.agentType === 'event',
      handleWithEventAgent
    ],
    [
      async ({ inputData }) => inputData.agentType === 'research',
      handleWithResearchAgent
    ],
    [
      async ({ inputData }) => inputData.agentType === 'answer',
      handleWithAnswerAgent
    ],
    [
      async ({ inputData }) => inputData.agentType === 'both',
      handleWithBothAgents
    ],
  ])
  .commit();

