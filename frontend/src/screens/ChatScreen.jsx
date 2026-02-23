/**
 * ChatScreen
 *
 * How streaming works:
 *   ChatContext exposes `isStreaming` + `streamingText` (throttled ~50 ms).
 *   While streaming, a synthetic message with `status: 'streaming'` is appended
 *   to `displayMessages`. ChatBubble renders it as plain Text while streaming
 *   and switches to Markdown once the status is gone (stream complete).
 *
 * How Markdown is themed:
 *   ChatBubble.buildMarkdownStyles() returns a style map keyed by Markdown token
 *   type. It is memoized per theme/dark-mode so it doesn't recreate on every render.
 *
 * How scroll pinning works:
 *   isAtBottomRef tracks whether the user is within 80 px of the bottom.
 *   New messages / streaming chunks auto-scroll only when isAtBottomRef is true.
 *   If the user scrolls up while streaming, a "Jump to latest" button appears.
 *   Tapping it scrolls to the end and clears the button.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { lightColor, darkColor } from '../design/colors.js';
import { useAppState } from '../context/AppStateContext.js';
import { useChat } from '../context/ChatContext.js';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import ChatBubble from '../components/chat/ChatBubble.jsx';
import ChatInput from '../components/chat/ChatInput.jsx';
import ChatDrawer from '../components/chat/ChatDrawer.jsx';

const SUGGESTIONS = [
    "What's on my schedule today?",
    'Am I running late?',
    'Add a task for me',
    'Reschedule my missed tasks',
];

function ChevronDownIcon({ color }) {
    return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
                d="M6 9L12 15L18 9"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export default function ChatScreen() {
    const navigation = useNavigation();
    const { appState } = useAppState();
    const isDark = appState.userPreferences.theme !== 'light';
    const theme = isDark ? darkColor : lightColor;

    const {
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
    } = useChat();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showJumpButton, setShowJumpButton] = useState(false);

    const flatListRef = useRef(null);
    // Track scroll position without triggering re-renders
    const isAtBottomRef = useRef(true);

    // ─── Init ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        const init = async () => {
            const chatList = await loadChats();
            if (chatList.length > 0) {
                await openChat(chatList[0].id);
            } else {
                await createNewChat();
            }
        };
        init();
    }, []);

    // ─── Scroll helpers ───────────────────────────────────────────────────────

    const scrollToBottom = useCallback((animated = true) => {
        flatListRef.current?.scrollToEnd({ animated });
        setShowJumpButton(false);
        isAtBottomRef.current = true;
    }, []);

    const handleScroll = useCallback(
        (event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
            const atBottom = distFromBottom < 80;
            isAtBottomRef.current = atBottom;
            if (atBottom && showJumpButton) setShowJumpButton(false);
        },
        [showJumpButton],
    );

    // Auto-scroll when a new completed message arrives (always if at bottom)
    useEffect(() => {
        if (messages.length === 0) return;
        if (isAtBottomRef.current) {
            // Small delay lets the list measure the new item first
            setTimeout(() => scrollToBottom(true), 50);
        }
    }, [messages.length]);

    // Auto-scroll or show jump button during streaming
    useEffect(() => {
        if (!isStreaming) return;
        if (isAtBottomRef.current) {
            flatListRef.current?.scrollToEnd({ animated: false });
        } else {
            setShowJumpButton(true);
        }
    }, [streamingText, isStreaming]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleSelectChat = async (chatId) => {
        setDrawerOpen(false);
        await openChat(chatId);
    };

    const handleNewChat = async () => {
        setDrawerOpen(false);
        await createNewChat();
    };

    const handleDeleteChat = async (chatId) => {
        if (activeChat?.id === chatId) {
            await deleteActiveChat();
            const remaining = chats.filter((c) => c.id !== chatId);
            if (remaining.length > 0) {
                await openChat(remaining[0].id);
            } else {
                await createNewChat();
            }
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    // Only pass isStreaming to the live streaming row — all other rows are memo-stable
    const renderItem = useCallback(({ item }) => <ChatBubble message={item} />, []);

    // Synthetic streaming message appended while stream is active.
    // status: 'streaming' tells ChatBubble to render as plain Text (no Markdown).
    const displayMessages = isStreaming
        ? [
              ...messages,
              {
                  id: '__streaming__',
                  role: 'assistant',
                  content: streamingText || '',
                  status: 'streaming',
              },
          ]
        : messages;

    const imageSource =
        theme === darkColor
            ? require('../../assets/planova/planova-chat-dark.png')
            : require('../../assets/planova/planova-chat-light.png');

    return (
        <View style={[styles.screen, { backgroundColor: theme.BACKGROUND }]}>
            <ChatHeader
                onBack={() => navigation.goBack()}
                onOpenDrawer={() => setDrawerOpen(true)}
                onNewChat={handleNewChat}
            />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {displayMessages.length === 0 && !isStreaming && (
                    <View style={styles.emptyState}>
                        <Image source={imageSource} style={styles.emptyImage} />
                        <Text style={[styles.emptyTitle, { color: theme.FOREGROUND }]}>
                            How can I help you plan today?
                        </Text>
                        <View style={styles.suggestionsWrap}>
                            {SUGGESTIONS.map((text) => (
                                <TouchableOpacity
                                    key={text}
                                    style={[
                                        styles.suggestionChip,
                                        { backgroundColor: theme.COMP_COLOR, borderColor: theme.INPUT, borderWidth: 1.3 },
                                    ]}
                                    onPress={() => sendChatMessage(text)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.suggestionText,
                                            { color: theme.FOREGROUND },
                                        ]}
                                    >
                                        {text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                <FlatList
                    ref={flatListRef}
                    data={displayMessages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={100}
                    // Let scroll pinning logic handle scrolling; don't auto-scroll on content size change
                    // (that would fight the user's scroll position)
                />

                {/* Jump-to-latest button — appears when user has scrolled up during streaming */}
                {showJumpButton && (
                    <TouchableOpacity
                        style={[styles.jumpBtn, { backgroundColor: theme.BUTTON }]}
                        onPress={() => scrollToBottom(true)}
                        activeOpacity={0.85}
                    >
                        <ChevronDownIcon color={theme.SELECTED_TEXT} />
                        <Text style={[styles.jumpBtnText, { color: theme.SELECTED_TEXT }]}>
                            Jump to latest
                        </Text>
                    </TouchableOpacity>
                )}

                {error ? (
                    <Text style={[styles.errorBanner, { color: theme.RED || '#FF3B30' }]}>
                        {error}
                    </Text>
                ) : null}

                <ChatInput
                    onSend={sendChatMessage}
                    onCancel={cancelStream}
                    isStreaming={isStreaming}
                    dailyUsage={dailyUsage}
                />
            </KeyboardAvoidingView>

            <ChatDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                chats={chats}
                activeChat={activeChat}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingBottom: 16,
    },
    flex: {
        flex: 1,
    },
    messageList: {
        paddingTop: 8,
        paddingBottom: 16,
    },
    jumpBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginBottom: 4,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    jumpBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    errorBanner: {
        textAlign: 'center',
        fontSize: 13,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 24,
        alignSelf: 'center',
    },
    emptyImage: {
        width: 200,
        height: 200,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: 'Albert Sans',
        marginBottom: 64,
    },
    suggestionsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: 20,
        gap: 8,
    },
    suggestionChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
    },
    suggestionText: {
        fontSize: 14,
    },
});
