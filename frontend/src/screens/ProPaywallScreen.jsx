import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    LayoutAnimation,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import { useAppState } from '../context/AppStateContext.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';

import LightningIcon from '../../assets/system-icons/LightningIcon.svg';
import ScheduleIcon from '../../assets/paywall-icons/ScheduleIcon.svg';
import ChatIcon from '../../assets/paywall-icons/ChatIcon.svg';
import CoPlanIcon from '../../assets/paywall-icons/CoPlanIcon.svg';
import AnalyticsIcon from '../../assets/paywall-icons/AnalyticsIcon.svg';
import StarIcon from '../../assets/system-icons/StarIcon.svg';

const { width, height } = Dimensions.get('window');
const SCREEN_PADDING = padding.SCREEN_PADDING;

function ChevronRightIcon({ color, size = 18 }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M9 18L15 12L9 6"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function ChevronDownIcon({ color, size = 18 }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M6 9L12 15L18 9"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

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
    const [offeringsError, setOfferingsError] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [showTestimonials, setShowTestimonials] = useState(true);
    const [bottomSectionHeight, setBottomSectionHeight] = useState(360);

    // Get feature key from route params (for tracking where user came from)
    const featureKey = route?.params?.featureKey;

    useEffect(() => {
        logScreenView({ featureKey });
    }, []);

    // Only fetch offerings once the RC SDK has finished initializing.
    // Firing before init completes causes _ensureInitialized() to throw.
    useEffect(() => {
        if (!isLoading) {
            loadOfferings();
        }
    }, [isLoading]);

    // Redirect if already Pro
    useEffect(() => {
        if (isPro && !isLoading) {
            // Alert.alert('Already Pro! 🎉', 'You already have access to Plannr Pro features.', [
            //     {
            //         text: 'OK',
            //         // onPress: () => navigation.goBack()
            //     },
            // ]);
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
            setOfferingsError(false);
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
            setOfferingsError(true);
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
    // annualTotalPrice is the actual amount billed (e.g. "$39.99") — must be shown prominently per Apple guidelines
    const annualTotalPrice = annualPackage?.product?.priceString || '$39.99';
    // Monthly equivalent shown as subordinate/smaller text only
    const annualMonthlyPrice = annualPackage?.product?.price
        ? `$${(annualPackage.product.price / 12).toFixed(2)}/mo`
        : '$3.33/mo';

    const testimonials = [
        {
            name: 'Prabhnoor Dua',
            rating: 5,
            quote: "Plannr is the only app on my phone that makes me feel assured that things won't slip through the cracks.",
        },
        {
            name: 'Vardaan Grover',
            rating: 5,
            quote: 'I have tried so many planners and scheduling apps, but Plannr is the only one that truly understands my needs and adapts to my life.',
        },
        {
            name: 'Gurleen Rao',
            rating: 5,
            quote: 'It helps me stay on top of everything without the stress, I finally feel in control of my time!',
        },
    ];

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
            {/* Scrollable content: badge, title, features, testimonials */}
            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={[
                    styles.subContainer,
                    { paddingBottom: bottomSectionHeight },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header: Badge + Title — scrolls with content */}
                <View style={styles.headerContent}>
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
                    <Text style={[styles.title, { color: theme.FOREGROUND }]}>
                        Turn your schedule into a{'\n'}system built for you.
                    </Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    <FeatureItem
                        text="Automatically adapt your schedules when life changes"
                        i={0}
                    />
                    <FeatureItem text="Talk to your AI-powered personal assistant" i={1} />
                    <FeatureItem text="Plan with others without the back-and-forth" i={2} />
                    <FeatureItem
                        text="Understand when you actually work best with smart analytics"
                        i={3}
                    />
                </View>

                {/* Testimonials */}
                <View
                    style={{
                        borderBottomWidth: 1,
                        borderBottomColor: theme.INPUT,
                        marginHorizontal: padding.SCREEN_PADDING,
                        marginBottom: spacing.SPACING_3,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setShowTestimonials((prev) => !prev);
                        }}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.SPACING_3,
                        }}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={{
                                fontFamily: 'Albert Sans',
                                fontSize: typography.subHeadingSize,
                                color: theme.FOREGROUND,
                                opacity: 0.4,
                                flex: 1,
                            }}
                        >
                            What people are saying about Plannr Pro
                        </Text>
                        <View style={{ opacity: 0.4, marginLeft: spacing.SPACING_2 }}>
                            {showTestimonials ? (
                                <ChevronDownIcon color={theme.FOREGROUND} />
                            ) : (
                                <ChevronRightIcon color={theme.FOREGROUND} />
                            )}
                        </View>
                    </TouchableOpacity>
                    {showTestimonials && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: spacing.SPACING_3 }}
                        >
                            {testimonials.map((item, index) => (
                                <TestimonialItem
                                    key={`testimonial-${index}`}
                                    name={item.name}
                                    rating={item.rating}
                                    quote={item.quote}
                                    theme={theme}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
                {/* Restore Button */}
                <TouchableOpacity
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
                </TouchableOpacity>
            </ScrollView>

            {/* Sticky bottom section — plan cards, upgrade button, links */}
            <View
                style={styles.bottomSection}
                onLayout={(e) => setBottomSectionHeight(e.nativeEvent.layout.height)}
                pointerEvents="box-none"
            >
                {/* Upward fade gradient so scroll content disappears gracefully behind it */}
                <LinearGradient
                    pointerEvents="none"
                    colors={[theme.BACKGROUND + '00', theme.BACKGROUND]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Plan Selection */}
                <View style={styles.planCardsContainer}>
                    {/* Annual Plan Card */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            setSelectedPlan('annual');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.planCardWrapper}
                    >
                        <View
                            style={[
                                styles.planCard,
                                {
                                    borderColor:
                                        selectedPlan === 'annual'
                                            ? theme.GRADIENT_END
                                            : theme.INPUT,
                                    backgroundColor: theme.BACKGROUND,
                                },
                            ]}
                        >
                            <View style={styles.planCardContent}>
                                <Text style={[styles.planCardPrice, { color: theme.FOREGROUND }]}>
                                    {annualTotalPrice}
                                </Text>
                                <Text
                                    style={[styles.planCardSubPrice, { color: theme.FOREGROUND }]}
                                >
                                    {annualMonthlyPrice}, Billed Annually
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.pricingDetails,
                                    { color: theme.FOREGROUND, opacity: 0.4 },
                                ]}
                            >
                                Get a free 1-week trial!
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.planCardLabelContainer,
                                {
                                    backgroundColor: theme.GRADIENT_END,
                                    borderWidth: 2.5,
                                    borderColor: theme.GRADIENT_END,
                                },
                            ]}
                        >
                            <Text style={[styles.planCardLabelText, { color: '#FFFFFF' }]}>
                                Annual (33% OFF)
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Monthly Plan Card */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            setSelectedPlan('monthly');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.planCardWrapper}
                    >
                        <View
                            style={[
                                styles.planCard,
                                {
                                    borderColor:
                                        selectedPlan === 'monthly'
                                            ? theme.GRADIENT_END
                                            : theme.INPUT,
                                    backgroundColor: theme.BACKGROUND,
                                },
                            ]}
                        >
                            <View style={styles.planCardContent}>
                                <Text style={[styles.planCardPrice, { color: theme.FOREGROUND }]}>
                                    {monthlyPrice}
                                </Text>
                                <Text
                                    style={[styles.planCardSubPrice, { color: theme.FOREGROUND }]}
                                >
                                    Billed Monthly
                                </Text>
                            </View>
                        </View>
                        <View
                            style={[
                                styles.planCardLabelContainer,
                                {
                                    backgroundColor: theme.GRADIENT_END,
                                    borderWidth: 2.5,
                                    borderColor: theme.GRADIENT_END,
                                },
                            ]}
                        >
                            <Text style={[styles.planCardLabelText, { color: '#FFFFFF' }]}>
                                Monthly
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Upgrade Button */}
                {offeringsError ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={loadOfferings}
                        style={styles.upgradeButtonContainer}
                    >
                        <LinearGradient
                            colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.upgradeButton}
                        >
                            <Text style={styles.upgradeButtonText}>Retry Loading Plans</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        activeOpacity={isPro ? 1 : 0.9}
                        onPress={isPro ? undefined : handlePurchase}
                        disabled={purchasing || loadingOfferings || isPro || !offerings}
                        style={styles.upgradeButtonContainer}
                    >
                        <LinearGradient
                            colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.upgradeButton,
                                (isPro || !offerings) && { opacity: 0.7 },
                            ]}
                        >
                            {purchasing ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.upgradeButtonText}>
                                    {isPro ? "You're a Pro Member" : 'Upgrade Now'}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Legal Links */}
                <View style={styles.legalLinks}>
                    <TouchableOpacity
                        onPress={() =>
                            openURL(
                                'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
                                'terms',
                            )
                        }
                    >
                        <Text style={[styles.legalLink, { color: theme.SELECTION }]}>
                            Terms of Use
                        </Text>
                    </TouchableOpacity>
                    <Text style={[styles.legalSeparator, { color: theme.SELECTION }]}> • </Text>
                    <TouchableOpacity
                        onPress={() => openURL('https://www.useplannr.co/privacy', 'privacy')}
                    >
                        <Text style={[styles.legalLink, { color: theme.SELECTION }]}>
                            Privacy Policy
                        </Text>
                    </TouchableOpacity>
                    <Text style={[styles.legalSeparator, { color: theme.SELECTION }]}> • </Text>
                    <TouchableOpacity onPress={handleManageSubscription}>
                        <Text style={[styles.legalLink, { color: theme.SELECTION }]}>
                            Manage Subscription
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

/**
 * Feature Item Component
 */
const FeatureItem = ({ text, i }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'dark' ? darkColor : lightColor;
    const iconArray = [ScheduleIcon, ChatIcon, CoPlanIcon, AnalyticsIcon];
    const IconComponent = iconArray[i] || ScheduleIcon;

    return (
        <View style={styles.featureItem}>
            <IconComponent width={24} height={24} color={theme.FOREGROUND} />
            <Text style={[styles.featureText, { color: theme.FOREGROUND }]}>{text}</Text>
        </View>
    );
};

/**
 * Testimonial Item Component
 */
const TestimonialItem = ({ name, rating, quote, theme }) => {
    return (
        <View style={[styles.testimonialItem, { borderColor: theme.INPUT }]}>
            <Text style={[styles.testimonialName, { color: theme.FOREGROUND }]}>{name}</Text>
            <View style={{ flexDirection: 'row', marginVertical: 8 }}>
                {[...Array(rating)].map((_, idx) => (
                    <StarIcon key={idx} width={16} height={16} style={{ marginRight: 2 }} />
                ))}
            </View>
            <Text style={[styles.testimonialQuote, { color: theme.FOREGROUND }]}>"{quote}"</Text>
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
    },
    headerContent: {
        alignItems: 'center',
        paddingTop: spacing.SPACING_16,
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: spacing.SPACING_2,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: spacing.SPACING_8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
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
        marginBottom: spacing.SPACING_2,
        lineHeight: typography.titleSize * 1.3,
    },
    planCardsContainer: {
        marginTop: spacing.SPACING_4,
        marginHorizontal: SCREEN_PADDING,
        marginBottom: spacing.SPACING_5,
        gap: spacing.SPACING_2,
    },
    // paddingTop makes room for the floating label that sits on the top border
    planCardWrapper: {
        paddingTop: 10,
    },
    planCard: {
        borderWidth: 2.5,
        borderRadius: 16,
        justifyContent: 'flex-end',
        paddingVertical: spacing.SPACING_4,
        paddingHorizontal: spacing.SPACING_5,
    },
    planCardContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.SPACING_2,
    },
    planCardPrice: {
        fontSize: 32,
        fontFamily: 'Albert Sans',
    },
    planCardSubPrice: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
        opacity: 0.4,
        marginBottom: 4,
    },
    // Floats on the top border line of the card
    planCardLabelContainer: {
        position: 'absolute',
        top: -2,
        right: 16,
        paddingHorizontal: spacing.SPACING_3,
        paddingVertical: spacing.SPACING_1,
        borderRadius: 24,
    },
    planCardLabelText: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'Albert Sans',
    },
    featuresList: {
        marginHorizontal: SCREEN_PADDING,
        marginBottom: spacing.SPACING_2,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontSize: typography.subHeadingSize,
        textAlign: 'flex-start',
        fontFamily: 'Albert Sans',
        marginTop: spacing.SPACING_2,
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
        marginTop: spacing.SPACING_2,
    },
    legalLink: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'Albert Sans',
    },
    legalSeparator: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'Albert Sans',
    },
    testimonialItem: {
        marginBottom: spacing.SPACING_1,
        paddingHorizontal: padding.PADDING_4,
        paddingVertical: padding.PADDING_3,
        borderRadius: 16,
        borderWidth: 3,
        marginRight: spacing.SPACING_3,
    },
    testimonialName: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'Albert Sans',
        marginBottom: spacing.SPACING_1,
    },
    testimonialRating: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'Albert Sans',
        marginBottom: spacing.SPACING_1,
    },
    testimonialQuote: {
        fontSize: typography.bodySize,
        fontFamily: 'Albert Sans',
        maxWidth: width * 0.6,
    },
});

export default ProPaywallScreen;
