import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * SubscriptionService
 *
 * Centralized service for managing RevenueCat SDK interactions.
 * Handles initialization, purchases, restores, and customer info management.
 *
 * Key principles:
 * - iOS-only for this implementation
 * - Uses Clerk user ID as RevenueCat App User ID
 * - Entitlement-based feature gating (not product-based)
 */
class SubscriptionService {
    constructor() {
        this._isInitialized = false;
        this._customerInfoListeners = [];
    }

    /**
     * Initialize RevenueCat SDK
     * Must be called once after user authentication
     *
     * @param {Object} config
     * @param {string} config.apiKey - RevenueCat iOS API key
     * @param {string} config.appUserId - Clerk user ID
     * @returns {Promise<void>}
     */
    async init({ apiKey, appUserId }) {
        // Only initialize on iOS
        if (Platform.OS !== 'ios') {
            console.log('📱 SubscriptionService: Skipping initialization on non-iOS platform');
            return;
        }

        // Prevent multiple initializations
        if (this._isInitialized) {
            console.log('📱 SubscriptionService: Already initialized');
            return;
        }

        try {
            console.log('📱 SubscriptionService: Initializing with app user ID:', appUserId);

            // Configure SDK
            Purchases.configure({
                apiKey,
                appUserID: appUserId,
            });

            // Set log level based on environment (synchronous in RC v8)
            if (__DEV__) {
                Purchases.setLogLevel(LOG_LEVEL.DEBUG);
                console.log('📱 SubscriptionService: Debug logging enabled');
            } else {
                Purchases.setLogLevel(LOG_LEVEL.INFO);
            }

            // appUserID was already passed to configure() above — fetch customerInfo directly
            console.log('📱 SubscriptionService: Fetching initial customer info...');
            const customerInfo = await Purchases.getCustomerInfo();

            this._isInitialized = true;
            console.log('✅ SubscriptionService: Initialization complete');
            console.log(
                '📊 Active entitlements:',
                Object.keys(customerInfo?.entitlements?.active || {}),
            );

            return customerInfo;
        } catch (error) {
            console.error('❌ SubscriptionService: Initialization failed:', error);
            return null;
        }
    }

    /**
     * Check if SDK is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._isInitialized;
    }

    /**
     * Fetch available offerings from RevenueCat
     * @returns {Promise<Object>} Offerings object
     */
    async fetchOfferings() {
        this._ensureInitialized();

        try {
            console.log('📱 SubscriptionService: Fetching offerings...');
            const offerings = await Purchases.getOfferings();

            if (offerings.current) {
                console.log('✅ Current offering found:', offerings.current.identifier);
                console.log('📦 Available packages:', offerings.current.availablePackages.length);
            } else {
                console.warn('⚠️ No current offering configured in RevenueCat');
            }

            return offerings;
        } catch (error) {
            console.error('❌ SubscriptionService: Failed to fetch offerings:', error);
            throw new Error(`Failed to fetch offerings: ${error.message}`);
        }
    }

    /**
     * Purchase a package
     * @param {Object} packageToPurchase - RevenueCat Package object
     * @returns {Promise<Object>} Purchase result with customerInfo
     */
    async purchasePackage(packageToPurchase) {
        this._ensureInitialized();

        try {
            console.log(
                '💳 SubscriptionService: Initiating purchase for:',
                packageToPurchase.identifier,
            );

            const { customerInfo, productIdentifier } =
                await Purchases.purchasePackage(packageToPurchase);

            console.log('✅ Purchase successful:', productIdentifier);
            console.log(
                '📊 Updated entitlements:',
                Object.keys(customerInfo?.entitlements?.active || {}),
            );

            return { customerInfo, productIdentifier };
        } catch (error) {
            // Handle user cancellation gracefully
            if (error.userCancelled) {
                console.log('🚫 User cancelled purchase');
                throw { userCancelled: true, message: 'Purchase cancelled' };
            }

            console.error('❌ Purchase failed:', error);
            throw new Error(this._normalizePurchaseError(error));
        }
    }

    /**
     * Restore previous purchases
     * @returns {Promise<Object>} Restored customerInfo
     */
    async restorePurchases() {
        this._ensureInitialized();

        try {
            console.log('🔄 SubscriptionService: Restoring purchases...');

            const customerInfo = await Purchases.restorePurchases();

            const hasActiveEntitlements =
                Object.keys(customerInfo?.entitlements?.active || {}).length > 0;

            if (hasActiveEntitlements) {
                console.log('✅ Purchases restored successfully');
                console.log(
                    '📊 Active entitlements:',
                    Object.keys(customerInfo.entitlements.active),
                );
            } else {
                console.log('ℹ️ No active purchases found to restore');
            }

            return customerInfo;
        } catch (error) {
            console.error('❌ Restore failed:', error);
            throw new Error(`Failed to restore purchases: ${error.message}`);
        }
    }

    /**
     * Refresh customer info from RevenueCat servers
     * @returns {Promise<Object>} Latest customerInfo
     */
    async refreshCustomerInfo() {
        this._ensureInitialized();

        try {
            console.log('🔄 SubscriptionService: Refreshing customer info...');

            const customerInfo = await Purchases.getCustomerInfo();

            console.log('✅ Customer info refreshed');
            console.log(
                '📊 Active entitlements:',
                Object.keys(customerInfo?.entitlements?.active || {}),
            );

            return customerInfo;
        } catch (error) {
            console.error('❌ Failed to refresh customer info:', error);
            throw new Error(`Failed to refresh customer info: ${error.message}`);
        }
    }

    /**
     * Add a listener for customer info updates
     * @param {Function} callback - Called when customer info changes
     * @returns {Function} Unsubscribe function
     */
    addCustomerInfoListener(callback) {
        this._ensureInitialized();

        console.log('👂 SubscriptionService: Adding customer info listener');

        try {
            // Add to internal tracking
            this._customerInfoListeners.push(callback);

            // Subscribe to RevenueCat updates
            Purchases.addCustomerInfoUpdateListener(callback);

            // Return unsubscribe function
            return () => {
                console.log('🔇 SubscriptionService: Removing customer info listener');
                this._customerInfoListeners = this._customerInfoListeners.filter(
                    (cb) => cb !== callback,
                );

                try {
                    Purchases.removeCustomerInfoUpdateListener(callback);
                } catch (error) {
                    console.warn('⚠️ Error removing listener:', error.message);
                }
            };
        } catch (error) {
            console.error('❌ Failed to add customer info listener:', error);
            // Return a no-op unsubscribe function
            return () => {
                this._customerInfoListeners = this._customerInfoListeners.filter(
                    (cb) => cb !== callback,
                );
            };
        }
    }

    /**
     * Logout from RevenueCat
     * Only call when truly needed (e.g., switching accounts)
     * @returns {Promise<Object>} New anonymous customerInfo
     */
    async logout() {
        if (!this._isInitialized) {
            console.log('⚠️ SubscriptionService: Not initialized, skipping logout');
            return;
        }

        try {
            console.log('👋 SubscriptionService: Logging out...');

            const customerInfo = await Purchases.logOut();

            console.log('✅ Logged out successfully');
            return customerInfo;
        } catch (error) {
            console.error('❌ Logout failed:', error);
            throw new Error(`Failed to logout: ${error.message}`);
        }
    }

    /**
     * Get the management URL for the customer's subscription
     * @returns {Promise<string|null>} Management URL or null
     */
    async getManagementURL() {
        this._ensureInitialized();

        try {
            const customerInfo = await Purchases.getCustomerInfo();
            return customerInfo?.managementURL ?? null;
        } catch (error) {
            console.error('❌ Failed to get management URL:', error);
            return null;
        }
    }

    /**
     * Ensure SDK is initialized before operations
     * @private
     */
    _ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error('SubscriptionService not initialized. Call init() first.');
        }
    }

    /**
     * Normalize purchase errors into user-friendly messages
     * @private
     * @param {Error} error
     * @returns {string}
     */
    _normalizePurchaseError(error) {
        if (error.userCancelled) {
            return 'Purchase cancelled';
        }

        const errorCode = error.code || error.message || '';

        // Map common error codes to user-friendly messages
        const errorMessages = {
            PURCHASE_NOT_ALLOWED: 'Purchases are not allowed on this device',
            PURCHASE_INVALID: 'This purchase is not valid',
            PRODUCT_NOT_AVAILABLE: 'This subscription is currently unavailable',
            NETWORK_ERROR: 'Network error. Please check your connection and try again',
            STORE_PROBLEM: 'There was a problem connecting to the App Store',
            PAYMENT_PENDING: 'Your payment is pending approval',
        };

        for (const [code, message] of Object.entries(errorMessages)) {
            if (errorCode.includes(code)) {
                return message;
            }
        }

        // Default error message
        return 'Unable to complete purchase. Please try again later.';
    }
}

// Export singleton instance
export default new SubscriptionService();
