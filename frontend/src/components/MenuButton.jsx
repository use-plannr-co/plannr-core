import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import SavedIcon from '../../assets/nav-icons/SavedIcon.svg';
import PlannrCenterIcon from '../../assets/nav-icons/PlannrCenterIcon.svg';
import PreferencesIcon from '../../assets/nav-icons/PreferencesIcon.svg';
import AddIcon from '../../assets/system-icons/AddIcon.svg';
import ProfileIcon from '../../assets/nav-icons/ProfileIcon.svg';
import ProductivityAnalyticsIcon from '../../assets/system-icons/ProductivityAnalyticsIcon.svg';
import LightningIcon from '../../assets/system-icons/LightningIcon.svg';
import { useAppState } from '../context/AppStateContext.js';

import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const WIDTH = width - padding.SCREEN_PADDING * 2;
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_2 : spacing.SPACING_1;

const MenuButton = ({ broad, title, icon, navTo, enableHaptic = true }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const ICONS = {
        Saved: (
            <SavedIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
        Center: (
            <PlannrCenterIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
        Generate: (
            <AddIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
        Preferences: (
            <PreferencesIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
        Profile: (
            <ProfileIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
        Productivity: (
            <ProductivityAnalyticsIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
        Pro: (
            <LightningIcon
                width={24}
                height={24}
                color={theme.FOREGROUND}
                style={{ position: 'absolute', top: 16, right: 16 }}
            />
        ),
    };

    const handlePress = () => {
        if (enableHaptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        navTo();
    };

    if (icon === 'Productivity') {
        return (
            <TouchableOpacity
                style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}
                onPress={handlePress}
            >
                <LinearGradient
                    colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                    }}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'AlbertSans' }}>Pro</Text>
                </LinearGradient>
                <Text style={{ ...styles.text, color: theme.FOREGROUND }}>{title}</Text>
                {ICONS[icon] || null}
            </TouchableOpacity>
        );
    }
    if (broad) {
        return (
            <TouchableOpacity
                style={{ ...styles.card, width: WIDTH, backgroundColor: theme.COMP_COLOR }}
                onPress={handlePress}
            >
                <Text style={{ ...styles.text, color: theme.FOREGROUND, width: 240 }}>{title}</Text>
                {ICONS[icon] || null}
            </TouchableOpacity>
        );
    }
    return (
        <TouchableOpacity
            style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}
            onPress={handlePress}
        >
            <Text style={{ ...styles.text, color: theme.FOREGROUND }}>{title}</Text>
            {ICONS[icon] || null}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: (WIDTH - padding.SCREEN_PADDING) / 2,
        // aspectRatio: 191/90,
        height: 100,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        padding: 16,
        marginBottom: SPACE,
    },
    text: {
        width: 130,
        fontFamily: 'AlbertSans',
        fontSize: typography.subHeadingSize,
        position: 'absolute',
        left: width > 400 ? padding.PADDING_4 : width > 350 ? padding.PADDING_3 : padding.PADDING_2,
        bottom:
            width > 400 ? padding.PADDING_4 : width > 350 ? padding.PADDING_3 : padding.PADDING_2,
    },
});

export default MenuButton;
