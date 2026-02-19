/**
 * Analytics API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const getAnalytics = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/analytics');

export const submitMoodCheckin = (makeAuthenticatedRequest, date, rating) =>
    makeAuthenticatedRequest('/api/analytics/mood', {
        method: 'POST',
        body: JSON.stringify({ date, rating }),
    });
