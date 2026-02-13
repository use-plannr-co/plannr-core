export const tools = [
    {
        name: 'get_active_schedule',
        description: "Returns an overview of the user's currently active schedule: title, strategy, date range, number of days, and a summary of total vs completed blocks.",
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_todays_tasks',
        description: 'Returns all time blocks scheduled for today, including title, start/end times, duration, type, priority, and completion status.',
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
];
