export const tools = [
    {
        name: 'get_active_schedule',
        description: "Returns an overview of the user's currently active schedule: title, strategy, date range, number of days, and a summary of total vs completed blocks.",
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_todays_tasks',
        description: 'Returns all time blocks scheduled for today (in the user\'s local timezone), including title, start/end times, duration, type, priority, and completion status.',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_completed_tasks',
        description: "Returns today's tasks that have already been marked as complete.",
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_incomplete_tasks',
        description: "Returns today's tasks that have not yet been completed.",
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_overdue_tasks',
        description: "Returns today's tasks whose scheduled end time has already passed in the user's local timezone but are still marked incomplete.",
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_upcoming_tasks',
        description: 'Returns tasks scheduled for the next N days (1-7, default 3).',
        input_schema: {
            type: 'object',
            properties: {
                days: {
                    type: 'integer',
                    description: 'Number of upcoming days to fetch (1-7).',
                    minimum: 1,
                    maximum: 7,
                },
            },
            required: [],
        },
    },
    {
        name: 'get_schedule_for_date',
        description: 'Returns all tasks scheduled for a specific date. Use this when a user asks about a particular day.',
        input_schema: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'The date to fetch tasks for, in YYYY-MM-DD format.',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                },
            },
            required: ['date'],
        },
    },
    {
        name: 'propose_missed_task_shift',
        description: "Proposes rescheduling ALL incomplete flexible tasks across the entire active schedule (not just today's), starting from now. This mirrors what Rescheduler.missedTaskShifting() does: it collects every incomplete flexible event in the schedule and re-slots them from the current time forward using the existing strategy. Returns a count and sample list of affected tasks.",
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'propose_add_task',
        description: "Proposes adding a new task to the user's schedule. Claude extracts the task details from the conversation.",
        input_schema: {
            type: 'object',
            properties: {
                name:     { type: 'string', description: 'Task name' },
                duration: { type: 'integer', description: 'Duration in minutes' },
                category: { type: 'string', description: 'Activity type (study, work, exercise, personal, break)' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
                deadline: { type: 'string', description: 'Optional deadline date YYYY-MM-DD' },
            },
            required: ['name', 'duration', 'category'],
        },
    },
    {
        name: 'propose_strategy_switch',
        description: "Proposes switching the schedule's rescheduling strategy. When confirmed, this also reschedules ALL remaining incomplete flexible events using the new strategy (mirrors Rescheduler.strategySwitch behavior).",
        input_schema: {
            type: 'object',
            properties: {
                newStrategy: { type: 'string', enum: ['earliest-fit', 'balanced-work', 'deadline-oriented'] },
            },
            required: ['newStrategy'],
        },
    },
];
