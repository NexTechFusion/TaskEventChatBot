# Chatbot Integration Tests

## Overview

This directory contains comprehensive integration tests for the Task Track Bot chatbot functionality. The tests evaluate the overall performance of the AI chatbot across various scenarios including task creation, event scheduling, and general queries.

## Running Tests

### Quick Start

```bash
# Run all integration tests
npm run test:integration

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Run with coverage report
npm run test:coverage
```

### Prerequisites

1. **Start the server first:**
   ```bash
   cd server
   npm start
   ```
   The server must be running on `http://localhost:3001` before running tests.

2. **Ensure you have environment variables set:**
   - Check `server/.env` file has all required API keys
   - The chatbot requires LLM API access to function

## Test Structure

### Test Scenarios

The integration test covers 10 comprehensive scenarios:

1. **Task Tests:**
   - Simple task creation
   - Task with priority levels
   - Complex task with details
   - Natural language understanding

2. **Event Tests:**
   - Event scheduling
   - Event with location
   
3. **Query Tests:**
   - General task queries
   - General event queries
   - Help requests

4. **Mixed Tests:**
   - Combined task and event creation

### Evaluation Criteria

Each test scenario is evaluated on a 10-point scale:

- **Response Content (1 point):** Has meaningful content (>20 characters)
- **Keyword Relevance (3 points):** Contains expected keywords from the query
- **Action Generation (3 points):** Generates appropriate actions (create_task, create_event, etc.)
- **Helpfulness (2 points):** Uses helpful, action-oriented language
- **Error-free (1 point):** No error messages in response

### Quality Thresholds

- **Excellent:** 8-10 points
- **Good:** 6-7 points
- **Fair:** 4-5 points
- **Poor:** 0-3 points

Minimum passing scores are set per scenario (typically 5-8 points).

## Test Output

### Individual Test Results

For each scenario, you'll see:
```
📊 Simple Task Creation
   Score: 8/10
   Time: 1234ms
   ✓ Response has meaningful content
   ✓ Good keyword relevance (4/4)
   ✓ Generated 1 action(s)
   ✓ Actions match expected types
   ✓ Response uses helpful language
   ✓ No error indicators in response
```

### Summary Report

After all tests complete:
```
============================================================
📈 CHATBOT INTEGRATION TEST SUMMARY
============================================================

✅ Success Rate: 100.0% (10/10)
📊 Average Quality Score: 8.2/10
⚡ Average Response Time: 2341ms

📊 Score Distribution:
   Excellent (8-10): 7
   Good (6-7):       3
   Fair (4-5):       0
   Poor (0-3):       0

============================================================
```

## Understanding Test Results

### Success Rate
- **Target:** ≥80%
- Percentage of tests that successfully completed without errors

### Average Quality Score
- **Target:** ≥6.0/10
- Mean score across all successful tests
- Indicates overall AI response quality

### Response Time
- **Target:** <10 seconds average
- Measures chatbot responsiveness
- Individual tests timeout at 35 seconds

### Score Distribution
- Shows how many tests fall into each quality category
- Ideal distribution: Most tests in "Excellent" or "Good"

## Troubleshooting

### Server Not Running
```
❌ Server is not running!
Please start the server first:
  cd server && npm start
```
**Solution:** Start the server before running tests.

### Low Success Rate (<80%)
**Possible causes:**
- Server configuration issues
- Missing environment variables
- API key issues
- Database connection problems

**Solution:** Check server logs and environment setup.

### Low Average Score (<6.0)
**Possible causes:**
- LLM model not responding correctly
- Agent prompts need tuning
- Tool execution issues

**Solution:** Review agent configurations and prompts.

### Slow Response Times (>10s average)
**Possible causes:**
- LLM API latency
- Network issues
- Server resource constraints

**Solution:** Check network connection and server resources.

## Customization

### Adding New Test Scenarios

Edit `tests/chatbot.integration.test.ts`:

```typescript
{
  name: 'Your Test Name',
  category: 'task', // or 'event', 'query', 'mixed'
  endpoint: '/api/agent/general',
  message: 'Your test message here',
  expectedKeywords: ['keyword1', 'keyword2'],
  expectedActionTypes: ['create_task'], // optional
  minScore: 7, // optional, default is 5
}
```

### Adjusting Quality Thresholds

In the evaluation function, you can adjust:
- Keyword matching requirements
- Action type expectations
- Minimum scores per scenario
- Overall quality targets

## Best Practices

1. **Run tests regularly** during development to catch regressions
2. **Review low-scoring tests** to improve agent prompts
3. **Monitor response times** to ensure good user experience
4. **Add new scenarios** as you add features
5. **Update expected keywords** when changing agent behavior

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Start server
  run: cd server && npm start &
  
- name: Wait for server
  run: sleep 5
  
- name: Run integration tests
  run: npm run test:integration
```

## Support

For issues or questions:
1. Check server logs for errors
2. Verify environment variables
3. Test API endpoints manually
4. Review agent configurations

