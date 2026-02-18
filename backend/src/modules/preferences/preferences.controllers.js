import * as repo from './preferences.repo.js';
import * as userRepo from '../users/users.repo.js';
import { mapFrontendToBackend, mapBackendToFrontend } from './preferences.validators.js';

/**
 * Preferences Controllers
 * Handles user preferences HTTP requests
 */

export const getPreferences = async (req, res, next) => {
    try {
        const clerkUserId = req.headers['x-clerk-user-id'] || req.query.clerkUserId;

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const userPreferences = await repo.getPreferencesByClerkId(clerkUserId);

        if (!userPreferences) {
            // If no preferences exist, create default ones
            const user = await userRepo.getUserByClerkId(clerkUserId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            const defaultPreferences = await repo.createPreferences(user.id);
            const frontendPrefs = mapBackendToFrontend(defaultPreferences);

            return res.status(200).json({
                success: true,
                data: frontendPrefs,
                message: 'Default preferences created and retrieved successfully',
            });
        }

        // Convert backend format to frontend format
        const frontendPrefs = mapBackendToFrontend(userPreferences);

        res.status(200).json({
            success: true,
            data: frontendPrefs,
            message: 'Preferences retrieved successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const updatePreferences = async (req, res, next) => {
    try {
        const clerkUserId = req.headers['x-clerk-user-id'] || req.query.clerkUserId;

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Debug logging
        console.log('🔍 Raw request body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 Validated data:', JSON.stringify(req.validatedData, null, 2));
        console.log('🎯 Default strategy in validated data:', req.validatedData.defaultStrategy);

        // Convert frontend preferences to backend format
        const backendPrefs = mapFrontendToBackend(req.validatedData);
        console.log('🔄 Mapped backend prefs:', JSON.stringify(backendPrefs, null, 2));
        console.log('🎯 Default strategy in backend prefs:', backendPrefs.defaultStrategy);

        // Check if preferences exist
        let userPreferences = await repo.getPreferencesByUserId(user.id);

        if (!userPreferences) {
            console.log('📝 Creating new preferences...');
            // Create new preferences if they don't exist
            userPreferences = await repo.createPreferences(user.id, req.validatedData);
        } else {
            console.log('🔄 Updating existing preferences...');
            console.log(
                '🔍 Before update - existing prefs:',
                JSON.stringify(userPreferences, null, 2)
            );
            // Update existing preferences
            userPreferences = await repo.updatePreferences(user.id, backendPrefs);
            console.log('✅ After update - new prefs:', JSON.stringify(userPreferences, null, 2));
        }

        // Convert back to frontend format for response
        const frontendPrefs = mapBackendToFrontend(userPreferences);
        console.log('🔄 Final frontend prefs:', JSON.stringify(frontendPrefs, null, 2));
        console.log('🎯 Final default strategy:', frontendPrefs.defaultStrategy);

        res.status(200).json({
            success: true,
            message: 'Preferences updated successfully',
            data: frontendPrefs,
        });
    } catch (error) {
        console.error('💥 Error in updatePreferences:', error);
        next(error);
    }
};

export const resetPreferences = async (req, res, next) => {
    try {
        const clerkUserId = req.headers['x-clerk-user-id'] || req.query.clerkUserId;

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if preferences exist
        const existingPrefs = await repo.getPreferencesByUserId(user.id);

        let resetPreferences;
        if (!existingPrefs) {
            // Create default preferences if they don't exist
            resetPreferences = await repo.createPreferences(user.id);
        } else {
            // Reset existing preferences
            resetPreferences = await repo.resetPreferences(user.id);
        }

        // Convert to frontend format
        const frontendPrefs = mapBackendToFrontend(resetPreferences);

        res.status(200).json({
            success: true,
            message: 'Preferences reset successfully',
            data: frontendPrefs,
        });
    } catch (error) {
        next(error);
    }
};
