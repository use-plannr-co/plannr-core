/**
 * App Version Enforcement Middleware
 * 
 * Enforces minimum app version requirements for API access
 */

import { isVersionValid } from '../utils/versionUtils.js';
import { getMinVersion, getUpdateUrl, isExemptRoute, VERSION_POLICY } from '../config/versionPolicy.js';

/**
 * Middleware to enforce minimum app version requirements
 * @param {object} req - Express request object
 * @param {object} res - Express response object  
 * @param {function} next - Express next function
 */
export const enforceMinAppVersion = (req, res, next) => {
    try {
        // Skip enforcement for exempt routes
        if (isExemptRoute(req.path)) {
            return next();
        }

        // Get version and platform from headers
        const appVersion = req.headers['x-app-version'];
        const platform = req.headers['x-platform'] || 'ios'; // Default to iOS

        // Check if app version header is missing
        if (!appVersion) {
            return res.status(400).json({
                code: "APP_VERSION_MISSING",
                message: VERSION_POLICY.messages.versionMissing
            });
        }

        // Get minimum required version for this platform
        const minVersion = getMinVersion(platform);

        // Check if current version meets minimum requirement
        if (!isVersionValid(appVersion, minVersion)) {
            return res.status(426).json({
                code: "APP_UPDATE_REQUIRED",
                minVersion: minVersion,
                platform: platform.toLowerCase(),
                updateUrl: getUpdateUrl(platform),
                message: VERSION_POLICY.messages.updateRequired
            });
        }

        // Version is valid, proceed with request
        next();

    } catch (error) {
        console.error('Version enforcement middleware error:', error);
        
        // On error, allow request to proceed to avoid blocking users
        // Log the error for monitoring
        next();
    }
};

/**
 * Example middleware behavior:
 * 
 * Request with headers:
 * - X-App-Version: "1.1.0"
 * - X-Platform: "ios"
 * 
 * Result: HTTP 426 Upgrade Required
 * {
 *   "code": "APP_UPDATE_REQUIRED",
 *   "minVersion": "1.1.1", 
 *   "platform": "ios",
 *   "updateUrl": "https://apps.apple.com/app/plannr/id6748265401",
 *   "message": "Please update Plannr to continue."
 * }
 * 
 * Request with headers:
 * - X-App-Version: "1.1.1" 
 * - X-Platform: "ios"
 * 
 * Result: Proceeds to next middleware (200 OK for valid requests)
 * 
 * Request with headers:
 * - X-App-Version: "1.2.0"
 * - X-Platform: "ios" 
 * 
 * Result: Proceeds to next middleware (newer version allowed)
 * 
 * Request to /health or /api/health:
 * Result: Always proceeds regardless of version headers
 */
