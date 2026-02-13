import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useChatAPI } from '../api/hooks/useChatAPI';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
    const api = useChatAPI();

    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [dailyUsage, setDailyUsage] = useState(null);
    const [error, setError] = useState(null);

    const abortRef = useRef(null);
    const streamingTextRef = useRef('');
    const revealIntervalRef = useRef(null);

    // Chars revealed per tick + tick interval.
    // 3 chars @ 15 ms ≈ 200 chars/sec — matches Claude/GPT mobile pacing.
    const REVEAL_CHUNK = 3;
    const REVEAL_TICK_MS = 10;

    const stopReveal = () => {
        if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
        }
    };

    // ─── Load sidebar list ────────────────────────────────────────────────────

    const loadChats = useCallback(async () => {
        try {
            const res = await api.getChats();
            setChats(res.data?.chats || []);
            return res.data?.chats || [];
        } catch (err) {
            setError(err.message);
            return [];
        }
    }, [api]);

    // ─── Open an existing chat ────────────────────────────────────────────────

    const openChat = useCallback(async (chatId) => {
        try {
            const res = await api.getChat(chatId);
            setActiveChat(res.data.chat);
            setMessages(res.data.messages || []);
            setDailyUsage(res.data.dailyUsage);
            setStreamingText('');
            setIsStreaming(false);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    }, [api]);

    // ─── Create a new chat ────────────────────────────────────────────────────

    const createNewChat = useCallback(async () => {
        try {
            const res = await api.createChat();
            const newChat = res.data.chat;
            setActiveChat(newChat);
            setMessages([]);
            setStreamingText('');
            setIsStreaming(false);
            setError(null);
            setChats(prev => [newChat, ...prev]);
            return newChat;
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, [api]);

    // ─── Send a message ───────────────────────────────────────────────────────

    const sendChatMessage = useCallback(async (text) => {
        if (!activeChat || isStreaming) return;

        // Optimistic user message
        const optimisticMsg = {
            id: `tmp-${Date.now()}`,
            chatId: activeChat.id,
            role: 'user',
            content: text,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setIsStreaming(true);
        setStreamingText('');
        streamingTextRef.current = '';
        setError(null);

        const onEvent = (eventType, data) => {
            if (eventType === 'text_delta') {
                // Accumulate only — display is driven by the reveal animation below,
                // not by individual deltas. This way the experience is consistent
                // whether the server truly streams or buffers the whole response.
                streamingTextRef.current += data.text;

            } else if (eventType === 'message_stop') {
                const fullText = streamingTextRef.current;
                let pos = 0;

                // Start the controlled reveal: advance REVEAL_CHUNK chars every
                // REVEAL_TICK_MS ms so the text appears word-by-word at ~200 chars/sec.
                revealIntervalRef.current = setInterval(() => {
                    pos = Math.min(pos + REVEAL_CHUNK, fullText.length);
                    setStreamingText(fullText.slice(0, pos));

                    if (pos >= fullText.length) {
                        // Reveal complete — finalize as a real message
                        stopReveal();
                        const assistantMsg = {
                            id: `tmp-asst-${Date.now()}`,
                            chatId: activeChat.id,
                            role: 'assistant',
                            content: fullText,
                            createdAt: new Date().toISOString(),
                        };
                        setMessages(prev => [...prev, assistantMsg]);
                        setStreamingText('');
                        setIsStreaming(false);
                        abortRef.current = null;

                        // Bubble chat to top of sidebar
                        setChats(prev => {
                            const without = prev.filter(c => c.id !== activeChat.id);
                            const updated = { ...activeChat, updatedAt: new Date().toISOString() };
                            return [updated, ...without];
                        });

                        if (!activeChat.title) {
                            setActiveChat(prev => prev ? { ...prev, title: text.slice(0, 60) } : prev);
                        }
                    }
                }, REVEAL_TICK_MS);

            } else if (eventType === 'error') {
                stopReveal();
                setError(data.message || 'An error occurred');
                setIsStreaming(false);
                setStreamingText('');
                abortRef.current = null;
            }
        };

        const onDone = () => {
            // message_stop handles cleanup; onDone fires after stream closes.
            // If reveal is still running, let it finish naturally.
            streamingTextRef.current = '';
        };

        const onError = (err) => {
            stopReveal();
            console.error('[Chat] Streaming error:', err);
            setError(err.message || 'Connection error');
            setIsStreaming(false);
            setStreamingText('');
            streamingTextRef.current = '';
            abortRef.current = null;
        };

        const abort = await api.sendMessage(activeChat.id, text, onEvent, onDone, onError);
        abortRef.current = abort;
    }, [activeChat, isStreaming, api]);

    // ─── Delete active chat ───────────────────────────────────────────────────

    const deleteActiveChat = useCallback(async () => {
        if (!activeChat) return;
        try {
            await api.deleteChat(activeChat.id);
            setChats(prev => prev.filter(c => c.id !== activeChat.id));
            setActiveChat(null);
            setMessages([]);
        } catch (err) {
            setError(err.message);
        }
    }, [activeChat, api]);

    // ─── Cancel stream ────────────────────────────────────────────────────────

    const cancelStream = useCallback(() => {
        stopReveal();
        if (abortRef.current) {
            abortRef.current();
            abortRef.current = null;
        }
        setIsStreaming(false);
        setStreamingText('');
        streamingTextRef.current = '';
    }, []);

    return (
        <ChatContext.Provider value={{
            chats,
            activeChat,
            messages,
            isStreaming,
            streamingText,
            dailyUsage,
            error,
            loadChats,
            openChat,
            createNewChat,
            sendChatMessage,
            deleteActiveChat,
            cancelStream,
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChat must be used inside ChatProvider');
    return ctx;
};
