import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
    Animated,
    Easing,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';
import SendIcon from '../../../assets/system-icons/SendIcon.svg';
import VoiceIcon from '../../../assets/system-icons/VoiceIcon.svg';
import { LinearGradient } from 'expo-linear-gradient';
import DailyLimitModal from '../../modals/DailyLimitModal.jsx';

const FREE_LIMIT = 5;

function CancelIcon({ color }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
            />
            <Line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
            />
        </Svg>
    );
}

export default function ChatInput({ onSend, onCancel, isStreaming, dailyUsage }) {
    const [text, setText] = useState('');
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [rowWidth, setRowWidth] = useState(0);
    const [showLimitModal, setShowLimitModal] = useState(false);

    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const isDark = appState.userPreferences.theme !== 'light';

    // Ref so event handlers always see the latest value without closure issues
    const isListeningRef = useRef(false);
    const textRef = useRef('');

    const updateText = (val) => {
        setText(val);
        textRef.current = val;
    };

    const hasText = text.trim().length > 0;

    // ── Icon swap animation (voice ↔ send) ────────────────────────────────────
    const iconProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(iconProgress, {
            toValue: hasText ? 1 : 0,
            useNativeDriver: true,
            tension: 200,
            friction: 12,
        }).start();
        // Auto-deactivate voice fill only when user manually types, not during speech
        if (hasText && isVoiceActive && !isListeningRef.current) {
            animateFill(false);
            setIsVoiceActive(false);
        }
    }, [hasText]);

    // Voice: slides up and fades out when text appears
    const voiceTranslateY = iconProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -36],
    });
    const voiceOpacity = iconProgress.interpolate({
        inputRange: [0, 0.35],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // Send: slides up from below and fades in when text appears
    const sendTranslateY = iconProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [36, 0],
    });
    const sendOpacity = iconProgress.interpolate({
        inputRange: [0.35, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // ── Voice press animation ─────────────────────────────────────────────────
    const fillAnim = useRef(new Animated.Value(0)).current;
    const rotationAnim = useRef(new Animated.Value(0)).current;

    const animateFill = (activate) => {
        Animated.timing(fillAnim, {
            toValue: activate ? 1 : 0,
            duration: activate ? 600 : 450,
            easing: activate
                ? Easing.bezier(0.25, 0.46, 0.45, 0.94)
                : Easing.bezier(0.55, 0.06, 0.68, 0.19),
            useNativeDriver: true,
        }).start();
    };

    const spinButton = () => {
        rotationAnim.setValue(0);
        Animated.timing(rotationAnim, {
            toValue: 0.5,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    // Fill slides from the right
    const fillTranslateX = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [rowWidth, 0],
    });

    // VoiceIcon rotates counterclockwise on each press
    const voiceRotate = rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'],
    });

    // ── Speech recognition events ─────────────────────────────────────────────

    useSpeechRecognitionEvent('start', () => {
        isListeningRef.current = true;
        setIsListening(true);
    });

    useSpeechRecognitionEvent('result', (event) => {
        const transcript = event.results[0]?.transcript ?? '';
        updateText(transcript);
    });

    useSpeechRecognitionEvent('end', () => {
        isListeningRef.current = false;
        setIsListening(false);
        setIsVoiceActive(false);
        animateFill(false);
    });

    useSpeechRecognitionEvent('error', (event) => {
        console.warn('Speech recognition error:', event.error, event.message);
        isListeningRef.current = false;
        setIsListening(false);
        setIsVoiceActive(false);
        animateFill(false);
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleVoicePress = async () => {
        if (isListening) {
            // Stop ongoing recognition — 'end' event handles cleanup
            ExpoSpeechRecognitionModule.stop();
            return;
        }

        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            console.warn('Microphone/speech permission not granted');
            return;
        }

        spinButton();
        setIsVoiceActive(true);
        animateFill(true);
        updateText('');

        ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
            continuous: false,
        });
    };

    const canSend = hasText && !isStreaming;

    const handleSend = () => {
        if (!canSend) return;
        if (remaining !== null && remaining <= 0) {
            setShowLimitModal(true);
            return;
        }
        const msg = text.trim();
        updateText('');
        onSend(msg);
    };

    const handlePress = isStreaming ? onCancel : hasText ? handleSend : handleVoicePress;

    const remaining = dailyUsage ? Math.max(0, FREE_LIMIT - (dailyUsage.messageCount || 0)) : null;

    // ── Placeholder text ──────────────────────────────────────────────────────
    const placeholder = isListening && !hasText
        ? 'Listening...'
        : !isVoiceActive
          ? 'Ask about your schedule...'
          : '';

    return (
        <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
            <DailyLimitModal
                isVisible={showLimitModal}
                onClose={() => setShowLimitModal(false)}
            />

            {remaining !== null && remaining <= FREE_LIMIT && (
                <Text
                    style={[
                        styles.limitText,
                        { color: remaining <= 1 ? theme.ORANGE : theme.SELECTION },
                    ]}
                >
                    {remaining} of {FREE_LIMIT} messages left today
                </Text>
            )}
            <View
                style={[styles.row, { backgroundColor: theme.INPUT }]}
                onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
            >
                {/* ── Voice fill layer ─────────────────────────────────────────
                    Absolutely fills the row, slides in from the right.
                    borderTopLeftRadius + borderBottomLeftRadius give the wave-
                    front a soft rounded edge as it sweeps left.             */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: theme.GRADIENT_END,
                            borderTopLeftRadius: 48,
                            borderBottomLeftRadius: 48,
                            transform: [{ translateX: fillTranslateX }],
                        },
                    ]}
                />

                <TextInput
                    style={[styles.input, { color: isVoiceActive ? theme.SELECTED_TEXT : theme.FOREGROUND }]}
                    placeholder={placeholder}
                    placeholderTextColor={isListening ? theme.SELECTED_TEXT + '99' : isDark ? '#666' : '#999'}
                    value={text}
                    onChangeText={updateText}
                    multiline
                    maxHeight={100}
                    editable={!isStreaming && !isListening}
                    returnKeyType="send"
                    onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSend}
                />

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handlePress}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[theme.GRADIENT_END, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            StyleSheet.absoluteFill,
                            { alignItems: 'center', justifyContent: 'center' },
                        ]}
                    >
                        {isStreaming ? (
                            <CancelIcon color={theme.SELECTED_TEXT} />
                        ) : (
                            <View style={styles.iconStack}>
                                <Animated.View
                                    style={[
                                        styles.iconAbsolute,
                                        {
                                            opacity: voiceOpacity,
                                            transform: [
                                                { translateY: voiceTranslateY },
                                                { rotate: voiceRotate },
                                            ],
                                        },
                                    ]}
                                >
                                    <VoiceIcon color={theme.SELECTED_TEXT} width={24} height={24} />
                                </Animated.View>
                                <Animated.View
                                    style={[
                                        styles.iconAbsolute,
                                        {
                                            opacity: sendOpacity,
                                            transform: [{ translateY: sendTranslateY }],
                                        },
                                    ]}
                                >
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
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
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
        minHeight: 36,
        marginLeft: 8,
        backgroundColor: 'transparent',
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
