import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppState } from '../context/AppStateContext.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';

import LightningIcon from '../../assets/system-icons/LightningIcon.svg';

const { width, height } = Dimensions.get('window');
const SCREEN_PADDING = padding.SCREEN_PADDING;

/**
 * ProPaywallScreen
 *
 * Beautiful subscription paywall for Plannr Pro
 * Features:
 * - Monthly and Annual subscription options
 * - Annual highlighted as "Best value" with 33% discount
 * - Restore purchases button
 * - Terms, Privacy, and Manage subscription links
 * - Gradient backgrounds from theme
 * - Loading states
 */
const ProPaywallScreen = ({ navigation, route }) => {
    const { appState } = useAppState();
    const {
        isPro,
        isLoading,
        fetchOfferings,
        purchasePackage,
        restorePurchases,
        getManagementURL,
    } = useSubscription();
    const { logAction, logScreenView } = useActionLogger('ProPaywall');

    // Get colors based on theme
    const theme = appState.userPreferences.theme === 'dark' ? darkColor : lightColor;

    // State
    const [selectedPlan, setSelectedPlan] = useState('annual'); // 'monthly' or 'annual'
    const [offerings, setOfferings] = useState(null);
    const [loadingOfferings, setLoadingOfferings] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

    // Animation for sliding selector
    const selectorPosition = useRef(new Animated.Value(0)).current; // 0 = annual (left), 1 = monthly (right)

    // Get feature key from route params (for tracking where user came from)
    const featureKey = route?.params?.featureKey;

    useEffect(() => {
        logScreenView({ featureKey });
        loadOfferings();
    }, []);

    // Animate selector when plan changes
    useEffect(() => {
        Animated.spring(selectorPosition, {
            toValue: selectedPlan === 'annual' ? 0 : 1,
            useNativeDriver: false,
            tension: 80,
            friction: 20,
        }).start();
    }, [selectedPlan]);

    // Redirect if already Pro
    useEffect(() => {
        if (isPro && !isLoading) {
            Alert.alert('Already Pro! 🎉', 'You already have access to Plannr Pro features.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        }
    }, [isPro, isLoading]);

    /**
     * Load offerings from RevenueCat
     */
    const loadOfferings = async () => {
        if (Platform.OS !== 'ios') {
            setLoadingOfferings(false);
            return;
        }

        try {
            setLoadingOfferings(true);
            const fetchedOfferings = await fetchOfferings();

            // Look for "Plannr Pro Default" offering
            const defaultOffering =
                fetchedOfferings?.all?.['Plannr Pro Default'] || fetchedOfferings?.current;

            if (!defaultOffering) {
                throw new Error('No offerings found. Please check your RevenueCat configuration.');
            }

            setOfferings(defaultOffering);
            logAction('offerings_loaded', {
                offeringId: defaultOffering.identifier,
                packageCount: defaultOffering.availablePackages?.length,
            });
        } catch (error) {
            console.error('Failed to load offerings:', error);
            Alert.alert(
                'Unable to Load Plans',
                "We couldn't load subscription plans. Please try again later.",
                [{ text: 'Go Back', onPress: () => navigation.goBack() }],
            );
            logAction('offerings_error', { error: error.message });
        } finally {
            setLoadingOfferings(false);
        }
    };

    /**
     * Get package by identifier
     */
    const getPackage = (identifier) => {
        return offerings?.availablePackages?.find(
            (pkg) => pkg.identifier === identifier || pkg.packageType === identifier,
        );
    };

    /**
     * Handle purchase
     */
    const handlePurchase = async () => {
        if (Platform.OS !== 'ios') {
            Alert.alert('iOS Only', 'Subscriptions are currently only available on iOS.', [
                { text: 'OK' },
            ]);
            return;
        }

        const packageIdentifier = selectedPlan === 'annual' ? '$rc_annual' : '$rc_monthly';
        const selectedPackage = getPackage(packageIdentifier);

        if (!selectedPackage) {
            Alert.alert(
                'Plan Not Available',
                `The ${selectedPlan} plan is not available right now. Please try again later.`,
                [{ text: 'OK' }],
            );
            return;
        }

        try {
            setPurchasing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            logAction('purchase_initiated', { plan: selectedPlan });

            await purchasePackage(selectedPackage);

            // Success! (listener will update state)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logAction('purchase_success', { plan: selectedPlan });

            Alert.alert(
                'Welcome to Plannr Pro! 🎉',
                'Your subscription is now active. Enjoy all Pro features!',
                [{ text: 'Get Started', onPress: () => navigation.goBack() }],
            );
        } catch (error) {
            setPurchasing(false);

            // User cancelled - don't show error
            if (error.userCancelled) {
                logAction('purchase_cancelled', { plan: selectedPlan });
                return;
            }

            // Show error
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            logAction('purchase_error', { plan: selectedPlan, error: error.message });

            Alert.alert(
                'Purchase Failed',
                error.message || 'Unable to complete purchase. Please try again.',
                [{ text: 'OK' }],
            );
        }
    };

    /**
     * Handle restore purchases
     */
    const handleRestore = async () => {
        if (Platform.OS !== 'ios') {
            return;
        }

        try {
            setRestoring(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            logAction('restore_initiated');

            await restorePurchases();

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logAction('restore_success');

            Alert.alert('Purchases Restored', 'Your purchases have been restored successfully.', [
                { text: 'OK' },
            ]);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            logAction('restore_error', { error: error.message });

            Alert.alert(
                'Restore Failed',
                "Unable to restore purchases. Please make sure you're signed in with the same Apple ID.",
                [{ text: 'OK' }],
            );
        } finally {
            setRestoring(false);
        }
    };

    /**
     * Open management URL
     */
    const handleManageSubscription = async () => {
        try {
            const managementURL = await getManagementURL();
            const url = managementURL || 'https://apps.apple.com/account/subscriptions';

            Linking.openURL(url);
            logAction('manage_subscription_opened');
        } catch (error) {
            console.error('Failed to open management URL:', error);
        }
    };

    /**
     * Open terms/privacy
     */
    const openURL = (url, type) => {
        Linking.openURL(url);
        logAction(`${type}_opened`);
    };

    // Get package details
    const monthlyPackage = getPackage('$rc_monthly');
    const annualPackage = getPackage('$rc_annual');

    const monthlyPrice = monthlyPackage?.product?.priceString || '$4.99';
    const annualPrice = annualPackage?.product?.priceString || '$3.33';

    // Loading state
    if (loadingOfferings || isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
                <ActivityIndicator size="large" color={theme.GRADIENT_START} />
                <Text style={[styles.loadingText, { color: theme.FOREGROUND }]}>
                    Loading subscription plans...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
            <View style={styles.subContainer}>
                {/* Header Badge */}
                <View style={styles.headerBadge}>
                    <LinearGradient
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeGradient}
                    >
                        <View
                            style={{
                                backgroundColor: theme.BACKGROUND,
                                borderRadius: 20,
                                flexDirection: 'row',
                                paddingHorizontal: spacing.SPACING_4,
                                paddingVertical: spacing.SPACING_2,
                            }}
                        >
                            <LightningIcon width={16} height={16} color={theme.FOREGROUND} />
                            <Text style={{ ...styles.badgeText, color: theme.FOREGROUND }}>
                                Try Plannr Pro
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: theme.FOREGROUND }]}>
                    Turn your schedule into a{'\n'}system built for you.
                </Text>

                {/* Plan Selection */}
                <View style={{ ...styles.planSelector, backgroundColor: theme.COMP_COLOR }}>
                    {/* Animated Background Selector */}
                    <Animated.View
                        style={[
                            styles.animatedSelector,
                            {
                                transform: [
                                    {
                                        translateX: selectorPosition.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [
                                                0,
                                                (width -
                                                    SCREEN_PADDING * 2 -
                                                    padding.PADDING_1 * 2 -
                                                    spacing.SPACING_2) /
                                                    2 +
                                                    spacing.SPACING_2 * 0.5,
                                            ],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={
                                selectedPlan === 'annual'
                                    ? [theme.GRADIENT_START, theme.GRADIENT_END]
                                    : [theme.GRADIENT_START, theme.GRADIENT_START]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.animatedSelectorGradient}
                        />
                    </Animated.View>

                    {/* Annual Plan */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            if (selectedPlan !== 'annual') {
                                setSelectedPlan('annual');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                        }}
                        style={styles.planButton}
                    >
                        <View style={styles.planButtonContent}>
                            <Text
                                style={[
                                    styles.planTitle,
                                    {
                                        color:
                                            selectedPlan === 'annual'
                                                ? '#FFFFFF'
                                                : theme.FOREGROUND,
                                    },
                                ]}
                            >
                                Annual (33% OFF)
                            </Text>
                            <Text />
                            <Text
                                style={[
                                    styles.planPrice,
                                    {
                                        color:
                                            selectedPlan === 'annual'
                                                ? '#FFFFFF'
                                                : theme.FOREGROUND,
                                    },
                                ]}
                            >
                                {annualPrice}/mo
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Monthly Plan */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            if (selectedPlan !== 'monthly') {
                                setSelectedPlan('monthly');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                        }}
                        style={styles.planButton}
                    >
                        <View style={styles.planButtonContent}>
                            <Text
                                style={[
                                    styles.planTitle,
                                    {
                                        color:
                                            selectedPlan === 'monthly'
                                                ? '#FFFFFF'
                                                : theme.FOREGROUND,
                                    },
                                ]}
                            >
                                Monthly
                            </Text>
                            <Text />
                            <Text
                                style={[
                                    styles.planPrice,
                                    {
                                        color:
                                            selectedPlan === 'monthly'
                                                ? '#FFFFFF'
                                                : theme.FOREGROUND,
                                    },
                                ]}
                            >
                                {monthlyPrice}/mo
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    <FeatureItem text="Unlimited smart scheduling & rescheduling" colors={theme} />
                    <FeatureItem
                        text="AI that understands natural languagerequests"
                        colors={theme}
                    />
                    <FeatureItem
                        text="Co-planning with friends & shared availability"
                        colors={theme}
                    />
                    <FeatureItem
                        text="Productivity analytics & trends to help you know yourself better"
                        colors={theme}
                    />
                </View>

                {/* Bottom Description */}
                <View>
                    <LinearGradient
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bottomDescription}
                    >
                        <Text style={[styles.bottomText, { color: '#FFFFFF' }]}>
                            A scheduling system tailored to how{'\n'}you work
                        </Text>
                    </LinearGradient>
                </View>

                <View>
                    {/* Trial Info */}
                    <View style={styles.trialInfo}>
                        <Text style={[styles.trialTitle, { color: theme.FOREGROUND }]}>
                            Get a free 1 month trial for
                        </Text>
                        <Text style={[styles.trialBrand, { color: theme.FOREGROUND }]}>
                            Plannr Pro
                        </Text>
                    </View>

                    {/* Upgrade Button */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handlePurchase}
                        disabled={purchasing || loadingOfferings}
                        style={styles.upgradeButtonContainer}
                    >
                        <LinearGradient
                            colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.upgradeButton}
                        >
                            {purchasing ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Pricing Details */}
                    <Text style={[styles.pricingDetails, { color: theme.SELECTION }]}>
                        Free for 30 days,{'\n'}
                        {selectedPlan === 'annual'
                            ? `$39.99/year afterwards`
                            : `${monthlyPrice}/month afterwards`}
                    </Text>
                </View>

                {/* Restore Button */}
                {/* <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleRestore}
                    disabled={restoring}
                    style={styles.restoreButton}
                >
                    {restoring ? (
                        <ActivityIndicator size="small" color={theme.GRADIENT_START} />
                    ) : (
                        <Text style={[styles.restoreText, { color: theme.GRADIENT_START }]}>
                            Restore Purchases
                        </Text>
                    )}
                </TouchableOpacity> */}

                {/* Legal Links */}
                {/* <View style={styles.legalLinks}>
                    <TouchableOpacity onPress={() => openURL('https://plannr.app/terms', 'terms')}>
                        <Text style={[styles.legalLink, { color: theme.SELECTION }]}>Terms of Service</Text>
                    </TouchableOpacity>
                    <Text style={[styles.legalSeparator, { color: theme.SELECTION }]}>  •  </Text>
                    <TouchableOpacity onPress={() => openURL('https://plannr.app/privacy', 'privacy')}>
                        <Text style={[styles.legalLink, { color: theme.SELECTION }]}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={[styles.legalSeparator, { color: theme.SELECTION }]}>  •  </Text>
                    <TouchableOpacity onPress={handleManageSubscription}>
                        <Text style={[styles.legalLink, { color: theme.SELECTION }]}>Manage Subscription</Text>
                    </TouchableOpacity>
                </View> */}

                {/* Bottom Spacing */}
                <View style={{ height: spacing.SPACING_10 }} />
            </View>
        </View>
    );
};

/**
 * Feature Item Component
 */
const FeatureItem = ({ text, colors }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'dark' ? 'dark' : 'light';
    const imageMap = {
        light: require('../../assets/images/light/PaywallTick.png'),
        dark: require('../../assets/images/dark/PaywallTick.png'),
    };

    return (
        <View style={styles.featureItem}>
            <Image
                source={imageMap[theme]}
                style={{ width: 22, height: 16, alignSelf: 'center' }}
            />
            <Text style={[styles.featureText, { color: colors.FOREGROUND }]}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    subContainer: {
        width: '100%',
        marginTop: spacing.SPACING_16,
        marginBottom: spacing.SPACING_1,
        flex: 1,
    },
    loadingText: {
        marginTop: spacing.SPACING_4,
        fontSize: typography.bodySize,
    },
    headerBadge: {
        alignSelf: 'center',
        marginBottom: spacing.SPACING_3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    badgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.SPACING_1,
        paddingVertical: spacing.SPACING_1,
        borderRadius: 999,
        gap: spacing.SPACING_1,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: typography.bodySize,
        fontFamily: 'Albert Sans',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        textAlign: 'center',
        marginBottom: spacing.SPACING_5,
        lineHeight: typography.titleSize * 1.3,
    },
    planSelector: {
        height: 90,
        borderRadius: 16,
        marginHorizontal: SCREEN_PADDING,
        padding: padding.PADDING_1,
        flexDirection: 'row',
        gap: spacing.SPACING_2,
        marginBottom: spacing.SPACING_5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        position: 'relative',
    },
    animatedSelector: {
        position: 'absolute',
        left: padding.PADDING_1,
        top: padding.PADDING_1,
        bottom: padding.PADDING_1,
        width: '50%',
        borderRadius: 12,
        zIndex: 0,
    },
    animatedSelectorGradient: {
        flex: 1,
        borderRadius: 12,
    },
    planButton: {
        width: '50%',
        borderRadius: 12,
        zIndex: 1,
    },
    planButtonContent: {
        flex: 1,
        paddingVertical: spacing.SPACING_4,
        paddingHorizontal: spacing.SPACING_4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
        borderRadius: 12,
    },
    planButtonSelected: {},
    planButtonGradient: {
        flex: 1,
        paddingVertical: spacing.SPACING_4,
        paddingHorizontal: spacing.SPACING_4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
        borderRadius: 12,
    },
    planTitle: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
        marginBottom: spacing.SPACING_1,
    },
    planPrice: {
        fontSize: typography.bodySize,
        fontFamily: 'Albert Sans',
    },
    featuresList: {
        marginHorizontal: SCREEN_PADDING * 2,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.SPACING_4,
        gap: spacing.SPACING_4,
    },
    featureText: {
        flex: 1,
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
    },
    bottomDescription: {
        width: '100%',
        paddingVertical: spacing.SPACING_4,
        paddingHorizontal: spacing.SPACING_4,
        alignItems: 'center',
        marginBottom: spacing.SPACING_8,
    },
    bottomText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
        textAlign: 'center',
    },
    trialInfo: {
        alignItems: 'center',
        marginBottom: spacing.SPACING_6,
        marginHorizontal: SCREEN_PADDING,
    },
    trialTitle: {
        fontSize: typography.subHeadingSize,
        marginBottom: spacing.SPACING_2,
        fontFamily: 'Albert Sans',
    },
    trialBrand: {
        fontSize: typography.headingSize + 16,
        fontFamily: 'PinkSunset',
    },
    upgradeButtonContainer: {
        marginBottom: spacing.SPACING_3,
        marginHorizontal: SCREEN_PADDING,
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    upgradeButton: {
        paddingVertical: spacing.SPACING_4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    upgradeButtonText: {
        color: '#FFFFFF',
        fontSize: typography.headingSize,
        fontFamily: 'Albert Sans',
    },
    pricingDetails: {
        fontSize: typography.bodySize - 1,
        textAlign: 'center',
        fontFamily: 'Albert Sans',
        marginBottom: spacing.SPACING_6,
        lineHeight: typography.bodySize * 1.4,
    },
    restoreButton: {
        paddingVertical: spacing.SPACING_3,
        alignItems: 'center',
        marginBottom: spacing.SPACING_6,
    },
    restoreText: {
        fontSize: typography.bodySize,
        fontFamily: 'Albert Sans',
    },
    legalLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.SPACING_4,
    },
    legalLink: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'Albert Sans',
    },
    legalSeparator: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'Albert Sans',
    },
});

export default ProPaywallScreen;
