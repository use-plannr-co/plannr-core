import React, { useState, useRef, useEffect } from 'react';
import {
    View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, Animated,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';
import SendIcon from '../../../assets/system-icons/SendIcon.svg';
import VoiceIcon from '../../../assets/system-icons/VoiceIcon.svg';
import { LinearGradient } from 'expo-linear-gradient';

const FREE_LIMIT = 5;

function CancelIcon({ color }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
            <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

export default function ChatInput({ onSend, onCancel, isStreaming, dailyUsage }) {
    const [text, setText] = useState('');
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const isDark = appState.userPreferences.theme !== 'light';

    const hasText = text.trim().length > 0;

    // 0 = voice centred (no text), 1 = send centred (has text)
    const iconProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(iconProgress, {
            toValue: hasText ? 1 : 0,
            useNativeDriver: true,
            tension: 200,
            friction: 12,
        }).start();
    }, [hasText]);

    // Voice: centred → slides up & fades out as text is typed
    const voiceTranslateY = iconProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -36],
    });
    const voiceOpacity = iconProgress.interpolate({
        inputRange: [0, 0.35],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // Send: slides up from below → centred as text is typed
    const sendTranslateY = iconProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [36, 0],
    });
    const sendOpacity = iconProgress.interpolate({
        inputRange: [0.35, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const canSend = hasText && !isStreaming;

    const handleSend = () => {
        if (!canSend) return;
        const msg = text.trim();
        setText('');
        onSend(msg);
    };

    const remaining = dailyUsage
        ? Math.max(0, FREE_LIMIT - (dailyUsage.messageCount || 0))
        : null;

    return (
        <View style={[styles.container, { backgroundColor: theme.COMP_COLOR, borderTopColor: isDark ? '#333' : '#E0E0E0' }]}>
            {remaining !== null && remaining <= FREE_LIMIT && (
                <Text style={[styles.limitText, { color: remaining <= 1 ? theme.ORANGE : theme.SELECTION }]}>
                    {remaining} of {FREE_LIMIT} messages left today
                </Text>
            )}
            <View style={[styles.row, { backgroundColor: theme.INPUT }]}>
                <TextInput
                    style={[styles.input, { color: theme.FOREGROUND }]}
                    placeholder="Ask about your schedule..."
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxHeight={100}
                    editable={!isStreaming}
                    returnKeyType="send"
                    onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSend}
                />
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isStreaming ? theme.SELECTION : theme.BUTTON }]}
                    onPress={isStreaming ? onCancel : handleSend}
                    disabled={!isStreaming && !canSend}
                >
                    <LinearGradient
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
                    >
                        {isStreaming ? (
                            <CancelIcon color={theme.SELECTED_TEXT} />
                        ) : (
                            <View style={styles.iconStack}>
                                <Animated.View style={[
                                    styles.iconAbsolute,
                                    { opacity: voiceOpacity, transform: [{ translateY: voiceTranslateY }] },
                                ]}>
                                    <VoiceIcon color={theme.SELECTED_TEXT} width={24} height={24} />
                                </Animated.View>
                                <Animated.View style={[
                                    styles.iconAbsolute,
                                    { opacity: sendOpacity, transform: [{ translateY: sendTranslateY }] },
                                ]}>
                                    <SendIcon color={theme.SELECTED_TEXT} width={24} height={24} />
                                </Animated.View>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    limitText: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 48,
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
        minHeight: 36,
        marginLeft: 8,
    },
    actionBtn: {
        width: 48,
        height: 48,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    iconStack: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconAbsolute: {
        position: 'absolute',
    },
});
