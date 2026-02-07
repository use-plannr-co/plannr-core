import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import SubscriptionService from '../services/subscription/SubscriptionService';

export const SubscriptionContext = createContext();

/**
 * Derive subscription state from RevenueCat CustomerInfo
 * Centralizes entitlement logic in one place
 */
const deriveSubscriptionState = (customerInfo) => {
    if (!customerInfo) {
        return {
            isPro: false,
            activeEntitlements: [],
            activeProductIds: [],
            managementURL: null,
            expirationAt: null,
            productId: null,
        };
    }

    const activeEntitlements = customerInfo?.entitlements?.active || {};
    const proEntitlement = activeEntitlements['plannr_pro'];

    return {
        isPro: !!proEntitlement,
        activeEntitlements: Object.keys(activeEntitlements),
        activeProductIds: customerInfo?.activeSubscriptions || [],
        managementURL: customerInfo?.managementURL ?? null,
        expirationAt: proEntitlement?.expiresDate ?? null,
        productId: proEntitlement?.productIdentifier ?? null,
    };
};

export const SubscriptionProvider = ({ children }) => {
    const { isSignedIn, user } = useUser();
    
    // Subscription state
    const [subscriptionState, setSubscriptionState] = useState({
        isPro: false,
        activeEntitlements: [],
        activeProductIds: [],
        managementURL: null,
        expirationAt: null,
        productId: null,
    });

    // Loading and error states
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [customerInfo, setCustomerInfo] = useState(null);

    /**
     * Initialize RevenueCat when user is authenticated
     */
    useEffect(() => {
        let unsubscribe = null;

        const initializeSubscription = async () => {
            // Only initialize on iOS
            if (Platform.OS !== 'ios') {
                console.log('📱 SubscriptionProvider: Non-iOS platform, skipping initialization');
                setIsLoading(false);
                setIsReady(true);
                return;
            }

            // Wait for user authentication
            if (!isSignedIn || !user?.id) {
                console.log('📱 SubscriptionProvider: User not authenticated yet');
                setIsLoading(false);
                return;
            }

            // Check for API key
            const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
            if (!apiKey) {
                console.error('❌ SubscriptionProvider: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY not configured');
                setError('Subscription configuration missing');
                setIsLoading(false);
                setIsReady(true); // Still mark as ready to not block app
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                console.log('📱 SubscriptionProvider: Initializing for user:', user.id);

                // Initialize SDK
                const initialCustomerInfo = await SubscriptionService.init({
                    apiKey,
                    appUserId: user.id,
                });

                // Set initial state
                if (initialCustomerInfo) {
                    setCustomerInfo(initialCustomerInfo);
                    setSubscriptionState(deriveSubscriptionState(initialCustomerInfo));
                }

                // Setup listener for customer info updates
                // Wrap in try-catch to handle potential NativeEventEmitter errors
                try {
                    unsubscribe = SubscriptionService.addCustomerInfoListener((updatedCustomerInfo) => {
                        console.log('📱 SubscriptionProvider: Customer info updated');
                        setCustomerInfo(updatedCustomerInfo);
                        setSubscriptionState(deriveSubscriptionState(updatedCustomerInfo));
                    });
                } catch (listenerError) {
                    console.warn('⚠️ SubscriptionProvider: Could not set up listener:', listenerError.message);
                    // Continue without listener - state updates will happen on manual refresh
                }

                console.log('✅ SubscriptionProvider: Initialization complete');
                setIsReady(true);
            } catch (err) {
                console.error('❌ SubscriptionProvider: Initialization error:', err);
                setError(err.message);
                setIsReady(true); // Still mark as ready to not block app
            } finally {
                setIsLoading(false);
            }
        };

        initializeSubscription();

        // Cleanup listener on unmount or when user changes
        return () => {
            if (unsubscribe) {
                console.log('📱 SubscriptionProvider: Cleaning up listener');
                unsubscribe();
            }
        };
    }, [isSignedIn, user?.id]);

    /**
     * Refresh customer info from RevenueCat
     */
    const refreshSubscription = async () => {
        if (Platform.OS !== 'ios') {
            return;
        }

        if (!SubscriptionService.isInitialized()) {
            console.warn('⚠️ SubscriptionProvider: Cannot refresh, not initialized');
            return;
        }

        try {
            console.log('🔄 SubscriptionProvider: Refreshing subscription...');
            const updatedCustomerInfo = await SubscriptionService.refreshCustomerInfo();
            setCustomerInfo(updatedCustomerInfo);
            setSubscriptionState(deriveSubscriptionState(updatedCustomerInfo));
            return updatedCustomerInfo;
        } catch (err) {
            console.error('❌ SubscriptionProvider: Refresh failed:', err);
            throw err;
        }
    };

    /**
     * Purchase a package
     */
    const purchasePackage = async (packageToPurchase) => {
        try {
            const result = await SubscriptionService.purchasePackage(packageToPurchase);
            // State will be updated via listener
            return result;
        } catch (err) {
            throw err;
        }
    };

    /**
     * Restore previous purchases
     */
    const restorePurchases = async () => {
        try {
            const restoredCustomerInfo = await SubscriptionService.restorePurchases();
            // State will be updated via listener
            return restoredCustomerInfo;
        } catch (err) {
            throw err;
        }
    };

    /**
     * Fetch available offerings
     */
    const fetchOfferings = async () => {
        try {
            return await SubscriptionService.fetchOfferings();
        } catch (err) {
            throw err;
        }
    };

    /**
     * Get management URL
     */
    const getManagementURL = async () => {
        try {
            return await SubscriptionService.getManagementURL();
        } catch (err) {
            console.error('❌ Failed to get management URL:', err);
            return null;
        }
    };

    const contextValue = {
        // Subscription state
        ...subscriptionState,
        customerInfo,
        
        // Status flags
        isLoading,
        isReady,
        error,
        
        // Actions
        refreshSubscription,
        purchasePackage,
        restorePurchases,
        fetchOfferings,
        getManagementURL,
    };

    return (
        <SubscriptionContext.Provider value={contextValue}>
            {children}
        </SubscriptionContext.Provider>
    );
};

/**
 * Hook to access subscription context
 * @returns {Object} Subscription context value
 */
export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    
    if (!context) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }
    
    return context;
};
