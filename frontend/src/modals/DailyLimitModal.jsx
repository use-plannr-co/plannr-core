import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing } from '../design/spacing.js';
import { typography } from '../design/typography.js';

import LightningIcon from '../../assets/system-icons/LightningIcon.svg';

const DailyLimitModal = ({ isVisible, onClose }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'dark' ? darkColor : lightColor;
    const navigation = useNavigation();

    const handleUnlock = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        navigation.navigate('ProPaywall', { featureKey: 'chat_daily_limit' });
    };

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            style={styles.modal}
            animationIn="fadeInUp"
            animationOut="fadeOutDown"
            animationInTiming={300}
            animationOutTiming={250}
            backdropTransitionInTiming={300}
            backdropTransitionOutTiming={250}
        >
            <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
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
                <Text style={[styles.title, { color: theme.FOREGROUND }]}>Daily limit reached</Text>

                {/* Description */}
                <Text style={[styles.description, { color: theme.FOREGROUND }]}>
                    You've used all your free daily messages. Upgrade to Plannr Pro for unlimited AI
                    chat and advanced scheduling tools.
                </Text>

                {/* Unlock Button */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleUnlock}
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

                {/* Dismiss */}
                <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={styles.dismiss}>
                    <Text style={[styles.dismissText, { color: theme.FOREGROUND }]}>
                        Maybe later
                    </Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: spacing.SPACING_8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
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
        fontFamily: 'AlbertSans',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        textAlign: 'center',
        marginBottom: spacing.SPACING_4,
    },
    description: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        marginBottom: spacing.SPACING_8,
        lineHeight: typography.subHeadingSize * 1.4,
        opacity: 0.7,
    },
    unlockButtonContainer: {
        width: '100%',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
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
        fontFamily: 'AlbertSans',
    },
    dismiss: {
        marginTop: spacing.SPACING_4,
        paddingVertical: spacing.SPACING_2,
    },
    dismissText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        opacity: 0.5,
    },
});

export default DailyLimitModal;
