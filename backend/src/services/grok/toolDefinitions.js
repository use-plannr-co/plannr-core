export const tools = [
    {
        type: 'function',
        function: {
            name: 'get_active_schedule',
            description:
                "Returns an overview of the user's currently active schedule: title, strategy, date range, number of days, and a summary of total vs completed blocks.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_todays_tasks',
            description:
                "Returns all time blocks scheduled for today (in the user's local timezone), including title, start/end times, duration, type, priority, and completion status.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_completed_tasks',
            description: "Returns today's tasks that have already been marked as complete.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_incomplete_tasks',
            description: "Returns today's tasks that have not yet been completed.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_overdue_tasks',
            description:
                "Returns today's tasks whose scheduled end time has already passed in the user's local timezone but are still marked incomplete.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_upcoming_tasks',
            description: 'Returns tasks scheduled for the next N days (1-7, default 3).',
            parameters: {
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
    },
    {
        type: 'function',
        function: {
            name: 'get_schedule_for_date',
            description:
                'Returns all tasks scheduled for a specific date. Use this when a user asks about a particular day.',
            parameters: {
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
    },
    {
        type: 'function',
        function: {
            name: 'propose_missed_task_shift',
            description:
                "Proposes rescheduling ALL incomplete flexible tasks across the entire active schedule (not just today's), starting from now. This mirrors what Rescheduler.missedTaskShifting() does: it collects every incomplete flexible event in the schedule and re-slots them from the current time forward using the existing strategy. Returns a count and sample list of affected tasks.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'propose_add_task',
            description:
                "Proposes adding a new event to the user's schedule. For flexible tasks (study, work, etc.) supply name/duration/category/priority/deadline. For fixed-time events like meetings or appointments, also supply isFixed=true, date (YYYY-MM-DD), startTime and endTime (24-hour integer, e.g. 1430 for 2:30 PM) — duration is still required and should match the difference.",
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Event name' },
                    duration: { type: 'integer', description: 'Duration in minutes' },
                    category: {
                        type: 'string',
                        description:
                            'Activity type (study, work, exercise, personal, break, meeting, travel, errand)',
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'Task priority (only relevant for flexible tasks)',
                    },
                    deadline: {
                        type: 'string',
                        description: 'Optional deadline date YYYY-MM-DD (flexible tasks only)',
                    },
                    isFixed: {
                        type: 'boolean',
                        description:
                            'Set to true for fixed-time events (meetings, appointments) that have a specific date and time.',
                    },
                    date: {
                        type: 'string',
                        description:
                            'Required when isFixed=true. The date of the fixed event in YYYY-MM-DD format.',
                    },
                    startTime: {
                        type: 'integer',
                        description:
                            'Required when isFixed=true. Start time as 24-hour integer (e.g. 1430 for 2:30 PM).',
                    },
                    endTime: {
                        type: 'integer',
                        description:
                            'Required when isFixed=true. End time as 24-hour integer (e.g. 1630 for 4:30 PM).',
                    },
                },
                required: ['name', 'duration', 'category'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'propose_strategy_switch',
            description:
                "Proposes switching the schedule's rescheduling strategy. When confirmed, this also reschedules ALL remaining incomplete flexible events using the new strategy (mirrors Rescheduler.strategySwitch behavior).",
            parameters: {
                type: 'object',
                properties: {
                    newStrategy: {
                        type: 'string',
                        enum: ['earliest-fit', 'balanced-work', 'deadline-oriented'],
                    },
                },
                required: ['newStrategy'],
            },
        },
    },
];
