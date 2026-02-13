import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function ChatTypingIndicator({ color = '#888' }) {
    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = (dot, delay) => Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                Animated.delay(600),
            ])
        ).start();

        pulse(dot1, 0);
        pulse(dot2, 250);
        pulse(dot3, 500);
    }, [dot1, dot2, dot3]);

    return (
        <View style={styles.row}>
            {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[styles.dot, { backgroundColor: color, opacity: dot }]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
