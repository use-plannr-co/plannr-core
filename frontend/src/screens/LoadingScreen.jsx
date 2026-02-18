import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Circle } from 'react-native-animated-spinkit';

import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { spacing, padding } from '../design/spacing.js';

const LoadingScreen = ({ message = 'Loading...' }) => {
    const { appState } = useAppState();
    const { logScreenView } = useActionLogger('Loading');
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    React.useEffect(() => {
        logScreenView({ message: message });
    }, [message]);

    return (
        <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
            <Circle size={120} color={theme.FOREGROUND} />
            <Text style={[styles.loadingText, { color: theme.FOREGROUND }]}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: padding.SCREEN_PADDING,
    },
    loadingText: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginTop: spacing.SPACING_16,
        textAlign: 'center',
    },
});

export default LoadingScreen;
