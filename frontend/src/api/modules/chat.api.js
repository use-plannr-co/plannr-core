// List all chats (sidebar)
export const getChats = (makeAuthenticatedRequest) => makeAuthenticatedRequest('/api/chat/chats');

// Create a new chat
export const createChat = (makeAuthenticatedRequest, title) =>
    makeAuthenticatedRequest('/api/chat/chats', {
        method: 'POST',
        body: JSON.stringify({ title }),
    });

// Get a chat with its messages and daily usage
export const getChat = (makeAuthenticatedRequest, chatId) =>
    makeAuthenticatedRequest(`/api/chat/chats/${chatId}`);

// Delete a chat
export const deleteChat = (makeAuthenticatedRequest, chatId) =>
    makeAuthenticatedRequest(`/api/chat/chats/${chatId}`, { method: 'DELETE' });

/**
 * Send a message (SSE stream).
 * Returns a Promise<abortFn>.
 */
export const sendMessage = (makeStreamingRequest, chatId, message, onEvent, onDone, onError) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return makeStreamingRequest(
        `/api/chat/chats/${chatId}/messages`,
        { method: 'POST', body: JSON.stringify({ message, timezone }) },
        onEvent,
        onDone,
        onError,
    );
};

/**
 * Submit the result of a confirmed action (SSE stream).
 * Triggers Claude's confirmation response without incrementing daily usage.
 */
export const submitActionResult = (
    makeStreamingRequest,
    chatId,
    actionType,
    summary,
    onEvent,
    onDone,
    onError,
) =>
    makeStreamingRequest(
        `/api/chat/chats/${chatId}/action-result`,
        { method: 'POST', body: JSON.stringify({ actionType, summary }) },
        onEvent,
        onDone,
        onError,
    );
