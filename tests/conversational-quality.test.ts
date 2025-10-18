import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Natural Conversation Quality Test
 * 
 * Tests the chatbot's ability to handle real-world, natural conversations
 * like a perfect personal assistant would.
 * 
 * Evaluation criteria:
 * - Natural, conversational tone
 * - Proactive suggestions
 * - Context understanding
 * - Smart defaults and inference
 * - Helpful, not robotic
 */

const API_BASE_URL = 'http://localhost:3001';

interface ConversationalScenario {
  name: string;
  userMessage: string;
  evaluationCriteria: {
    shouldCreateAction: boolean;
    expectedActionType?: string;
    shouldBeConversational: boolean; // Not robotic, friendly tone
    shouldBeProactive: boolean; // Offers suggestions or next steps
    shouldInferContext: boolean; // Understands implied information
    shouldBeSmart: boolean; // Makes intelligent assumptions
  };
  context?: string; // What makes this scenario realistic
}

const conversationalScenarios: ConversationalScenario[] = [
  {
    name: 'Casual Task Creation - Natural Language',
    userMessage: "I need to call Sarah about the contract renewal tomorrow",
    context: "User speaks naturally, doesn't say 'create task' or give explicit commands",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Event Scheduling - Implied Information',
    userMessage: "Coffee with Mike next Tuesday at 10",
    context: "Brief, casual message with implied event scheduling",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_event',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Urgent Task - Priority Inference',
    userMessage: "ASAP - need to send the proposal to the client before EOD",
    context: "User indicates urgency without saying 'urgent' or 'high priority' explicitly",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Help Request - Conversational Assistant',
    userMessage: "Hey, I'm feeling overwhelmed with everything I need to do this week",
    context: "User seeks help/advice, not a specific task/event creation",
    evaluationCriteria: {
      shouldCreateAction: false,
      expectedActionType: undefined,
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Natural Reminder - Casual Phrasing',
    userMessage: "Don't let me forget the team presentation on Friday",
    context: "Natural way people ask for reminders, not formal task creation",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Complex Task with Multiple Details',
    userMessage: "I need to finish the quarterly financial report by next Monday, this is really important",
    context: "Task with multiple parameters: deadline, priority indication",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Meeting Scheduling with Time',
    userMessage: "Schedule team standup for tomorrow morning at 9:30",
    context: "Explicit scheduling with specific time",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_event',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Quick Task - Minimal Info',
    userMessage: "Buy groceries",
    context: "Very brief task, tests handling of minimal information",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Task with "This Week" Timeframe',
    userMessage: "I have to submit the expense report this week",
    context: "Vague timeframe that needs interpretation",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Appointment Scheduling',
    userMessage: "Doctor appointment next Wednesday at 3pm",
    context: "Different type of event - appointment vs meeting",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_event',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Task with Implicit High Priority',
    userMessage: "I really need to prepare for the board presentation, it's in 2 days",
    context: "Urgency implied by 'really need' and short timeframe",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Multiple Items in One Message',
    userMessage: "Tomorrow I need to call the vendor and also schedule a meeting with John",
    context: "User mentions both task and event in single message",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task', // Should create at least one action
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Low Priority Casual Task',
    userMessage: "Sometime this month I should clean out my email inbox",
    context: "'Sometime' indicates low priority, flexible timing",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Task with "Tonight" Timeframe',
    userMessage: "Finish the slides tonight",
    context: "Time-specific natural language",
    evaluationCriteria: {
      shouldCreateAction: true,
      expectedActionType: 'create_task',
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
  {
    name: 'Query About Capabilities',
    userMessage: "What can you help me with?",
    context: "User asking about bot capabilities",
    evaluationCriteria: {
      shouldCreateAction: false,
      expectedActionType: undefined,
      shouldBeConversational: true,
      shouldBeProactive: true,
      shouldInferContext: true,
      shouldBeSmart: true,
    }
  },
];

/**
 * Evaluate conversational quality of response
 */
function evaluateConversationalQuality(
  response: string,
  scenario: ConversationalScenario
): {
  score: number;
  feedback: string[];
  passes: boolean;
} {
  let score = 0;
  const feedback: string[] = [];
  const maxScore = 10;

  // 1. Conversational Tone (2 points)
  const roboticPhrases = [
    'i understand you want',
    'the task has been created',
    'successfully',
    'what else can i help',
    'please provide more details',
  ];
  const conversationalPhrases = [
    "i've", "i'll", "you're", "let me", "got it", "perfect",
    "sounds good", "great", "awesome", "want me to", "should i",
    "!", "?", "😊", "👍", "🎯"
  ];

  const lowerResponse = response.toLowerCase();
  const hasRoboticTone = roboticPhrases.some(phrase => lowerResponse.includes(phrase));
  const hasConversationalTone = conversationalPhrases.some(phrase => lowerResponse.includes(phrase));

  if (scenario.evaluationCriteria.shouldBeConversational) {
    if (!hasRoboticTone && hasConversationalTone) {
      score += 2;
      feedback.push('✓ Natural, conversational tone (not robotic)');
    } else if (hasRoboticTone) {
      feedback.push('✗ Response feels robotic and mechanical');
    } else {
      score += 1;
      feedback.push('⚠ Tone is acceptable but could be more conversational');
    }
  } else {
    score += 2; // Not evaluated for this scenario
  }

  // 2. Proactive Suggestions (2 points)
  const proactivePhrases = [
    'should i', 'want me to', 'would you like', 'need me to',
    'can help', "let me know", 'shall i', 'how about', 'want to',
    'need any', 'need some', 'want any', 'want some', 'help you',
    'if you need', 'let me', 'i can', 'should we'
  ];
  const hasProactiveSuggestion = proactivePhrases.some(phrase => 
    lowerResponse.includes(phrase)
  );

  if (scenario.evaluationCriteria.shouldBeProactive) {
    if (hasProactiveSuggestion) {
      score += 2;
      feedback.push('✓ Offers proactive suggestions and next steps');
    } else {
      feedback.push('✗ No proactive suggestions or follow-up questions');
    }
  } else {
    score += 2; // Not evaluated for this scenario
  }

  // 3. Context Understanding (2 points)
  // Check if response shows understanding of implied information
  const contextKeywords = scenario.userMessage.toLowerCase().split(' ')
    .filter(word => word.length > 4);
  const mentionsContext = contextKeywords.some(keyword => 
    lowerResponse.includes(keyword)
  );

  if (scenario.evaluationCriteria.shouldInferContext) {
    if (mentionsContext && response.length > 50) {
      score += 2;
      feedback.push('✓ Demonstrates context understanding');
    } else {
      score += 1;
      feedback.push('⚠ Limited context awareness in response');
    }
  } else {
    score += 2; // Not evaluated
  }

  // 4. Smart Behavior (2 points)
  const smartIndicators = [
    'priority', 'urgent', 'important', 'tomorrow', 'today',
    'reminder', 'schedule', 'deadline', 'due', 'tonight',
    'coming up', 'soon', 'this week', 'next week'
  ];
  const showsSmartProcessing = smartIndicators.some(indicator =>
    lowerResponse.includes(indicator)
  );

  if (scenario.evaluationCriteria.shouldBeSmart) {
    if (showsSmartProcessing) {
      score += 2;
      feedback.push('✓ Shows intelligent processing (dates, priorities, etc.)');
    } else {
      feedback.push('✗ Lacks intelligent inference');
    }
  } else {
    score += 2; // Not evaluated
  }

  // 5. Helpful and Clear (2 points)
  if (response.length > 30 && response.length < 500) {
    score += 1;
    feedback.push('✓ Response length is appropriate');
  } else if (response.length < 30) {
    feedback.push('✗ Response is too brief');
  } else {
    feedback.push('⚠ Response is quite lengthy');
  }

  // Clear confirmation of action
  if (scenario.evaluationCriteria.shouldCreateAction) {
    const actionConfirmations = ["i've added", "i've created", "i've scheduled", "got it"];
    const hasConfirmation = actionConfirmations.some(conf => lowerResponse.includes(conf));
    if (hasConfirmation) {
      score += 1;
      feedback.push('✓ Clearly confirms action taken');
    } else {
      feedback.push('✗ No clear confirmation of action');
    }
  } else {
    score += 1;
  }

  const passes = score >= 7; // Need at least 7/10 to pass

  return { score, feedback, passes };
}

async function testConversation(scenario: ConversationalScenario) {
  const response = await fetch(`${API_BASE_URL}/api/agent/general`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: scenario.userMessage,
      userId: 'conversation-test-user',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data;
}

describe('Conversational Quality Tests', () => {
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
      console.error('Please start the enhanced server:');
      console.error('  cd server && npx ts-node src/server.ts\n');
      throw error;
    }
  });

  describe('Natural Conversation Scenarios', () => {
    conversationalScenarios.forEach((scenario) => {
      it(scenario.name, async () => {
        console.log(`\n💬 Testing: ${scenario.name}`);
        console.log(`👤 User says: "${scenario.userMessage}"`);
        console.log(`📋 Context: ${scenario.context}`);

        const result = await testConversation(scenario);

        console.log(`🤖 AI responds: "${result.message}"`);
        console.log(`🔧 Actions: ${result.actions?.length || 0}`);
        
        if (result.actions && result.actions.length > 0) {
          result.actions.forEach((action: any, idx: number) => {
            console.log(`   ${idx + 1}. ${action.type}: ${JSON.stringify(action.data, null, 2).substring(0, 100)}...`);
          });
        }

        // Evaluate response quality
        const evaluation = evaluateConversationalQuality(result.message, scenario);
        
        console.log(`\n📊 Quality Score: ${evaluation.score}/10`);
        evaluation.feedback.forEach(f => console.log(`   ${f}`));

        // Assertions
        expect(result.message).toBeTruthy();
        expect(result.message.length).toBeGreaterThan(20);

        if (scenario.evaluationCriteria.shouldCreateAction) {
          expect(result.actions).toBeDefined();
          expect(result.actions.length).toBeGreaterThan(0);
          
          if (scenario.evaluationCriteria.expectedActionType) {
            const hasExpectedAction = result.actions.some((action: any) =>
              action.type.includes(scenario.evaluationCriteria.expectedActionType!)
            );
            expect(hasExpectedAction).toBe(true);
          }
        }

        // Quality score should be at least 7/10
        expect(evaluation.score).toBeGreaterThanOrEqual(7, 
          `Conversational quality too low (${evaluation.score}/10)\n${evaluation.feedback.join('\n')}`
        );

        expect(evaluation.passes).toBe(true);

      }, 30000); // 30 second timeout
    });
  });

  describe('Overall Conversational Performance', () => {
    it('should maintain high conversational quality across all scenarios', async () => {
      const results: Array<{
        scenario: string;
        score: number;
        passes: boolean;
      }> = [];

      for (const scenario of conversationalScenarios) {
        const result = await testConversation(scenario);
        const evaluation = evaluateConversationalQuality(result.message, scenario);
        
        results.push({
          scenario: scenario.name,
          score: evaluation.score,
          passes: evaluation.passes,
        });
      }

      // Calculate statistics
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const passRate = (results.filter(r => r.passes).length / results.length) * 100;

      console.log('\n' + '='.repeat(70));
      console.log('💬 CONVERSATIONAL QUALITY SUMMARY');
      console.log('='.repeat(70));
      console.log(`\n📊 Average Conversation Score: ${avgScore.toFixed(1)}/10`);
      console.log(`✅ Pass Rate: ${passRate.toFixed(1)}% (${results.filter(r => r.passes).length}/${results.length})`);
      
      console.log('\n📋 Individual Scores:');
      results.forEach(r => {
        const emoji = r.score >= 9 ? '🌟' : r.score >= 7 ? '✅' : '⚠️';
        console.log(`   ${emoji} ${r.scenario}: ${r.score}/10`);
      });

      console.log('\n💡 Conversational Quality Assessment:');
      if (avgScore >= 9) {
        console.log('   🌟 EXCELLENT - Chatbot feels like a perfect personal assistant!');
      } else if (avgScore >= 7.5) {
        console.log('   ✅ VERY GOOD - Natural and helpful conversation');
      } else if (avgScore >= 6) {
        console.log('   👍 GOOD - Conversational but room for improvement');
      } else {
        console.log('   ⚠️  NEEDS IMPROVEMENT - Too robotic or not proactive enough');
      }

      console.log('\n' + '='.repeat(70) + '\n');

      // Assertions
      expect(avgScore).toBeGreaterThanOrEqual(7, 'Average conversational quality should be at least 7/10');
      expect(passRate).toBeGreaterThanOrEqual(80, 'At least 80% of scenarios should pass');
    }, 120000); // 2 minute timeout for all scenarios
  });
});

