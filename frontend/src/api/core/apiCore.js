import { apiClient } from '../../utils/apiClient';

// Global update handler - will be set by the context
let globalUpdateHandler = null;

export const setGlobalUpdateHandler = (handler) => {
    globalUpdateHandler = handler;
};

/**
 * Core authenticated request function.
 * Accepts Clerk auth context (getToken, userId) as dependencies so it can be
 * used both inside and outside React hooks.
 *
 * @param {Function} getToken - Clerk getToken function
 * @param {string|null} userId - Clerk userId
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - fetch options
 * @returns {Promise<Object>} Parsed JSON response
 */
export const makeAuthenticatedRequest = async (getToken, userId, endpoint, options = {}) => {
    try {
        const token = await getToken();

        let authToken = token;

        if (!token) {
            if (__DEV__) {
                console.log('🔧 No Clerk token available, using development auth');
                authToken = 'dev:frontend-user-123:frontend-dev@plannr.app';
            } else {
                throw new Error('Authentication required. Please sign in to continue.');
            }
        }

        const response = await apiClient.makeRequest(endpoint, {
            ...options,
            headers: {
                'x-clerk-user-id': userId || (__DEV__ ? 'dev-user-id' : null),
                ...options.headers,
            },
        }, authToken);

        // Check if response indicates update requirement
        const updateCheck = await apiClient.checkForUpdateRequirement(response.clone());
        if (updateCheck.updateRequired && globalUpdateHandler) {
            globalUpdateHandler(updateCheck.updateInfo);
            throw new Error(`APP_UPDATE_REQUIRED: ${updateCheck.updateInfo.message}`);
        }

        if (!response.ok) {
            const errorData = await response.text();
            console.error('API Error Response:', errorData);

            let parsedError = null;
            try {
                parsedError = JSON.parse(errorData);
            } catch (_) {
                // continue with text error handling
            }

            // Dev-only 401 retry with dev token
            if (response.status === 401 && token && authToken === token && __DEV__) {
                console.log('🔧 Clerk token failed with 401, retrying with development auth');

                const retryResponse = await apiClient.makeRequest(endpoint, {
                    ...options,
                    headers: {
                        'x-clerk-user-id': 'dev-user-id',
                        ...options.headers,
                    },
                }, 'dev:frontend-user-123:frontend-dev@plannr.app');

                if (!retryResponse.ok) {
                    const retryErrorData = await retryResponse.text();
                    console.error('Development auth also failed:', retryErrorData);
                    throw new Error('Authentication failed. Please try signing out and back in.');
                }

                console.log('✅ Development auth retry successful');
                return await retryResponse.json();
            }

            // Handle specific error codes from backend
            if (parsedError && parsedError.error) {
                if (parsedError.error === 'GOOGLE_ACCOUNT_REAUTH_NEEDED' || parsedError.error === 'GOOGLE_ACCOUNT_NOT_FOUND') {
                    const specificError = new Error(parsedError.error);
                    specificError.message = parsedError.message || specificError.message;
                    specificError.errorCode = parsedError.error;
                    throw specificError;
                }
            }

            if (response.status === 401) {
                throw new Error('Authentication failed. Please sign out and back in.');
            } else if (response.status === 429) {
                let rateLimitError;
                try {
                    const errorJson = JSON.parse(errorData);
                    if (errorJson.message?.includes('text-to-tasks')) {
                        rateLimitError = new Error('TOO_MANY_REQUESTS: Text-to-tasks rate limit exceeded');
                    } else {
                        rateLimitError = new Error('TOO_MANY_REQUESTS: Rate limit exceeded');
                    }
                    rateLimitError.retryAfter = errorJson.retryAfter;
                    rateLimitError.resetTime = errorJson.resetTime;
                } catch {
                    rateLimitError = new Error('TOO_MANY_REQUESTS: Rate limit exceeded');
                }
                throw rateLimitError;
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else if (response.status >= 400) {
                throw new Error('Request failed. Please check your input and try again.');
            } else {
                throw new Error('Network error. Please check your connection and try again.');
            }
        }

        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
};
