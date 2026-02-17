import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';

export default function ChatActionButtons({ actions, onConfirm }) {
    const { appState } = useAppState();
    const isDark = appState.userPreferences.theme !== 'light';
    const theme = isDark ? darkColor : lightColor;

    const [confirmed, setConfirmed] = useState(false);

    const handlePress = (action) => {
        if (confirmed) return;
        setConfirmed(true);
        onConfirm(action);
    };

    const handleDecline = () => {
        if (confirmed) return;
        setConfirmed(true);
    };

    return (
        <View style={styles.container}>
            {actions.map((action, index) => (
                <TouchableOpacity
                    key={action.type || index}
                    style={[
                        styles.confirmBtn,
                        { borderColor: theme.PURPLE },
                        confirmed && styles.disabled,
                    ]}
                    onPress={() => handlePress(action)}
                    disabled={confirmed}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.confirmLabel, { color: theme.PURPLE }]}>
                        {action.label}
                    </Text>
                </TouchableOpacity>
            ))}
            <TouchableOpacity
                style={[styles.cancelBtn, confirmed && styles.disabled]}
                onPress={handleDecline}
                disabled={confirmed}
                activeOpacity={0.7}
            >
                <Text style={[styles.cancelLabel, { color: isDark ? '#666' : '#999' }]}>
                    No thanks
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        gap: 8,
    },
    confirmBtn: {
        borderWidth: 1.5,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    confirmLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    cancelBtn: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    cancelLabel: {
        fontSize: 14,
    },
    disabled: {
        opacity: 0.4,
    },
});
