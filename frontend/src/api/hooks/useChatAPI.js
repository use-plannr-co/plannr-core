import { useApiCore } from '../core/useApiCore.js';
import * as chatApi from '../modules/chat.api.js';

export const useChatAPI = () => {
    const { makeAuthenticatedRequest, makeStreamingRequest } = useApiCore();

    return {
        getChats: () =>
            chatApi.getChats(makeAuthenticatedRequest),
        createChat: (title) =>
            chatApi.createChat(makeAuthenticatedRequest, title),
        getChat: (chatId) =>
            chatApi.getChat(makeAuthenticatedRequest, chatId),
        deleteChat: (chatId) =>
            chatApi.deleteChat(makeAuthenticatedRequest, chatId),
        sendMessage: (chatId, message, onEvent, onDone, onError) =>
            chatApi.sendMessage(makeStreamingRequest, chatId, message, onEvent, onDone, onError),
    };
};
