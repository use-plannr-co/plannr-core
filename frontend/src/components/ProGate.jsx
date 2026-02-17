import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useSubscription } from '../hooks/useSubscription.js';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';

import LightningIcon from '../../assets/system-icons/LightningIcon.svg';

const { width } = Dimensions.get('window');

/**
 * ProGate - Feature gating component for Plannr Pro
 *
 * Wraps premium features and shows an upsell card for non-Pro users
 *
 * @param {ReactNode} children - The content to show for Pro users
 * @param {ReactNode} fallback - Optional custom fallback UI for non-Pro users
 * @param {string} featureKey - Identifier for tracking which feature was locked
 * @param {Function} navigation - Navigation object to route to paywall
 */
const ProGate = ({ children, fallback, featureKey, navigation }) => {
    const { isPro, isLoading } = useSubscription();
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'dark' ? darkColor : lightColor;

    // Show loading state while checking subscription
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.FOREGROUND }]}>Loading...</Text>
            </View>
        );
    }

    // User has Pro - show the feature
    if (isPro) {
        return children;
    }

    // User doesn't have Pro - show custom fallback or default locked card
    if (fallback) {
        return fallback;
    }

    // Default locked card
    return (
        <View style={[styles.lockedContainer, { backgroundColor: theme.BACKGROUND }]}>
            <View style={[styles.lockedCard, { backgroundColor: theme.COMP_COLOR }]}>
                {/* Pro Badge */}
                <View style={styles.badge}>
                    <LinearGradient
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeGradient}
                    >
                        <LightningIcon width={20} height={20} color="#FFFFFF" />
                        <Text style={styles.badgeText}>Plannr Pro</Text>
                    </LinearGradient>
                </View>

                {/* Title */}
                <Text style={[styles.lockedTitle, { color: theme.FOREGROUND }]}>
                    This is a Pro feature
                </Text>

                {/* Description */}
                <Text style={[styles.lockedDescription, { color: theme.FOREGROUND }]}>
                    Upgrade to Plannr Pro to unlock this feature and get access to advanced
                    scheduling tools.
                </Text>

                {/* Unlock Button */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation?.navigate('ProPaywall', { featureKey });
                    }}
                    style={styles.unlockButtonContainer}
                >
                    <LinearGradient
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.unlockButton}
                    >
                        <LightningIcon width={20} height={20} color="#FFFFFF" />
                        <Text style={styles.unlockButtonText}>Unlock Pro</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: padding.SCREEN_PADDING,
    },
    loadingText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
    },
    lockedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: padding.SCREEN_PADDING,
    },
    lockedCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: spacing.SPACING_8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    badge: {
        marginBottom: spacing.SPACING_6,
    },
    badgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.SPACING_4,
        paddingVertical: spacing.SPACING_2,
        borderRadius: 999,
        gap: spacing.SPACING_2,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
    },
    lockedTitle: {
        fontSize: typography.headingSize,
        fontFamily: 'PinkSunset',
        textAlign: 'center',
        marginBottom: spacing.SPACING_4,
    },
    lockedDescription: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
        textAlign: 'center',
        marginBottom: spacing.SPACING_8,
        lineHeight: typography.subHeadingSize * 1.4,
        opacity: 0.7,
    },
    unlockButtonContainer: {
        width: '100%',
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    unlockButton: {
        paddingVertical: spacing.SPACING_4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.SPACING_2,
        minHeight: 56,
    },
    unlockButtonText: {
        color: '#FFFFFF',
        fontSize: typography.headingSize,
        fontFamily: 'Albert Sans',
    },
});

export default ProGate;
