/**
 * ChatBubble (MessageRow)
 *
 * ChatGPT-style "document" layout — no bubble containers, full-width blocks.
 *
 * Markdown strategy:
 *   message.status === 'streaming'  → plain <Text> only (fast, no parse jank)
 *   message.status !== 'streaming'  → react-native-markdown-display (full render)
 *
 * This prevents layout thrashing while tokens arrive. The switch to Markdown
 * happens exactly once, when the stream completes and status is cleared.
 */
import React, { memo, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Linking, Animated } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';
import ChatTypingIndicator from './ChatTypingIndicator.jsx';

const SCREEN_PADDING = 20;

// Built outside component so useMemo has stable reference.
function buildMarkdownStyles(theme, isDark) {
    const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
    const codeBg = isDark ? '#1A1A1A' : '#F4F4F4';
    const border = isDark ? '#333333' : '#E0E0E0';
    const linkColor = isDark ? '#AA66FF' : '#7700EE';

    return {
        body: { color: theme.FOREGROUND, fontSize: 16, lineHeight: 26 },

        // Headings
        heading1: { fontSize: 22, fontWeight: '700', color: theme.FOREGROUND, marginTop: 20, marginBottom: 8 },
        heading2: { fontSize: 19, fontWeight: '700', color: theme.FOREGROUND, marginTop: 16, marginBottom: 6 },
        heading3: { fontSize: 17, fontWeight: '600', color: theme.FOREGROUND, marginTop: 14, marginBottom: 4 },

        // Paragraphs
        paragraph: { marginTop: 0, marginBottom: 12 },

        // Lists
        bullet_list: { marginBottom: 8 },
        ordered_list: { marginBottom: 8 },
        list_item: { marginBottom: 3 },
        bullet_list_icon: { color: isDark ? '#888' : '#666', marginTop: 8, fontSize: 16 },
        ordered_list_icon: { color: isDark ? '#888' : '#666', marginTop: 2, fontSize: 15 },

        // Blockquote
        blockquote: {
            borderLeftWidth: 3,
            borderLeftColor: isDark ? '#8844CC' : '#8800FF',
            paddingLeft: 14,
            marginLeft: 0,
            marginVertical: 8,
        },

        // Inline code
        code_inline: {
            backgroundColor: codeBg,
            color: isDark ? '#E8E8E8' : '#333',
            borderRadius: 4,
            paddingHorizontal: 5,
            paddingVertical: 1,
            fontFamily: mono,
            fontSize: 13,
        },

        // Fenced + indented code blocks
        fence: {
            backgroundColor: codeBg,
            borderRadius: 8,
            padding: 14,
            marginVertical: 10,
            fontFamily: mono,
            fontSize: 13,
            lineHeight: 20,
            color: isDark ? '#E8E8E8' : '#333',
            borderWidth: 1,
            borderColor: border,
        },
        code_block: {
            backgroundColor: codeBg,
            borderRadius: 8,
            padding: 14,
            marginVertical: 10,
            fontFamily: mono,
            fontSize: 13,
            lineHeight: 20,
            color: isDark ? '#E8E8E8' : '#333',
            borderWidth: 1,
            borderColor: border,
        },

        // Links
        link: { color: linkColor, textDecorationLine: 'underline' },

        // Inline styles
        strong: { fontWeight: '700' },
        em: { fontStyle: 'italic' },
        s: { textDecorationLine: 'line-through' },

        // Horizontal rule
        hr: { backgroundColor: border, height: 1, marginVertical: 16 },

        // Tables
        table: { borderWidth: 1, borderColor: border, borderRadius: 6, marginVertical: 10 },
        th: { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', padding: 10, fontWeight: '700', color: theme.FOREGROUND },
        td: { padding: 10, borderTopWidth: 1, borderTopColor: border, color: theme.FOREGROUND },
    };
}

function BlinkingCursor({ color }) {
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0, duration: 530, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 530, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [opacity]);

    return (
        <Animated.Text style={{ color, opacity, fontSize: 16, lineHeight: 26 }}>
            {' ▌'}
        </Animated.Text>
    );
}

function ChatBubble({ message }) {
    const { appState } = useAppState();
    const isDark = appState.userPreferences.theme !== 'light';
    const theme = isDark ? darkColor : lightColor;

    const markdownStyles = useMemo(() => buildMarkdownStyles(theme, isDark), [theme, isDark]);

    if (!message) return null;

    const { role, content, status } = message;
    const isUser = role === 'user';
    const isStreaming = status === 'streaming';

    // Hide tool-result turns (user messages with no text, only toolResults)
    if (isUser && !content && message.toolResults) return null;

    // ── User message ──────────────────────────────────────────────────────────
    if (isUser) {
        return (
            <View style={styles.userRow}>
                <Text style={[styles.roleLabel, styles.roleLabelUser, { color: isDark ? '#666' : '#999' }]}>
                    You
                </Text>
                <Text style={[styles.userText, { color: theme.FOREGROUND }]}>{content}</Text>
            </View>
        );
    }

    // ── Assistant message ─────────────────────────────────────────────────────
    const showTypingDots = isStreaming && !content;

    return (
        <View style={styles.assistantRow}>
            <Text style={[styles.roleLabel, { color: isDark ? '#888' : '#777' }]}>Planova</Text>

            {showTypingDots ? (
                <View style={styles.typingWrap}>
                    <ChatTypingIndicator color={isDark ? '#888' : '#777'} />
                </View>
            ) : isStreaming ? (
                /*
                 * While streaming: plain Text to avoid Markdown re-parsing on every token.
                 * Switching to Markdown on status change (once, when stream ends) avoids
                 * repeated layout recalculations.
                 * The blinking ▌ cursor signals that more text is coming.
                 */
                <Text style={[styles.streamingText, { color: theme.FOREGROUND }]}>
                    {content}
                    <BlinkingCursor color={isDark ? '#888' : '#999'} />
                </Text>
            ) : (
                <Markdown
                    style={markdownStyles}
                    onLinkPress={(url) => { Linking.openURL(url); return false; }}
                >
                    {content || ''}
                </Markdown>
            )}
        </View>
    );
}

export default memo(ChatBubble);

const styles = StyleSheet.create({
    // ── User ──────────────────────────────────────────────────────────────────
    userRow: {
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: 16,
        paddingBottom: 4,
        alignItems: 'flex-end',
    },
    userText: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'right',
        maxWidth: '90%',
    },

    // ── Assistant ─────────────────────────────────────────────────────────────
    assistantRow: {
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: 16,
        paddingBottom: 4,
    },
    streamingText: {
        fontSize: 16,
        lineHeight: 26,
    },
    typingWrap: {
        marginTop: 6,
    },

    // ── Shared label ──────────────────────────────────────────────────────────
    roleLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    roleLabelUser: {
        alignSelf: 'flex-end',
    },
});
