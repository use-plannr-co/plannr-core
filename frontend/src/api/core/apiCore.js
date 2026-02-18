import { apiClient } from '../../utils/apiClient';

// Global update handler - will be set by the context
let globalUpdateHandler = null;

export const setGlobalUpdateHandler = (handler) => {
    globalUpdateHandler = handler;
};

/**
 * makeStreamingRequest
 *
 * Like makeAuthenticatedRequest but reads the response body as an SSE stream.
 * Returns an abort function.
 *
 * @param {Function} getToken
 * @param {string|null} userId
 * @param {string} endpoint
 * @param {Object} options - fetch options (method, body, headers)
 * @param {Function} onEvent - (eventType: string, data: object) => void
 * @param {Function} [onDone] - called when stream ends
 * @param {Function} [onError] - called on error
 * @returns {Function} abort — call to cancel the in-flight request
 */
export const makeStreamingRequest = async (
    getToken,
    userId,
    endpoint,
    options = {},
    onEvent,
    onDone,
    onError,
) => {
    const controller = new AbortController();

    // Internal helper — makes the HTTP request with a given auth token.
    // Returns the Response on success, or throws on non-429/non-retryable errors.
    const doRequest = async (authToken, clerkUserId, allowDevRetry) => {
        const response = await apiClient.makeRequest(
            endpoint,
            {
                ...options,
                headers: {
                    'x-clerk-user-id': clerkUserId,
                    ...options.headers,
                },
                signal: controller.signal,
            },
            authToken,
        );

        if (!response.ok) {
            // Dev-only 401 retry with dev token (mirrors makeAuthenticatedRequest behaviour)
            if (response.status === 401 && allowDevRetry && __DEV__) {
                return doRequest(
                    'dev:frontend-user-123:frontend-dev@plannr.app',
                    'dev-user-id',
                    false,
                );
            }
            const errorText = await response.text();
            let parsed;
            try {
                parsed = JSON.parse(errorText);
            } catch (_) {}
            if (response.status === 429) {
                const err = new Error(parsed?.message || 'Rate limit exceeded');
                err.code = parsed?.error;
                throw err;
            }
            throw new Error(parsed?.message || `HTTP ${response.status}`);
        }

        return response;
    };

    try {
        const token = await getToken();
        const authToken =
            token || (__DEV__ ? 'dev:frontend-user-123:frontend-dev@plannr.app' : null);
        if (!authToken) {
            onError?.(new Error('Authentication required.'));
            return () => {};
        }

        // allowDevRetry = true only when we started with a real Clerk token that might fail
        const allowDevRetry = !!(token && __DEV__);
        const response = await doRequest(
            authToken,
            userId || (__DEV__ ? 'dev-user-id' : null),
            allowDevRetry,
        );

        // Parse SSE events from a raw text block (used for both buffered and streamed responses)
        const parseSSEText = (text) => {
            const lines = text.split('\n');
            let currentEvent = null;
            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    currentEvent = line.slice(7).trim();
                } else if (line.startsWith('data: ') && currentEvent) {
                    try {
                        onEvent(currentEvent, JSON.parse(line.slice(6)));
                    } catch (_) {}
                    currentEvent = null;
                }
            }
        };

        if (!response.body) {
            // React Native sometimes doesn't expose response.body — fall back to reading
            // the entire response as text (no incremental streaming, but functionally correct)
            const text = await response.text();
            parseSSEText(text);
            onDone?.();
        } else {
            // True ReadableStream path (works on newer RN / web)
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            onDone?.();
                            break;
                        }
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // keep incomplete last line
                        parseSSEText(lines.join('\n'));
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') onError?.(err);
                }
            })();
        }
    } catch (err) {
        if (err.name !== 'AbortError') onError?.(err);
    }

    return () => controller.abort();
};

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

        const response = await apiClient.makeRequest(
            endpoint,
            {
                ...options,
                headers: {
                    'x-clerk-user-id': userId || (__DEV__ ? 'dev-user-id' : null),
                    ...options.headers,
                },
            },
            authToken,
        );

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

                const retryResponse = await apiClient.makeRequest(
                    endpoint,
                    {
                        ...options,
                        headers: {
                            'x-clerk-user-id': 'dev-user-id',
                            ...options.headers,
                        },
                    },
                    'dev:frontend-user-123:frontend-dev@plannr.app',
                );

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
                if (
                    parsedError.error === 'GOOGLE_ACCOUNT_REAUTH_NEEDED' ||
                    parsedError.error === 'GOOGLE_ACCOUNT_NOT_FOUND'
                ) {
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
                        rateLimitError = new Error(
                            'TOO_MANY_REQUESTS: Text-to-tasks rate limit exceeded',
                        );
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
