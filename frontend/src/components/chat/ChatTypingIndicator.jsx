import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

const BOUNCE_HEIGHT = -7; // px upward travel
const UP_DURATION = 220; // ms rising
const DOWN_DURATION = 220; // ms falling
const STAGGER = 150; // ms between each dot
const TOTAL_CYCLE = 1000; // ms for full loop iteration

export default function ChatTypingIndicator({ color = '#888' }) {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

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

    return (
        <View style={styles.row}>
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
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
});
