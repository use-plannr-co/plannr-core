/**
 * Event Dependencies API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const saveEventDependencies = async (
    makeAuthenticatedRequest,
    scheduleId,
    dependenciesMap,
) => {
    const response = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ dependenciesMap }),
    });
    return response.data;
};

export const updateEventDependencies = async (
    makeAuthenticatedRequest,
    scheduleId,
    dependenciesId,
    dependenciesMap,
) => {
    const response = await makeAuthenticatedRequest(
        `/api/schedules/${scheduleId}/dependencies/${dependenciesId}`,
        {
            method: 'PUT',
            body: JSON.stringify({ dependenciesMap }),
        },
    );
    return response.data;
};

export const getEventDependencies = async (makeAuthenticatedRequest, scheduleId) => {
    const response = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`);
    return response.data;
};
