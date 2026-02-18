/**
 * Blocks API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const getBlocksByDayId = (makeAuthenticatedRequest, scheduleId, dayId) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks`);

export const addBlocksToDay = (makeAuthenticatedRequest, scheduleId, dayId, blocks) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks`, {
        method: 'POST',
        body: JSON.stringify({ blocks }),
    });

export const updateBlockInDay = (makeAuthenticatedRequest, scheduleId, dayId, blockId, data) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks/${blockId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteBlockFromDay = (makeAuthenticatedRequest, scheduleId, dayId, blockId) =>
    makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks/${blockId}`, {
        method: 'DELETE',
    });

export const markBlockCompleteInDay = (
    makeAuthenticatedRequest,
    scheduleId,
    dayId,
    blockId,
    completed = true,
) =>
    makeAuthenticatedRequest(
        `/api/schedules/${scheduleId}/days/${dayId}/blocks/${blockId}/complete`,
        {
            method: 'PATCH',
            body: JSON.stringify({ completed }),
        },
    );
