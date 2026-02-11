/**
 * Preferences API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const getPreferences = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/preferences');

export const updatePreferences = (makeAuthenticatedRequest, data) =>
    makeAuthenticatedRequest('/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
