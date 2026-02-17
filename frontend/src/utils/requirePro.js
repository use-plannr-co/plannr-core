/**
 * requirePro - Navigation guard for Pro features
 *
 * Use this helper to check if a user has Pro access before navigating
 * to a premium screen. If not Pro, redirects to paywall.
 *
 * @param {boolean} isPro - Whether user has Pro subscription
 * @param {object} navigation - React Navigation object
 * @param {string} targetRoute - The Pro route to navigate to
 * @param {string} featureKey - Identifier for tracking
 * @param {object} params - Optional params to pass to target route
 * @returns {boolean} - Returns true if navigation occurred, false if blocked
 *
 * @example
 * // In a button/link handler
 * onPress={() => {
 *   if (!requirePro(isPro, navigation, 'ProductivityAnalytics', 'productivity_analytics')) {
 *     return; // User doesn't have Pro, they've been redirected to paywall
 *   }
 *   // Pro user - additional logic can go here
 * }}
 */
export const requirePro = (isPro, navigation, targetRoute, featureKey, params = {}) => {
    if (!isPro) {
        // Redirect to paywall with context
        navigation.navigate('ProPaywall', { featureKey });
        return false;
    }

    // User has Pro - navigate to target route
    navigation.navigate(targetRoute, params);
    return true;
};

/**
 * checkProAccess - Simple Pro check without navigation
 *
 * Use this for conditional rendering or logic that doesn't involve navigation
 *
 * @param {boolean} isPro - Whether user has Pro subscription
 * @param {Function} callback - Function to execute if user has Pro
 * @returns {boolean} - Returns true if user has Pro, false otherwise
 *
 * @example
 * checkProAccess(isPro, () => {
 *   // This code only runs for Pro users
 *   enableAdvancedFeature();
 * });
 */
export const checkProAccess = (isPro, callback) => {
    if (isPro && callback) {
        callback();
        return true;
    }
    return false;
};
