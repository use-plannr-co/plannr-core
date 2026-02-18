import ScheduleDate from '../../model/ScheduleDate';
import FlexibleEvent from '../../model/FlexibleEvent.js';

/**
 * Text-to-Tasks API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const parseTextToFlexibleEvents = async (
    makeAuthenticatedRequest,
    todoListText,
    defaultDeadline,
    preferences = {
        defaultDuration: 60,
        workingHours: { start: 9, end: 17 },
        timezone: 'America/New_York',
    },
) => {
    console.log('🤖 Starting text-to-tasks parsing...');

    const parseResponse = await makeAuthenticatedRequest('/api/text-to-tasks/parse', {
        method: 'POST',
        body: JSON.stringify({
            text: todoListText,
            preferences: {
                defaultDuration: 60,
                workingHours: { start: 9, end: 17 },
                timezone: 'America/New_York',
                ...preferences,
            },
        }),
    });

    if (!parseResponse.success) {
        throw new Error(`Parse failed: ${parseResponse.error || 'Unknown error'}`);
    }

    const { sessionId, drafts, meta } = parseResponse.data;
    console.log(`✅ Parse successful: ${drafts.length} tasks parsed`);

    const flexibleEvents = drafts.map((draft) => {
        let deadline = null;
        if (draft.deadline) {
            if (
                typeof draft.deadline === 'object' &&
                draft.deadline.date &&
                draft.deadline.month &&
                draft.deadline.year
            ) {
                deadline = new ScheduleDate(
                    draft.deadline.date,
                    draft.deadline.month,
                    draft.deadline.year,
                );
            } else if (typeof draft.deadline === 'string') {
                const date = new Date(draft.deadline);
                deadline = new ScheduleDate(
                    date.getDate(),
                    date.getMonth() + 1,
                    date.getFullYear(),
                );
            }
        } else {
            deadline = defaultDeadline || null;
        }

        let eventData;
        if (draft.enrichment?.originalFlexibleEvent) {
            eventData = {
                name: draft.enrichment.originalFlexibleEvent.name || draft.title,
                type: draft.enrichment.originalFlexibleEvent.type || 'OTHER',
                duration: draft.enrichment.originalFlexibleEvent.duration || draft.durationMinutes,
                priority: draft.enrichment.originalFlexibleEvent.priority || draft.priority,
                deadline,
                id: draft.enrichment.originalFlexibleEvent.id || draft.id,
            };
        } else {
            eventData = {
                name: draft.title,
                type: draft.notes?.includes('Activity Type: ')
                    ? draft.notes.replace('Activity Type: ', '').trim()
                    : 'OTHER',
                duration: draft.durationMinutes,
                priority: draft.priority,
                deadline,
                id: draft.id,
            };
        }

        return new FlexibleEvent(
            eventData.name,
            eventData.type,
            eventData.duration,
            eventData.priority,
            deadline,
            eventData.id || draft.id,
        );
    });

    return {
        success: true,
        flexibleEvents,
        sessionId,
        stats: {
            totalTasks: meta?.inputStats?.itemsDetected || drafts.length,
            validTasks: drafts.length,
            warnings: parseResponse.data.warnings?.length || 0,
        },
        warnings: drafts
            .filter((draft) => draft.warnings && draft.warnings.length > 0)
            .flatMap((draft) => draft.warnings),
    };
};
