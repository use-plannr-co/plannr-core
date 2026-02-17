# Text-to-Tasks Module

AI-powered text parsing to convert free-form task lists into structured, schedulable tasks using Google's Gemini LLM.

## Overview

This module enables users to paste unstructured text (bullet points, task lists, notes) and automatically parse them into structured **FlexibleEvent** objects that match the frontend model exactly. The parsed events can then be enriched with defaults and converted into schedules using the existing scheduling engine.

### Key Features

- **FlexibleEvent Parsing**: LLM converts text directly to FlexibleEvent structure
- **Activity Type Detection**: Automatically categorizes tasks (WORK, MEETING, PERSONAL, etc.)
- **Smart Duration Inference**: Extracts time estimates from text hints
- **Deadline Parsing**: Converts relative dates to ScheduleDate format
- **Priority Detection**: Identifies urgency from text indicators

## Architecture

### Flow: Parse → Enrich → Generate

1. **Parse**: Raw text → LLM processing → Task drafts
2. **Enrich**: Apply defaults and user overrides to drafts
3. **Generate**: Convert enriched drafts to scheduled events

### Database Tables

- `text_to_tasks_sessions`: Parse sessions with metadata
- `text_to_tasks_drafts`: Individual task drafts with enrichment data

## API Endpoints

### POST `/api/text-to-tasks/parse`

Convert pasted text into task drafts.

**Request:**

```json
{
    "text": "• Review proposal (2hrs)\n• Team meeting\n• Update docs",
    "preferences": {
        "defaultDuration": 60,
        "defaultPriority": "MEDIUM"
    }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "drafts": [...],
    "warnings": [...],
    "meta": {
      "inputStats": { "chars": 45, "lines": 3, "itemsDetected": 3 },
      "llmProvider": "gemini",
      "tokensUsed": 234,
      "parseLatencyMs": 1500
    }
  }
}
```

### GET `/api/text-to-tasks/sessions/:sessionId/drafts`

Retrieve task drafts for a session.

### PUT `/api/text-to-tasks/sessions/:sessionId/enrich`

Apply defaults and overrides to task drafts.

**Request:**

```json
{
    "sessionId": "uuid",
    "defaults": {
        "duration": 45,
        "priority": "MEDIUM"
    },
    "overrides": {
        "draft-id": {
            "duration": 120,
            "priority": "HIGH",
            "included": false
        }
    }
}
```

### POST `/api/text-to-tasks/sessions/:sessionId/generate-schedule`

Generate a schedule from enriched task drafts.

**Request:**

```json
{
    "sessionId": "uuid",
    "dateRange": {
        "start": "2024-01-15T00:00:00Z",
        "end": "2024-01-19T23:59:59Z"
    },
    "strategy": "earliest-fit",
    "workingHours": {
        "start": 900,
        "end": 1700,
        "maxHoursPerDay": 8
    }
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "sessionId": "uuid",
        "scheduleId": "uuid",
        "stats": {
            "totalTasks": 5,
            "scheduledTasks": 4,
            "unscheduledTasks": 1,
            "totalDuration": 240,
            "scheduleSpan": {
                "start": "2024-01-15T00:00:00Z",
                "end": "2024-01-19T23:59:59Z",
                "days": 5
            }
        }
    }
}
```

## LLM Integration

### Google Gemini Setup

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### Prompting Strategy

- **Strict JSON output**: LLM must return valid JSON matching exact schema
- **Repair attempts**: Single retry on validation failure with error context
- **Schema enforcement**: All LLM output validated with Zod schemas
- **Conservative confidence**: Low confidence scores trigger warnings

### Example LLM Output

```json
{
    "tasks": [
        {
            "name": "Review project proposal",
            "type": "WORK",
            "duration": 120,
            "priority": "HIGH",
            "deadline": {
                "date": 15,
                "month": 1,
                "year": 2026
            },
            "id": null
        },
        {
            "name": "Team meeting",
            "type": "MEETING",
            "duration": 30,
            "priority": "MEDIUM",
            "deadline": null
        }
    ]
}
```

## Security & Privacy

### Data Protection

- **No raw text storage**: Only SHA256 hash + basic stats stored
- **PII filtering**: Remove email/phone patterns before LLM processing
- **Session cleanup**: Auto-expire failed sessions after 24 hours
- **Rate limiting**: 10 parses per hour per user

### Input Validation

- **Size limits**: 5000 character maximum
- **Schema validation**: All inputs validated with Zod
- **Output sanitization**: LLM responses sanitized and bounded
- **Error isolation**: Parse failures don't crash other operations

## Performance & Cost

### Token Management

- **Input limits**: ~500 tokens per request
- **Model choice**: Gemini Flash (cost-efficient)
- **Caching**: Parse results cached by input hash (24hrs)
- **Timeouts**: 30 second maximum per LLM call

### Optimization

- **Connection pooling**: Reuse HTTP connections
- **Async processing**: Non-blocking LLM calls
- **Memory management**: Clear large objects after processing
- **Database indexing**: Efficient session/draft lookups

## Testing

### Unit Tests

```bash
node test-text-to-tasks.js
```

Tests validation logic, enrichment, and data transformations.

### Structure Tests

```bash
node test-text-to-tasks-structure.js
```

Verifies module imports, schema definitions, and API structure.

### Integration Tests

```bash
node test-text-to-tasks-integration.js
```

Tests API endpoints with mocked authentication.

## Error Handling

### Parse Failures

- **Invalid JSON**: Attempt repair with error context
- **Schema validation**: Return warnings for invalid tasks
- **Partial success**: Accept valid tasks, flag invalid ones
- **Total failure**: Return empty drafts with explanatory warnings

### Warning Types

- `MISSING_DURATION`: No clear time estimate provided
- `MISSING_DEADLINE`: Deadline mentioned but unclear
- `AMBIGUOUS_DATE`: Date reference couldn't be parsed
- `INVALID_ACTIVITY_TYPE`: Activity type not recognized
- `INVALID_PRIORITY`: Priority level not valid
- `SHORT_DURATION`: Duration less than 15 minutes
- `LONG_DURATION`: Duration more than 4 hours
- `MISSING_NAME`: Task name not provided
- `INVALID_DEADLINE_FORMAT`: Deadline not in ScheduleDate format
- `INVALID_DEADLINE_VALUES`: Deadline date values out of range

## Usage Examples

### Basic Parse

```javascript
const response = await fetch('/api/text-to-tasks/parse', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
        text: '• Fix login bug\n• Team standup (30min)\n• Code review',
    }),
});
```

### Enrich with Defaults

```javascript
await fetch(`/api/text-to-tasks/sessions/${sessionId}/enrich`, {
    method: 'PUT',
    body: JSON.stringify({
        sessionId,
        defaults: { duration: 60, priority: 'MEDIUM' },
        overrides: {
            [draftId]: { priority: 'HIGH', included: false },
        },
    }),
});
```

### Generate Schedule

```javascript
await fetch(`/api/text-to-tasks/sessions/${sessionId}/generate-schedule`, {
    method: 'POST',
    body: JSON.stringify({
        sessionId,
        dateRange: {
            start: '2024-01-15T00:00:00Z',
            end: '2024-01-19T23:59:59Z',
        },
        strategy: 'deadline-oriented',
    }),
});
```

## Dependencies

- `@google/generative-ai`: LLM integration
- `zod`: Schema validation
- `drizzle-orm`: Database operations
- `crypto`: Input hashing
- Express.js middleware stack

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_postgres_connection_string

# Optional
NODE_ENV=development
AUTH_DEV=true  # For testing without Clerk
```

## Development

### Adding New Providers

1. Create provider client in `src/services/llm/`
2. Implement `parseTasksFromText()` and `repairTasksParse()`
3. Update `src/services/llm/index.js` provider selection
4. Add provider-specific configuration

### Extending Task Schema

1. Update `TaskDraftSchema` in validators
2. Modify database schema for new fields
3. Update LLM prompt with new fields
4. Add validation rules for new fields

### Custom Validation

Add validation rules in `textToTasks.validators.js`:

```javascript
const CustomTaskSchema = TaskDraftSchema.extend({
    customField: z.string().optional(),
});
```
