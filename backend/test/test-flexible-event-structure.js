import crypto from 'crypto';

/**
 * Test the updated FlexibleEvent structure for Text-to-Tasks
 */

// Mock FlexibleEvent LLM response
const mockFlexibleEventResponse = {
    tasks: [
        {
            name: 'Review project proposal',
            type: 'WORK',
            duration: 120,
            priority: 'HIGH',
            deadline: {
                date: 15,
                month: 1,
                year: 2026,
            },
            id: null,
        },
        {
            name: 'Team standup meeting',
            type: 'MEETING',
            duration: 30,
            priority: 'MEDIUM',
            deadline: null,
        },
        {
            name: 'Grocery shopping',
            type: 'ERRAND',
            duration: 60,
            priority: 'LOW',
            deadline: {
                date: 16,
                month: 1,
                year: 2026,
            },
        },
    ],
};

// Test FlexibleEvent validation
function testFlexibleEventValidation() {
    console.log('\n=== Testing FlexibleEvent Validation ===');

    const validActivityTypes = [
        'PERSONAL',
        'MEETING',
        'WORK',
        'EVENT',
        'EDUCATION',
        'TRAVEL',
        'RECREATIONAL',
        'ERRAND',
        'OTHER',
        'BREAK',
    ];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    const validTasks = [];
    const warnings = [];

    mockFlexibleEventResponse.tasks.forEach((task, index) => {
        try {
            // Validate FlexibleEvent required fields
            if (!task.name || typeof task.name !== 'string') {
                warnings.push({
                    code: 'MISSING_NAME',
                    message: `Task ${index + 1} missing name`,
                });
                return;
            }

            if (!task.type || !validActivityTypes.includes(task.type)) {
                warnings.push({
                    code: 'INVALID_ACTIVITY_TYPE',
                    message: `Task ${index + 1} has invalid activity type: ${task.type}`,
                });
                return;
            }

            if (!task.duration || !Number.isInteger(task.duration) || task.duration <= 0) {
                warnings.push({
                    code: 'INVALID_DURATION',
                    message: `Task ${index + 1} missing or invalid duration`,
                });
                return;
            }

            if (!task.priority || !validPriorities.includes(task.priority)) {
                warnings.push({
                    code: 'INVALID_PRIORITY',
                    message: `Task ${index + 1} has invalid priority: ${task.priority}`,
                });
                return;
            }

            // Validate deadline structure if provided
            let validDeadline = null;
            if (task.deadline && task.deadline !== null) {
                if (
                    typeof task.deadline === 'object' &&
                    Number.isInteger(task.deadline.date) &&
                    Number.isInteger(task.deadline.month) &&
                    Number.isInteger(task.deadline.year)
                ) {
                    if (
                        task.deadline.date >= 1 &&
                        task.deadline.date <= 31 &&
                        task.deadline.month >= 1 &&
                        task.deadline.month <= 12 &&
                        task.deadline.year >= 2024 &&
                        task.deadline.year <= 2030
                    ) {
                        validDeadline = task.deadline;
                    } else {
                        warnings.push({
                            code: 'INVALID_DEADLINE_VALUES',
                            message: `Task ${index + 1} has invalid deadline date values`,
                        });
                    }
                } else {
                    warnings.push({
                        code: 'INVALID_DEADLINE_FORMAT',
                        message: `Task ${index + 1} has invalid deadline format`,
                    });
                }
            }

            const normalizedTask = {
                name: task.name.substring(0, 200),
                type: task.type,
                duration: Math.min(task.duration, 480),
                priority: task.priority,
                deadline: validDeadline,
                id: task.id || crypto.randomUUID(),
            };

            validTasks.push(normalizedTask);
        } catch (error) {
            warnings.push({
                code: 'VALIDATION_ERROR',
                message: `Task ${index + 1} validation failed: ${error.message}`,
            });
        }
    });

    console.log('✓ Validated', validTasks.length, 'FlexibleEvent tasks');
    console.log('✓ Generated', warnings.length, 'validation warnings');

    validTasks.forEach((task, i) => {
        console.log(`  Task ${i + 1}: "${task.name}"`);
        console.log(
            `    Type: ${task.type}, Duration: ${task.duration}min, Priority: ${task.priority}`
        );
        if (task.deadline) {
            console.log(
                `    Deadline: ${task.deadline.month}/${task.deadline.date}/${task.deadline.year}`
            );
        }
    });

    return { validTasks, warnings };
}

// Test conversion to draft format
function testDraftConversion() {
    console.log('\n=== Testing Draft Conversion ===');

    const { validTasks } = testFlexibleEventValidation();
    const sessionId = 'test-session-id';

    const drafts = validTasks.map((task, index) => ({
        sessionId,
        orderIndex: index,
        title: task.name,
        notes: `Activity Type: ${task.type}`,
        deadline: task.deadline
            ? new Date(task.deadline.year, task.deadline.month - 1, task.deadline.date)
            : null,
        preferredStart: null,
        priority: task.priority,
        durationMinutes: task.duration,
        included: true,
        warnings: [],
        confidence: null,
        enrichment: {
            originalFlexibleEvent: {
                name: task.name,
                type: task.type,
                duration: task.duration,
                priority: task.priority,
                deadline: task.deadline,
                id: task.id,
            },
        },
    }));

    console.log('✓ Converted', drafts.length, 'FlexibleEvents to drafts');

    drafts.forEach((draft) => {
        console.log(`  Draft: "${draft.title}"`);
        console.log(`    Duration: ${draft.durationMinutes}min, Priority: ${draft.priority}`);
        console.log(`    Original Type: ${draft.enrichment.originalFlexibleEvent.type}`);
        if (draft.deadline) {
            console.log(`    Deadline: ${draft.deadline.toISOString().split('T')[0]}`);
        }
    });

    return drafts;
}

// Test conversion back to flexible events for scheduling
function testScheduleConversion() {
    console.log('\n=== Testing Schedule Conversion ===');

    const drafts = testDraftConversion();

    const flexibleEvents = drafts.map((draft) => {
        const originalEvent = draft.enrichment?.originalFlexibleEvent;

        const flexEvent = {
            name: draft.title,
            type: 'flexible',
            duration: draft.durationMinutes,
            priority: draft.priority,
            activityType: originalEvent?.type || 'WORK',
            frontendId: originalEvent?.id || crypto.randomUUID(),
        };

        if (draft.deadline) {
            const deadlineDate = new Date(draft.deadline);
            flexEvent.deadline = {
                date: deadlineDate.getDate(),
                month: deadlineDate.getMonth() + 1,
                year: deadlineDate.getFullYear(),
            };
        }

        return flexEvent;
    });

    console.log('✓ Converted', flexibleEvents.length, 'drafts back to FlexibleEvents');

    flexibleEvents.forEach((event) => {
        console.log(`  Event: "${event.name}"`);
        console.log(
            `    Activity: ${event.activityType}, Duration: ${event.duration}min, Priority: ${event.priority}`
        );
        if (event.deadline) {
            console.log(
                `    Deadline: ${event.deadline.month}/${event.deadline.date}/${event.deadline.year}`
            );
        }
    });

    return flexibleEvents;
}

function runFlexibleEventTests() {
    console.log('🧪 FlexibleEvent Structure Tests');
    console.log('===============================');

    testFlexibleEventValidation();
    testDraftConversion();
    testScheduleConversion();

    console.log('\n✅ All FlexibleEvent tests completed!');
    console.log('\n📋 FlexibleEvent Schema Summary:');
    console.log('  - name: string (task title)');
    console.log('  - type: ActivityType enum (WORK, MEETING, etc.)');
    console.log('  - duration: number (minutes)');
    console.log('  - priority: Priority enum (LOW, MEDIUM, HIGH)');
    console.log('  - deadline: ScheduleDate object or null');
    console.log('  - id: string (auto-generated if not provided)');
    console.log('\n🔄 Data Flow:');
    console.log('  1. LLM returns FlexibleEvent JSON');
    console.log('  2. Validate against FlexibleEvent schema');
    console.log('  3. Convert to draft format for database');
    console.log('  4. Convert back to FlexibleEvent for scheduling');
}

runFlexibleEventTests();
