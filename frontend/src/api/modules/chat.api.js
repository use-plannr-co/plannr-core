// List all chats (sidebar)
export const getChats = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/chat/chats');

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
export const sendMessage = (makeStreamingRequest, chatId, message, onEvent, onDone, onError) =>
    makeStreamingRequest(
        `/api/chat/chats/${chatId}/messages`,
        { method: 'POST', body: JSON.stringify({ message }) },
        onEvent,
        onDone,
        onError,
    );
