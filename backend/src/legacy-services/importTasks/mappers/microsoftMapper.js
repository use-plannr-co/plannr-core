import { TaskDraftDTO, TaskListDTO, CalendarEventDTO } from '../dtos/index.js';

/**
 * Maps Microsoft Graph task lists to our TaskListDTO format
 */
export function mapTaskListFromMicrosoft(microsoftTaskList) {
    return new TaskListDTO({
        id: microsoftTaskList.id,
        name: microsoftTaskList.displayName,
        provider: 'microsoft',
        isDefault: microsoftTaskList.isOwner && microsoftTaskList.displayName === 'Tasks',
        metadata: {
            isOwner: microsoftTaskList.isOwner,
            isShared: microsoftTaskList.isShared,
            wellknownListName: microsoftTaskList.wellknownListName,
        },
    });
}

/**
 * Maps Microsoft Graph tasks to our TaskDraftDTO format
 */
export function mapTaskFromMicrosoft(microsoftTask, listId) {
    // Parse due date
    let dueDate = null;
    if (microsoftTask.dueDateTime?.dateTime) {
        dueDate = new Date(microsoftTask.dueDateTime.dateTime);
    }

    // Parse created date
    let createdAt = null;
    if (microsoftTask.createdDateTime) {
        createdAt = new Date(microsoftTask.createdDateTime);
    }

    // Parse completed date
    let completedAt = null;
    if (microsoftTask.completedDateTime?.dateTime) {
        completedAt = new Date(microsoftTask.completedDateTime.dateTime);
    }

    // Determine priority from importance
    let priority = 'medium';
    if (microsoftTask.importance === 'high') {
        priority = 'high';
    } else if (microsoftTask.importance === 'low') {
        priority = 'low';
    }

    // Extract categories/tags
    const tags = microsoftTask.categories || [];

    // Process linked resources (attachments/links)
    const attachments = [];
    if (microsoftTask.linkedResources) {
        for (const resource of microsoftTask.linkedResources) {
            attachments.push({
                type: resource.webUrl ? 'url' : 'reference',
                name: resource.displayName,
                url: resource.webUrl,
                id: resource.id,
            });
        }
    }

    // Estimate duration based on task complexity (simple heuristic)
    const estimatedDuration = estimateTaskDuration(microsoftTask);

    return new TaskDraftDTO({
        title: microsoftTask.title || 'Untitled Task',
        description: microsoftTask.body?.content || '',
        dueDate,
        priority,
        estimatedDuration,
        tags,
        isCompleted: microsoftTask.status === 'completed',
        completedAt,
        providerTaskId: microsoftTask.id,
        providerListId: listId,
        metadata: {
            importance: microsoftTask.importance,
            status: microsoftTask.status,
            hasAttachments: attachments.length > 0,
            attachments,
            lastModifiedDateTime: microsoftTask.lastModifiedDateTime,
            createdDateTime: microsoftTask.createdDateTime,
            bodyPreview:
                microsoftTask.body?.contentType === 'html'
                    ? stripHtmlTags(microsoftTask.body?.content || '')
                    : microsoftTask.body?.content || '',
            recurrence: microsoftTask.recurrence || null,
        },
    });
}

/**
 * Maps Microsoft Graph calendar events to our CalendarEventDTO format
 */
export function mapCalendarEventFromMicrosoft(microsoftEvent) {
    // Parse start and end times
    const startDate = new Date(microsoftEvent.start.dateTime);
    const endDate = new Date(microsoftEvent.end.dateTime);

    // Calculate duration in minutes
    const duration = Math.round((endDate - startDate) / (1000 * 60));

    // Determine if this is an all-day event
    const isAllDay = microsoftEvent.isAllDay || false;

    // Extract location
    let location = null;
    if (microsoftEvent.location?.displayName) {
        location = {
            name: microsoftEvent.location.displayName,
            address: microsoftEvent.location.address?.street || null,
            coordinates: microsoftEvent.location.coordinates || null,
        };
    }

    // Extract attendees
    const attendees = [];
    if (microsoftEvent.attendees) {
        for (const attendee of microsoftEvent.attendees) {
            attendees.push({
                name: attendee.emailAddress?.name || 'Unknown',
                email: attendee.emailAddress?.address || '',
                status: attendee.status?.response || 'none',
                isOrganizer:
                    attendee.type === 'required' && attendee.status?.response === 'organizer',
            });
        }
    }

    return new CalendarEventDTO({
        title: microsoftEvent.subject || 'Untitled Event',
        description: microsoftEvent.body?.content || '',
        startDate,
        endDate,
        duration,
        isAllDay,
        location,
        isRecurring: !!microsoftEvent.recurrence,
        attendees,
        providerEventId: microsoftEvent.id,
        metadata: {
            importance: microsoftEvent.importance,
            sensitivity: microsoftEvent.sensitivity,
            showAs: microsoftEvent.showAs,
            isOnlineMeeting: microsoftEvent.isOnlineMeeting || false,
            onlineMeetingUrl: microsoftEvent.onlineMeeting?.joinUrl || null,
            categories: microsoftEvent.categories || [],
            recurrence: microsoftEvent.recurrence || null,
            lastModifiedDateTime: microsoftEvent.lastModifiedDateTime,
            createdDateTime: microsoftEvent.createdDateTime,
        },
    });
}

/**
 * Estimate task duration based on task properties (simple heuristic)
 */
function estimateTaskDuration(task) {
    let baseDuration = 60; // Default 60 minutes

    // Adjust based on importance
    if (task.importance === 'high') {
        baseDuration *= 1.5;
    } else if (task.importance === 'low') {
        baseDuration *= 0.7;
    }

    // Adjust based on description length
    const descriptionLength = task.body?.content?.length || 0;
    if (descriptionLength > 500) {
        baseDuration *= 1.3;
    } else if (descriptionLength > 200) {
        baseDuration *= 1.1;
    }

    // Adjust based on attachments
    if (task.linkedResources && task.linkedResources.length > 0) {
        baseDuration *= 1.2;
    }

    // Round to nearest 15 minutes and cap between 15 and 480 minutes (8 hours)
    baseDuration = Math.round(baseDuration / 15) * 15;
    return Math.max(15, Math.min(480, baseDuration));
}

/**
 * Simple HTML tag stripper for body preview
 */
function stripHtmlTags(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/&amp;/g, '&') // Replace HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
}

/**
 * Map Microsoft task status to our completion status
 */
export function mapTaskStatus(microsoftStatus) {
    switch (microsoftStatus) {
        case 'completed':
            return true;
        case 'notStarted':
        case 'inProgress':
        case 'deferred':
        case 'waitingOnOthers':
        default:
            return false;
    }
}

/**
 * Map Microsoft importance to our priority levels
 */
export function mapTaskPriority(microsoftImportance) {
    switch (microsoftImportance) {
        case 'high':
            return 'high';
        case 'low':
            return 'low';
        case 'normal':
        default:
            return 'medium';
    }
}
