/**
 * Secure Token Cache for Clerk Authentication
 *
 * This module provides secure storage for Clerk authentication tokens using expo-secure-store.
 * It replaces the default Clerk token cache with encrypted storage that uses the device's
 * secure keychain (iOS) or keystore (Android).
 *
 * Features:
 * - Encrypted token storage using expo-secure-store
 * - Automatic token cleanup on logout
 * - Debug utilities for development
 * - Cross-platform compatibility (iOS Keychain / Android Keystore)
 *
 * Usage:
 * - Import and pass to ClerkProvider: tokenCache={tokenCache}
 * - Use TokenCacheUtils for additional functionality like logout cleanup
 *
 * Security Notes:
 * - Tokens are encrypted at rest
 * - iOS: Uses Keychain with WHEN_UNLOCKED_THIS_DEVICE_ONLY accessibility
 * - Android: Uses Android Keystore system
 * - requireAuthentication can be enabled for biometric/passcode protection
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure token cache for Clerk using expo-secure-store
 * This provides encrypted storage for authentication tokens
 */
const createTokenCache = () => {
    return {
        async getToken(key) {
            try {
                const item = await SecureStore.getItemAsync(key);
                if (item) {
                    console.log(`Retrieved token for key: ${key}`);
                    return item;
                } else {
                    console.log(`No token found for key: ${key}`);
                    return null;
                }
            } catch (error) {
                console.error(`Error getting token for key ${key}:`, error);
                return null;
            }
        },

        async saveToken(key, token) {
            try {
                // SecureStore options for enhanced security
                const options = {
                    requireAuthentication: false, // Set to true if you want biometric/passcode requirement
                    ...(Platform.OS === 'ios' && {
                        accessibility: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
                    }),
                };

                await SecureStore.setItemAsync(key, token, options);
                console.log(`Saved token for key: ${key}`);
            } catch (error) {
                console.error(`Error saving token for key ${key}:`, error);
            }
        },

        async clearToken(key) {
            try {
                await SecureStore.deleteItemAsync(key);
                console.log(`Cleared token for key: ${key}`);
            } catch (error) {
                console.error(`Error clearing token for key ${key}:`, error);
            }
        },

        async clearAllTokens() {
            try {
                // Get all Clerk-related keys and clear them
                const keysToCheck = [
                    '__clerk_client_jwt',
                    '__clerk_refresh_token',
                    '__clerk_session_token',
                    '__clerk_user_token',
                ];

                for (const key of keysToCheck) {
                    try {
                        await SecureStore.deleteItemAsync(key);
                        console.log(`Cleared token for key: ${key}`);
                    } catch (error) {
                        // Continue clearing other tokens even if one fails
                        console.log(`No token to clear for key: ${key}`);
                    }
                }

                console.log('Cleared all authentication tokens');
            } catch (error) {
                console.error('Error clearing all tokens:', error);
            }
        },

        // Additional utility methods
        async hasToken(key) {
            try {
                const item = await SecureStore.getItemAsync(key);
                return item !== null;
            } catch (error) {
                console.error(`Error checking token for key ${key}:`, error);
                return false;
            }
        },

        async getAllStoredKeys() {
            try {
                // This is mainly for debugging - SecureStore doesn't provide a way to list all keys
                // So we check common Clerk keys
                const commonKeys = [
                    '__clerk_client_jwt',
                    '__clerk_refresh_token',
                    '__clerk_session_token',
                    '__clerk_user_token',
                ];

                const storedKeys = [];
                for (const key of commonKeys) {
                    if (await this.hasToken(key)) {
                        storedKeys.push(key);
                    }
                }

                return storedKeys;
            } catch (error) {
                console.error('Error getting stored keys:', error);
                return [];
            }
        },
    };
};

// Export the token cache instance
export const tokenCache = createTokenCache();

// Export additional utilities
export const TokenCacheUtils = {
    /**
     * Clear all authentication data (useful for logout)
     */
    clearAllAuthData: () => tokenCache.clearAllTokens(),

    /**
     * Check if user has stored authentication tokens
     */
    hasAuthTokens: async () => {
        const keys = await tokenCache.getAllStoredKeys();
        return keys.length > 0;
    },

    /**
     * Get debug info about stored tokens (for development)
     */
    getDebugInfo: async () => {
        if (__DEV__) {
            const keys = await tokenCache.getAllStoredKeys();
            console.log('Stored authentication keys:', keys);
            return keys;
        }
        return [];
    },
};
