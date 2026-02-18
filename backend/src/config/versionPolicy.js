/**
 * App Version Policy Configuration
 *
 * Centralized configuration for minimum required app versions per platform
 */

export const VERSION_POLICY = {
    // Minimum required versions by platform
    minVersions: {
        ios: '1.1.1',
        android: '1.1.1', // For future Android support
    },

    // App Store URLs for updates
    updateUrls: {
        ios: 'https://apps.apple.com/app/plannr/id6748265401',
        android: 'https://play.google.com/store/apps/details?id=com.sthareja19.Plannr', // For future use
    },

    // Routes that should skip version enforcement
    exemptRoutes: [
        '/health',
        '/metrics',
        '/api/health',
        '/api/metrics',
        '/api/app/version', // Allow version endpoint to be accessed without enforcement
        // Add any auth webhooks or other exempt routes here
    ],

    // Default messages
    messages: {
        versionMissing: 'App version required',
        updateRequired: 'Please update Plannr to continue.',
    },
};

/**
 * Get minimum version for a platform
 * @param {string} platform - Platform name ("ios", "android", etc.)
 * @returns {string} - Minimum version string
 */
export const getMinVersion = (platform) => {
    return VERSION_POLICY.minVersions[platform?.toLowerCase()] || VERSION_POLICY.minVersions.ios;
};

/**
 * Get update URL for a platform
 * @param {string} platform - Platform name ("ios", "android", etc.)
 * @returns {string} - Update URL
 */
export const getUpdateUrl = (platform) => {
    return VERSION_POLICY.updateUrls[platform?.toLowerCase()] || VERSION_POLICY.updateUrls.ios;
};

/**
 * Check if a route should be exempt from version enforcement
 * @param {string} path - Request path
 * @returns {boolean} - True if route should be exempt
 */
export const isExemptRoute = (path) => {
    return VERSION_POLICY.exemptRoutes.some(
        (exemptPath) => path === exemptPath || path.startsWith(exemptPath)
    );
};
