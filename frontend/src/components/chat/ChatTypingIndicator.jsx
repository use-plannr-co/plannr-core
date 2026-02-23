import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

const BOUNCE_HEIGHT = -7;
const UP_DURATION = 220;
const DOWN_DURATION = 220;
const STAGGER = 150;
const TOTAL_CYCLE = 1000;

export default function ChatTypingIndicator({ color = '#888', statusText = null }) {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateX = useRef(new Animated.Value(-6)).current;

    // Dot bounce loop
    useEffect(() => {
        const bounce = (dot, staggerDelay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(staggerDelay),
                    Animated.timing(dot, {
                        toValue: BOUNCE_HEIGHT,
                        duration: UP_DURATION,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: DOWN_DURATION,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.delay(TOTAL_CYCLE - staggerDelay - UP_DURATION - DOWN_DURATION),
                ]),
            ).start();

        bounce(dot1, 0);
        bounce(dot2, STAGGER);
        bounce(dot3, STAGGER * 2);

        return () => {
            dot1.stopAnimation();
            dot2.stopAnimation();
            dot3.stopAnimation();
        };
    }, []);

    // Status text: slide in when it appears, re-animate on every change
    useEffect(() => {
        if (!statusText) {
            Animated.timing(textOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
            return;
        }

        // Reset to off-screen left + invisible, then animate in
        textOpacity.setValue(0);
        textTranslateX.setValue(-6);

        Animated.parallel([
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 280,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(textTranslateX, {
                toValue: 0,
                duration: 280,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [statusText]);

    return (
        <View style={styles.container}>
            <View style={styles.dotsRow}>
                {[dot1, dot2, dot3].map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.dot,
                            { backgroundColor: color, transform: [{ translateY: dot }] },
                        ]}
                    />
                ))}
            </View>

            {statusText != null && (
                <Animated.Text
                    style={[
                        styles.statusText,
                        {
                            color,
                            opacity: textOpacity,
                            transform: [{ translateX: textTranslateX }],
                        },
                    ]}
                >
                    {statusText}
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'Albert Sans',
    },
});
