import React from 'react';
import { TouchableOpacity, StyleSheet, Dimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';

const { width } = Dimensions.get('window');
const BAR_HEIGHT = width > 400 ? 64 : width > 380 ? 56 : 48;
const FAB_SIZE = 52;

function ChatIcon() {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                fill="white"
            />
        </Svg>
    );
}

export default function FABChatButton({ onPress }) {
    const insets = useSafeAreaInsets();
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const bottomOffset = BAR_HEIGHT + insets.bottom + 16;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
    };

    return (
        <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
            <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
                <LinearGradient
                    colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}
                >
                    <ChatIcon />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
});
