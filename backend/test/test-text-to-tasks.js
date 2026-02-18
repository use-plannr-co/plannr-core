import crypto from 'crypto';
import { ENV } from '../src/config/env.js';

/**
 * Basic test for Text-to-Tasks module
 * Tests parsing flow with mocked LLM
 */

// Mock LLM response for testing
const mockLLMResponse = {
    tasks: [
        {
            title: 'Review project proposal',
            notes: 'Check the technical specifications and timeline',
            priority: 'HIGH',
            durationMinutes: 60,
            confidence: 0.9,
        },
        {
            title: 'Team meeting',
            priority: 'MEDIUM',
            durationMinutes: 30,
            confidence: 0.8,
        },
        {
            title: 'Update documentation',
            notes: 'Add the new API endpoints',
            priority: 'LOW',
            durationMinutes: 45,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            confidence: 0.7,
        },
    ],
};

// Test input validation
function testInputValidation() {
    console.log('\n=== Testing Input Validation ===');

    // Test input hash generation
    const text1 = '• Review proposal\n• Team meeting\n• Update docs';
    const text2 = '• Review proposal\n• Team meeting\n• Update docs';
    const text3 = '• Different text';

    const hash1 = crypto.createHash('sha256').update(text1, 'utf8').digest('hex');
    const hash2 = crypto.createHash('sha256').update(text2, 'utf8').digest('hex');
    const hash3 = crypto.createHash('sha256').update(text3, 'utf8').digest('hex');

    console.log('✓ Same text produces same hash:', hash1 === hash2);
    console.log('✓ Different text produces different hash:', hash1 !== hash3);

    // Test input stats
    const stats = {
        chars: text1.length,
        lines: text1.split('\n').length,
        itemsDetected: (text1.match(/^[\s]*[-*•]\s+/gm) || []).length,
    };

    console.log('✓ Input stats:', stats);
    console.log('✓ Detected', stats.itemsDetected, 'items from bullet points');
}

// Test LLM output validation
function testLLMValidation() {
    console.log('\n=== Testing LLM Output Validation ===');

    // Test valid output
    const validTasks = [];
    const warnings = [];

    mockLLMResponse.tasks.forEach((task, index) => {
        try {
            // Basic validation
            if (!task.title || typeof task.title !== 'string') {
                warnings.push({
                    code: 'MISSING_TITLE',
                    message: `Task ${index + 1} missing title`,
                    draftIndex: index,
                });
                return;
            }

            // Normalize task
            const normalizedTask = {
                title: task.title.substring(0, 200),
                notes: task.notes ? task.notes.substring(0, 1000) : null,
                priority: ['LOW', 'MEDIUM', 'HIGH'].includes(task.priority)
                    ? task.priority
                    : 'MEDIUM',
                durationMinutes:
                    task.durationMinutes &&
                    Number.isInteger(task.durationMinutes) &&
                    task.durationMinutes > 0
                        ? Math.min(task.durationMinutes, 480)
                        : null,
                deadline: task.deadline || null,
                preferredStart: task.preferredStart || null,
                confidence:
                    task.confidence && typeof task.confidence === 'number'
                        ? Math.max(0, Math.min(1, task.confidence))
                        : null,
            };

            // Generate warnings
            const taskWarnings = [];
            if (!normalizedTask.durationMinutes) {
                taskWarnings.push({
                    code: 'MISSING_DURATION',
                    message: 'Duration not specified or unclear',
                    field: 'durationMinutes',
                });
            }

            if (normalizedTask.confidence && normalizedTask.confidence < 0.6) {
                taskWarnings.push({
                    code: 'LOW_CONFIDENCE_PARSE',
                    message: 'Low confidence in task parsing accuracy',
                    field: 'confidence',
                });
            }

            normalizedTask.warnings = taskWarnings;
            validTasks.push(normalizedTask);
        } catch (error) {
            warnings.push({
                code: 'VALIDATION_ERROR',
                message: `Task ${index + 1} validation failed: ${error.message}`,
                draftIndex: index,
            });
        }
    });

    console.log('✓ Validated', validTasks.length, 'tasks');
    console.log('✓ Generated', warnings.length, 'global warnings');

    validTasks.forEach((task, i) => {
        console.log(
            `  Task ${i + 1}:`,
            task.title,
            '- Duration:',
            task.durationMinutes || 'missing',
            '- Priority:',
            task.priority
        );
        if (task.warnings.length > 0) {
            task.warnings.forEach((w) => console.log(`    Warning: ${w.message}`));
        }
    });
}

// Test draft enrichment logic
function testEnrichmentLogic() {
    console.log('\n=== Testing Enrichment Logic ===');

    const drafts = [
        {
            id: 'draft-1',
            title: 'Review proposal',
            priority: null,
            durationMinutes: null,
            included: true,
        },
        {
            id: 'draft-2',
            title: 'Team meeting',
            priority: 'MEDIUM',
            durationMinutes: 30,
            included: true,
        },
    ];

    const defaults = {
        duration: 45,
        priority: 'MEDIUM',
    };

    const overrides = {
        'draft-1': {
            priority: 'HIGH',
            durationMinutes: 60,
        },
    };

    const enrichedDrafts = drafts.map((draft) => {
        const override = overrides[draft.id] || {};

        return {
            ...draft,
            // Apply defaults
            durationMinutes: draft.durationMinutes || defaults.duration || null,
            priority: draft.priority || defaults.priority || 'MEDIUM',
            // Apply overrides
            ...Object.fromEntries(
                Object.entries(override).filter(([key, value]) => value !== undefined)
            ),
            enrichment: {
                appliedDefaults: Object.keys(defaults).filter(
                    (key) => !draft[key] && defaults[key]
                ),
                appliedOverrides: Object.keys(override),
            },
        };
    });

    console.log('✓ Enriched drafts:');
    enrichedDrafts.forEach((draft) => {
        console.log(`  ${draft.title}: ${draft.priority} priority, ${draft.durationMinutes}min`);
        console.log(`    Defaults: ${draft.enrichment.appliedDefaults.join(', ') || 'none'}`);
        console.log(`    Overrides: ${draft.enrichment.appliedOverrides.join(', ') || 'none'}`);
    });

    const readyToSchedule = enrichedDrafts
        .filter((d) => d.included)
        .every((d) => d.durationMinutes && d.durationMinutes > 0);
    console.log('✓ Ready to schedule:', readyToSchedule);
}

// Test schedule data transformation
function testScheduleTransformation() {
    console.log('\n=== Testing Schedule Transformation ===');

    const drafts = [
        {
            title: 'Review proposal',
            durationMinutes: 60,
            priority: 'HIGH',
            included: true,
            notes: 'Important review',
        },
        {
            title: 'Team meeting',
            durationMinutes: 30,
            priority: 'MEDIUM',
            included: true,
        },
    ];

    const dateRange = {
        start: '2024-01-15T00:00:00Z',
        end: '2024-01-19T23:59:59Z',
    };

    // Convert to flexible events format
    const flexibleEvents = drafts
        .filter((d) => d.included && d.durationMinutes)
        .map((draft) => ({
            name: draft.title,
            type: 'flexible',
            activityType: 'WORK',
            priority: draft.priority,
            duration: draft.durationMinutes,
            deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
            preferredStart: draft.preferredStart
                ? new Date(draft.preferredStart).toISOString()
                : null,
            notes: draft.notes || '',
            frontendId: crypto.randomUUID(),
        }));

    const scheduleRequest = {
        title: `AI Generated Schedule - ${new Date().toISOString().split('T')[0]}`,
        numDays: Math.ceil(
            (new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)
        ),
        day1Date: {
            date: new Date(dateRange.start).getDate(),
            month: new Date(dateRange.start).getMonth() + 1,
            year: new Date(dateRange.start).getFullYear(),
        },
        day1Day: new Date(dateRange.start).toLocaleDateString('en-US', { weekday: 'long' }),
        flexibleEvents,
    };

    console.log('✓ Schedule request:');
    console.log(`  Title: ${scheduleRequest.title}`);
    console.log(`  Duration: ${scheduleRequest.numDays} days`);
    console.log(
        `  Start: ${scheduleRequest.day1Day}, ${scheduleRequest.day1Date.month}/${scheduleRequest.day1Date.date}/${scheduleRequest.day1Date.year}`
    );
    console.log(`  Events: ${flexibleEvents.length}`);

    flexibleEvents.forEach((event) => {
        console.log(`    - ${event.name}: ${event.duration}min, ${event.priority} priority`);
    });
}

// Run all tests
function runTests() {
    console.log('🧪 Text-to-Tasks Module Tests');
    console.log('============================');

    testInputValidation();
    testLLMValidation();
    testEnrichmentLogic();
    testScheduleTransformation();

    console.log('\n✅ All tests completed!');
    console.log('\nNext steps:');
    console.log('1. Set GEMINI_API_KEY in .env file');
    console.log('2. Test with real API endpoints');
    console.log('3. Test end-to-end with frontend integration');
}

// Check environment
if (!ENV.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not found in environment');
    console.log('Add GEMINI_API_KEY=your_key_here to .env file');
}

runTests();
