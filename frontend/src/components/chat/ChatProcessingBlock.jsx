import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';
import ChatTypingIndicator from './ChatTypingIndicator.jsx';

export default function ChatProcessingBlock({ label = 'Applying changes...' }) {
    const { appState } = useAppState();
    const isDark = appState.userPreferences.theme !== 'light';
    const theme = isDark ? darkColor : lightColor;

    return (
        <View style={styles.row}>
            <ChatTypingIndicator color={theme.PURPLE} />
            <Text style={[styles.label, { color: isDark ? '#888' : '#666' }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 10,
    },
    label: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
