/**
 * Days API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const getDaysByScheduleId = (makeAuthenticatedRequest, scheduleId) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`);

export const createDay = (makeAuthenticatedRequest, scheduleId, dayData) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`, {
        method: 'POST',
        body: JSON.stringify(dayData),
    });

export const getDayById = (makeAuthenticatedRequest, scheduleId, dayId, includeBlocks = false) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}${includeBlocks ? '?includeBlocks=true' : ''}`);

export const updateDay = (makeAuthenticatedRequest, scheduleId, dayId, data) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteDay = (makeAuthenticatedRequest, scheduleId, dayId) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}`, {
        method: 'DELETE',
    });
