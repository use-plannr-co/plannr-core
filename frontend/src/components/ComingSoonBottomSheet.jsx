import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    View,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    Text,
    Image,
} from 'react-native';
import { spacing } from '../design/spacing.js';
import { typography } from '../design/typography.js';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.5;

const SPACE =
    SCREEN_HEIGHT > 900
        ? spacing.SPACING_4
        : SCREEN_HEIGHT > 800
          ? spacing.SPACING_3
          : spacing.SPACING_2;

const ComingSoonBottomSheet = forwardRef(({ theme }, ref) => {
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
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    useImperativeHandle(ref, () => ({
        show,
        hide,
    }));

    return (
        <>
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    {
                        opacity: backdropOpacity,
                    },
                ]}
                pointerEvents="auto"
            >
                <Pressable style={styles.backdrop} onPress={hide} />
            </Animated.View>

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.bottomSheet,
                    {
                        backgroundColor: theme.COMP_COLOR,
                        transform: [{ translateY }],
                    },
                ]}
                {...panResponder.panHandlers}
            >
                {/* Handle */}
                <View style={[styles.handle, { backgroundColor: theme.FOREGROUND_SECONDARY }]} />

                {/* Content */}
                <View style={styles.content}>
                    {/* Planzo Image */}
                    <Image
                        source={require('../../assets/walkthrough/Planzo.png')}
                        style={styles.planzoImage}
                        resizeMode="contain"
                    />

                    {/* Coming Soon Text */}
                    <Text style={[styles.title, { color: theme.FOREGROUND }]}>Coming Soon!</Text>

                    <Text style={[styles.description, { color: theme.FOREGROUND_SECONDARY }]}>
                        Your productivity analytics are being prepared. Check back soon for detailed
                        insights into your scheduling patterns and task completion rates.
                    </Text>

                    {/* Close Button */}
                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: theme.ACCENT }]}
                        onPress={hide}
                    >
                        <Text style={styles.closeButtonText}>Got it!</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </>
    );
});

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: MAX_TRANSLATE_Y,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingBottom: 34, // Safe area padding
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: SPACE,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    planzoImage: {
        width: 200,
        height: 200,
        marginBottom: SPACE * 2,
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        textAlign: 'center',
        marginBottom: SPACE,
    },
    description: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        lineHeight: typography.bodySize * 1.4,
        marginBottom: SPACE * 2,
        paddingHorizontal: 8,
    },
    closeButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: SPACE,
    },
    closeButtonText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default ComingSoonBottomSheet;
