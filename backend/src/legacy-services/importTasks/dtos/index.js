/**
 * Data Transfer Objects for Import Tasks module
 */

export class TaskDraftDTO {
    constructor({
        sourceProvider,
        sourceTaskId,
        sourceListId,
        title,
        notes,
        deadline,
        preferredStart,
        priority,
        estimatedDurationMinutes,
        isIncluded = true,
        warnings = [],
    }) {
        this.sourceProvider = sourceProvider;
        this.sourceTaskId = sourceTaskId;
        this.sourceListId = sourceListId;
        this.title = title;
        this.notes = notes;
        this.deadline = deadline; // ISO string or null
        this.preferredStart = preferredStart; // ISO string or null
        this.priority = priority; // 'LOW'|'MEDIUM'|'HIGH'
        this.estimatedDurationMinutes = estimatedDurationMinutes;
        this.isIncluded = isIncluded;
        this.warnings = warnings; // Array of warning strings
    }
}

export class TaskListDTO {
    constructor({ id, displayName, isDefaultList, wellknownListName }) {
        this.id = id;
        this.displayName = displayName;
        this.isDefaultList = isDefaultList;
        this.wellknownListName = wellknownListName;
    }
}

export class CalendarEventDTO {
    constructor({ id, subject, startDateTime, endDateTime, isAllDay, showAs, location }) {
        this.id = id;
        this.subject = subject;
        this.startDateTime = startDateTime; // ISO string
        this.endDateTime = endDateTime; // ISO string
        this.isAllDay = isAllDay;
        this.showAs = showAs; // 'free'|'tentative'|'busy'|'oof'|'workingElsewhere'
        this.location = location;
    }
}

export class ImportSessionDTO {
    constructor({
        id,
        userId,
        provider,
        dateRangeStart,
        dateRangeEnd,
        selectedListIds,
        status,
        scheduleId,
        createdAt,
        updatedAt,
    }) {
        this.id = id;
        this.userId = userId;
        this.provider = provider;
        this.dateRangeStart = dateRangeStart;
        this.dateRangeEnd = dateRangeEnd;
        this.selectedListIds = selectedListIds;
        this.status = status;
        this.scheduleId = scheduleId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

export class EnrichmentRequestDTO {
    constructor({ defaults = {}, overrides = [] }) {
        this.defaults = {
            defaultDurationMinutes: defaults.defaultDurationMinutes || 60,
            defaultPriority: defaults.defaultPriority || 'MEDIUM',
            ...defaults,
        };
        this.overrides = overrides; // Array of { sourceTaskId, duration?, priority?, isIncluded?, deadline?, preferredStart? }
    }
}
