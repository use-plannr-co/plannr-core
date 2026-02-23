import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get app version from Expo config
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const PLATFORM_OS = Platform.OS; // 'ios' or 'android'

/**
 * Enhanced API client with automatic version headers and update enforcement
 */
export class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = 'http://localhost:5001'; // baseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001';
    }

    /**
     * Make API request with automatic version headers
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Fetch options
     * @param {string|null} authToken - Optional auth token
     * @returns {Promise<Response>} - Fetch response
     */
    async makeRequest(endpoint, options = {}, authToken = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-App-Version': APP_VERSION,
            'X-Platform': PLATFORM_OS,
            ...options.headers,
        };

        // Add authentication if token provided
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        return response;
    }

    /**
     * Check app version compatibility with backend
     * @returns {Promise<{compatible: boolean, updateInfo?: object}>}
     */
    async checkAppCompatibility() {
        try {
            console.log(
                `🔍 Checking app compatibility - Version: ${APP_VERSION}, Platform: ${PLATFORM_OS}`,
            );

            const response = await this.makeRequest('/api/app/version', {
                method: 'GET',
            });

            // Handle update required response (426 Upgrade Required)
            if (response.status === 426) {
                const updateInfo = await response.json();
                console.warn('⚠️ App update required:', updateInfo);

                return {
                    compatible: false,
                    updateInfo: {
                        minVersion: updateInfo.minVersion,
                        platform: updateInfo.platform,
                        updateUrl: updateInfo.updateUrl,
                        message: updateInfo.message || 'Please update Plannr to continue.',
                    },
                };
            }

            // Handle version missing or other client errors
            if (response.status === 400) {
                const errorInfo = await response.json();
                if (errorInfo.code === 'APP_VERSION_MISSING') {
                    console.error('❌ App version missing from request headers');
                }
                // Allow app to proceed - this might be a config issue
                return { compatible: true };
            }

            // Handle successful response
            if (response.ok) {
                const versionInfo = await response.json();
                console.log('✅ App version compatible:', versionInfo);
                return { compatible: true };
            }

            // For other errors, allow app to proceed (could be server issues)
            console.warn('⚠️ Version check failed, allowing app to proceed:', response.status);
            return { compatible: true };
        } catch (error) {
            // Network errors - allow app to proceed (offline mode)
            console.warn('⚠️ Version check network error, allowing app to proceed:', error.message);
            return { compatible: true };
        }
    }

    /**
     * Parse and check if response indicates update requirement
     * @param {Response} response - Fetch response
     * @returns {Promise<{updateRequired: boolean, updateInfo?: object}>}
     */
    async checkForUpdateRequirement(response) {
        try {
            // Check status code first
            if (response.status === 426) {
                const data = await response.json();
                return {
                    updateRequired: true,
                    updateInfo: {
                        minVersion: data.minVersion,
                        platform: data.platform,
                        updateUrl: data.updateUrl,
                        message: data.message || 'Please update Plannr to continue.',
                    },
                };
            }

            // Check response body for update requirement code
            if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
                const data = await response.json();
                if (data.code === 'APP_UPDATE_REQUIRED') {
                    return {
                        updateRequired: true,
                        updateInfo: {
                            minVersion: data.minVersion,
                            platform: data.platform,
                            updateUrl: data.updateUrl,
                            message: data.message || 'Please update Plannr to continue.',
                        },
                    };
                }
            }

            return { updateRequired: false };
        } catch (error) {
            // If we can't parse the response, assume no update required
            return { updateRequired: false };
        }
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export constants for use in other modules
export { APP_VERSION, PLATFORM_OS };
