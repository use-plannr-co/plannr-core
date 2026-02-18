import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    View,
    Pressable,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Text,
} from 'react-native';
import { spacing } from '../design/spacing.js';
import { useAppState } from '../context/AppStateContext.js';
import { typography } from '../design/typography.js';
import Google from '../../assets/auth/Google.svg';
import Apple from '../../assets/auth/Apple.svg';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.4;

const SPACE =
    SCREEN_HEIGHT > 900
        ? spacing.SPACING_4
        : SCREEN_HEIGHT > 800
          ? spacing.SPACING_3
          : spacing.SPACING_2;

const ExportCalendarBottomSheet = forwardRef(({ onExportGoogle, onExportApple, theme }, ref) => {
    const { appState } = useAppState();
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                const newY = Math.max(0, gestureState.dy);
                translateY.setValue(newY);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 80) {
                    hide();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        }),
    ).current;

    const show = () => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleGoogleExport = () => {
        hide();
        onExportGoogle();
    };

    const handleAppleExport = () => {
        hide();
        onExportApple();
    };

    useImperativeHandle(ref, () => ({
        show,
        hide,
    }));

    return (
        <>
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#000000' + '99',
                    opacity: backdropOpacity,
                }}
            >
                <Pressable style={{ flex: 1 }} onPress={hide} />
            </Animated.View>

            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transform: [{ translateY }],
                    backgroundColor: theme.BACKGROUND,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingBottom: 16,
                    paddingHorizontal: 16,
                    maxHeight: MAX_TRANSLATE_Y,
                }}
            >
                <View
                    {...panResponder.panHandlers}
                    style={{
                        width: '100%',
                        alignItems: 'center',
                        paddingVertical: 10,
                    }}
                >
                    <View
                        style={{
                            height: 8,
                            width: 40,
                            backgroundColor: theme.INPUT,
                            marginBottom: SPACE,
                            alignSelf: 'center',
                            borderRadius: 12,
                        }}
                    />
                    <Text
                        style={{
                            fontSize: typography.headingSize,
                            fontFamily: 'AlbertSans',
                            color: theme.FOREGROUND,
                            marginBottom: SPACE,
                            alignSelf: 'center',
                        }}
                    >
                        Export Schedule
                    </Text>
                    <Text
                        style={{
                            fontSize: typography.bodySize,
                            fontFamily: 'AlbertSans',
                            color: theme.FOREGROUND,
                            marginBottom: SPACE * 2,
                            alignSelf: 'center',
                        }}
                    >
                        Choose where to export your schedule
                    </Text>
                </View>

                <ScrollView style={{ borderRadius: 12 }}>
                    {/* Google Calendar Option */}
                    <TouchableOpacity
                        style={{ ...styles.button, backgroundColor: theme.INPUT }}
                        onPress={handleGoogleExport}
                    >
                        <View style={styles.optionContent}>
                            <View style={styles.iconContainer}>
                                <Google width={24} height={24} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.optionTitle, { color: theme.FOREGROUND }]}>
                                    Google Calendar
                                </Text>
                                <Text
                                    style={[styles.optionDescription, { color: theme.FOREGROUND }]}
                                >
                                    Export to your Google Calendar
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Apple Calendar Option */}
                    <TouchableOpacity
                        style={{ ...styles.button, backgroundColor: theme.INPUT }}
                        onPress={handleAppleExport}
                    >
                        <View style={styles.optionContent}>
                            <View style={styles.iconContainer}>
                                <Apple width={24} height={24} color={'#000000'} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.optionTitle, { color: theme.FOREGROUND }]}>
                                    Apple Calendar
                                </Text>
                                <Text
                                    style={[styles.optionDescription, { color: theme.FOREGROUND }]}
                                >
                                    Export to your device calendar
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </>
    );
});

const styles = StyleSheet.create({
    button: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACE,
    },
    textContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'AlbertSans',
        lineHeight: 16,
    },
});

export default ExportCalendarBottomSheet;
