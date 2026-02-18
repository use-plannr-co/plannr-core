import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';

function HamburgerIcon({ color }) {
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Line
                x1="3"
                y1="6"
                x2="21"
                y2="6"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
            />
            <Line
                x1="3"
                y1="12"
                x2="21"
                y2="12"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
            />
            <Line
                x1="3"
                y1="18"
                x2="21"
                y2="18"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
            />
        </Svg>
    );
}

function NewChatIcon({ color }) {
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function BackIcon({ color }) {
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
                d="M15 18L9 12L15 6"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export default function ChatHeader({ onOpenDrawer, onNewChat, onBack }) {
    const insets = useSafeAreaInsets();
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const isDark = appState.userPreferences.theme !== 'light';

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.BACKGROUND,
                    paddingTop: insets.top + 8,
                },
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <BackIcon color={theme.FOREGROUND} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onOpenDrawer}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <HamburgerIcon color={theme.FOREGROUND} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                onPress={onNewChat}
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <NewChatIcon color={theme.FOREGROUND} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    iconBtn: {
        padding: 4,
    },
    title: {
        flex: 1,
        fontSize: 24,
        fontFamily: 'Pink Sunset',
        textAlign: 'center',
    },
});
