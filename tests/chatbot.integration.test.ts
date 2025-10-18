import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Comprehensive Chatbot Integration Test Suite
 * 
 * This test suite evaluates the overall chatbot functionality by:
 * 1. Testing various user intents (task creation, event scheduling, queries)
 * 2. Evaluating AI response quality and relevance
 * 3. Verifying action generation accuracy
 * 4. Measuring response time and reliability
 */

const API_BASE_URL = 'http://localhost:3001';

interface AgentResponse {
  message: string;
  actions?: Array<{
    type: string;
    data: any;
  }>;
}

interface TestScenario {
  name: string;
  category: 'task' | 'event' | 'query' | 'mixed';
  endpoint: string;
  message: string;
  expectedKeywords: string[];
  expectedActionTypes?: string[];
  minScore?: number;
}

interface TestResult {
  scenario: string;
  success: boolean;
  response?: AgentResponse;
  score: number;
  feedback: string[];
  responseTime: number;
  error?: string;
}

// Test scenarios covering different chatbot capabilities
const testScenarios: TestScenario[] = [
  {
    name: 'Simple Task Creation',
    category: 'task',
    endpoint: '/api/agent/task',
    message: 'Create a task to review the marketing report by Friday',
    expectedKeywords: ['task', 'review', 'marketing', 'report'],
    expectedActionTypes: ['create_task', 'task_create'],
    minScore: 7,
  },
  {
    name: 'Task with Priority',
    category: 'task',
    endpoint: '/api/agent/task',
    message: 'Add a high priority task to finish the quarterly presentation today',
    expectedKeywords: ['task', 'priority', 'presentation', 'quarterly'],
    expectedActionTypes: ['create_task', 'task_create'],
    minScore: 7,
  },
  {
    name: 'Event Scheduling',
    category: 'event',
    endpoint: '/api/agent/event',
    message: 'Schedule a team meeting tomorrow at 2 PM to discuss the new product launch',
    expectedKeywords: ['meeting', 'schedule', 'team', 'product'],
    expectedActionTypes: ['create_event', 'event_create'],
    minScore: 7,
  },
  {
    name: 'Event with Location',
    category: 'event',
    endpoint: '/api/agent/event',
    message: 'Book a conference room for Friday at 10 AM for the client presentation',
    expectedKeywords: ['conference', 'room', 'client', 'presentation'],
    expectedActionTypes: ['create_event', 'event_create'],
    minScore: 6,
  },
  {
    name: 'General Task Query',
    category: 'query',
    endpoint: '/api/agent/general',
    message: 'What tasks do I have pending?',
    expectedKeywords: ['task', 'pending'],
    minScore: 5,
  },
  {
    name: 'General Event Query',
    category: 'query',
    endpoint: '/api/agent/general',
    message: 'Show me my schedule for this week',
    expectedKeywords: ['schedule', 'week'],
    minScore: 5,
  },
  {
    name: 'Mixed Intent - Task and Event',
    category: 'mixed',
    endpoint: '/api/agent/general',
    message: 'Create a task for the marketing campaign and schedule a meeting with the team tomorrow',
    expectedKeywords: ['task', 'marketing', 'meeting', 'team'],
    expectedActionTypes: ['create_task', 'create_event', 'task_create', 'event_create'],
    minScore: 7,
  },
  {
    name: 'Complex Task with Details',
    category: 'task',
    endpoint: '/api/agent/general',
    message: 'I need to complete the Q4 financial report by next Monday, make it urgent priority and tag it as finance',
    expectedKeywords: ['task', 'report', 'urgent', 'priority', 'finance'],
    expectedActionTypes: ['create_task', 'task_create'],
    minScore: 8,
  },
  {
    name: 'Natural Language Understanding',
    category: 'task',
    endpoint: '/api/agent/general',
    message: "Don't forget to call Sarah about the contract renewal",
    expectedKeywords: ['task', 'call', 'sarah', 'contract'],
    minScore: 6,
  },
  {
    name: 'Help Request',
    category: 'query',
    endpoint: '/api/agent/general',
    message: 'Help me organize my tasks for the week',
    expectedKeywords: ['help', 'organize', 'task'],
    minScore: 5,
  },
];

// Helper function to make API requests
async function makeRequest(endpoint: string, message: string, userId: string = 'test-user'): Promise<{ 
  response: any; 
  responseTime: number 
}> {
  const startTime = Date.now();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      userId,
      context: {
        sessionId: 'test-session',
        conversationId: 'test-conversation',
      },
    }),
  });

  const responseTime = Date.now() - startTime;
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return { response: data, responseTime };
}

// AI Response Evaluation Function
function evaluateResponse(response: AgentResponse, scenario: TestScenario): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];
  const maxScore = 10;

  const messageLower = response.message.toLowerCase();
  const scenarioLower = scenario.message.toLowerCase();

  // 1. Response Existence and Length (1 point)
  if (response.message && response.message.length > 20) {
    score += 1;
    feedback.push('✓ Response has meaningful content');
  } else {
    feedback.push('✗ Response is too short or empty');
  }

  // 2. Keyword Relevance (3 points)
  const relevantKeywords = scenario.expectedKeywords.filter(keyword => 
    messageLower.includes(keyword.toLowerCase())
  );
  
  const keywordScore = Math.min(3, (relevantKeywords.length / scenario.expectedKeywords.length) * 3);
  score += keywordScore;
  
  if (keywordScore >= 2) {
    feedback.push(`✓ Good keyword relevance (${relevantKeywords.length}/${scenario.expectedKeywords.length})`);
  } else {
    feedback.push(`✗ Low keyword relevance (${relevantKeywords.length}/${scenario.expectedKeywords.length})`);
  }

  // 3. Action Generation (3 points)
  if (scenario.expectedActionTypes && scenario.expectedActionTypes.length > 0) {
    if (response.actions && response.actions.length > 0) {
      score += 1;
      feedback.push(`✓ Generated ${response.actions.length} action(s)`);

      // Check if action types match expectations
      const hasCorrectActionType = response.actions.some(action => 
        scenario.expectedActionTypes!.some(expectedType => 
          action.type.toLowerCase().includes(expectedType.toLowerCase()) ||
          expectedType.toLowerCase().includes(action.type.toLowerCase())
        )
      );

      if (hasCorrectActionType) {
        score += 2;
        feedback.push('✓ Actions match expected types');
      } else {
        feedback.push(`✗ Action types don't match (got: ${response.actions.map(a => a.type).join(', ')})`);
      }
    } else {
      feedback.push('✗ No actions generated when expected');
    }
  }

  // 4. Response Helpfulness (2 points)
  const helpfulIndicators = [
    'created', 'scheduled', 'added', 'updated', 'here', 'show', 'found',
    "i've", "i'll", 'will', 'can', 'help'
  ];
  
  const hasHelpfulLanguage = helpfulIndicators.some(indicator => 
    messageLower.includes(indicator)
  );
  
  if (hasHelpfulLanguage) {
    score += 2;
    feedback.push('✓ Response uses helpful language');
  } else {
    feedback.push('✗ Response lacks helpful language');
  }

  // 5. No Error Messages (1 point)
  const errorIndicators = ['error', 'failed', 'unable', 'cannot', 'sorry'];
  const hasError = errorIndicators.some(indicator => messageLower.includes(indicator));
  
  if (!hasError) {
    score += 1;
    feedback.push('✓ No error indicators in response');
  } else {
    feedback.push('✗ Response contains error indicators');
  }

  return {
    score: Math.min(score, maxScore),
    feedback,
  };
}

// Main test suite
describe('Chatbot Integration Tests', () => {
  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      if (!response.ok || data.status !== 'healthy') {
        throw new Error('Server is not healthy');
      }
    } catch (error) {
      console.error('\n❌ Server is not running!');
      console.error('Please start the server first:');
      console.error('  cd server && npm start\n');
      throw error;
    }
  });

  // Group tests by category
  const categories = ['task', 'event', 'query', 'mixed'] as const;
  
  categories.forEach(category => {
    const categoryScenarios = testScenarios.filter(s => s.category === category);
    
    if (categoryScenarios.length === 0) return;

    describe(`${category.toUpperCase()} Tests`, () => {
      categoryScenarios.forEach(scenario => {
        it(scenario.name, async () => {
          const { response, responseTime } = await makeRequest(
            scenario.endpoint,
            scenario.message
          );

          // Verify response structure
          expect(response).toBeDefined();
          expect(response.success).toBe(true);
          expect(response.data).toBeDefined();
          expect(response.data.message).toBeDefined();

          const aiResponse: AgentResponse = response.data;

          // Evaluate response quality
          const evaluation = evaluateResponse(aiResponse, scenario);

          // Log detailed results
          console.log(`\n📊 ${scenario.name}`);
          console.log(`   Score: ${evaluation.score}/10`);
          console.log(`   Time: ${responseTime}ms`);
          evaluation.feedback.forEach(f => console.log(`   ${f}`));

          // Assert minimum quality score
          const minScore = scenario.minScore || 5;
          expect(evaluation.score).toBeGreaterThanOrEqual(
            minScore,
            `Response quality below minimum (${evaluation.score}/10 < ${minScore}/10)\n` +
            `Feedback:\n${evaluation.feedback.join('\n')}`
          );

          // Performance check (responses should be under 30 seconds)
          expect(responseTime).toBeLessThan(30000);
        }, 35000); // 35 second timeout per test
      });
    });
  });

  // Summary test that runs all scenarios and provides overall statistics
  describe('Overall Performance', () => {
    it('should maintain high average quality across all scenarios', async () => {
      const results: TestResult[] = [];

      for (const scenario of testScenarios) {
        try {
          const { response, responseTime } = await makeRequest(
            scenario.endpoint,
            scenario.message
          );

          if (response.success && response.data) {
            const evaluation = evaluateResponse(response.data, scenario);
            
            results.push({
              scenario: scenario.name,
              success: true,
              response: response.data,
              score: evaluation.score,
              feedback: evaluation.feedback,
              responseTime,
            });
          } else {
            results.push({
              scenario: scenario.name,
              success: false,
              score: 0,
              feedback: ['Failed to get valid response'],
              responseTime,
              error: response.error,
            });
          }
        } catch (error) {
          results.push({
            scenario: scenario.name,
            success: false,
            score: 0,
            feedback: ['Request failed'],
            responseTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Calculate statistics
      const successfulTests = results.filter(r => r.success);
      const successRate = (successfulTests.length / results.length) * 100;
      const avgScore = successfulTests.length > 0
        ? successfulTests.reduce((sum, r) => sum + r.score, 0) / successfulTests.length
        : 0;
      const avgResponseTime = successfulTests.length > 0
        ? successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length
        : 0;

      // Print detailed summary
      console.log('\n' + '='.repeat(60));
      console.log('📈 CHATBOT INTEGRATION TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`\n✅ Success Rate: ${successRate.toFixed(1)}% (${successfulTests.length}/${results.length})`);
      console.log(`📊 Average Quality Score: ${avgScore.toFixed(1)}/10`);
      console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
      
      // Score distribution
      const scoreRanges = {
        excellent: results.filter(r => r.score >= 8).length,
        good: results.filter(r => r.score >= 6 && r.score < 8).length,
        fair: results.filter(r => r.score >= 4 && r.score < 6).length,
        poor: results.filter(r => r.score < 4).length,
      };
      
      console.log('\n📊 Score Distribution:');
      console.log(`   Excellent (8-10): ${scoreRanges.excellent}`);
      console.log(`   Good (6-7):       ${scoreRanges.good}`);
      console.log(`   Fair (4-5):       ${scoreRanges.fair}`);
      console.log(`   Poor (0-3):       ${scoreRanges.poor}`);

      // Failed tests
      const failedTests = results.filter(r => !r.success);
      if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(t => {
          console.log(`   - ${t.scenario}: ${t.error}`);
        });
      }

      // Low scoring tests
      const lowScoringTests = results.filter(r => r.success && r.score < 6);
      if (lowScoringTests.length > 0) {
        console.log('\n⚠️  Low Scoring Tests:');
        lowScoringTests.forEach(t => {
          console.log(`   - ${t.scenario}: ${t.score}/10`);
          t.feedback.forEach(f => console.log(`     ${f}`));
        });
      }

      console.log('\n' + '='.repeat(60) + '\n');

      // Assertions for overall quality
      expect(successRate).toBeGreaterThanOrEqual(80, 'Success rate should be at least 80%');
      expect(avgScore).toBeGreaterThanOrEqual(6, 'Average quality score should be at least 6/10');
      expect(avgResponseTime).toBeLessThan(10000, 'Average response time should be under 10 seconds');
    }, 120000); // 2 minute timeout for all scenarios
  });
});

