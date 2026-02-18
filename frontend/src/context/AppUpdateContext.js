import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { setGlobalUpdateHandler } from '../utils/authenticatedAPI';

const AppUpdateContext = createContext();

/**
 * App Update Context Provider
 * Manages global app update state and provides version checking functionality
 */
export const AppUpdateProvider = ({ children }) => {
    const [updateState, setUpdateState] = useState({
        forceUpdate: false,
        updateInfo: null,
        checking: false,
        hasChecked: false,
    });

    /**
     * Check app compatibility with backend
     */
    const checkAppCompatibility = async () => {
        if (updateState.checking) {
            return; // Prevent duplicate checks
        }

        setUpdateState((prev) => ({ ...prev, checking: true }));

        try {
            console.log('🔄 Starting app compatibility check...');
            const result = await apiClient.checkAppCompatibility();

            if (result.compatible) {
                console.log('✅ App is compatible');
                setUpdateState((prev) => ({
                    ...prev,
                    checking: false,
                    hasChecked: true,
                    forceUpdate: false,
                    updateInfo: null,
                }));
            } else {
                console.warn('⚠️ App update required:', result.updateInfo);
                setUpdateState((prev) => ({
                    ...prev,
                    checking: false,
                    hasChecked: true,
                    forceUpdate: true,
                    updateInfo: result.updateInfo,
                }));
            }
        } catch (error) {
            console.error('❌ App compatibility check failed:', error);
            // On error, allow app to proceed
            setUpdateState((prev) => ({
                ...prev,
                checking: false,
                hasChecked: true,
                forceUpdate: false,
                updateInfo: null,
            }));
        }
    };

    /**
     * Force update requirement (called by API responses)
     */
    const triggerForceUpdate = (updateInfo) => {
        console.warn('🚨 Force update triggered by API response:', updateInfo);
        setUpdateState((prev) => ({
            ...prev,
            forceUpdate: true,
            updateInfo,
        }));
    };

    /**
     * Reset update state after user dismisses alert or updates
     * This allows the alert to be shown again if needed
     */
    const resetUpdateState = () => {
        setUpdateState((prev) => ({
            ...prev,
            forceUpdate: false,
            updateInfo: null,
        }));
    };

    /**
     * Retry compatibility check
     */
    const retryCheck = () => {
        setUpdateState((prev) => ({
            ...prev,
            hasChecked: false,
            forceUpdate: false,
            updateInfo: null,
        }));
        checkAppCompatibility();
    };

    // Register global update handler for API calls
    useEffect(() => {
        setGlobalUpdateHandler(triggerForceUpdate);

        // Cleanup on unmount
        return () => {
            setGlobalUpdateHandler(null);
        };
    }, []);

    // Initial compatibility check on mount
    useEffect(() => {
        if (!updateState.hasChecked && !updateState.checking) {
            // Small delay to ensure app is fully initialized
            const timer = setTimeout(() => {
                checkAppCompatibility();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [updateState.hasChecked, updateState.checking]);

    const contextValue = {
        updateState,
        checkAppCompatibility,
        triggerForceUpdate,
        retryCheck,
        resetUpdateState,
    };

    return <AppUpdateContext.Provider value={contextValue}>{children}</AppUpdateContext.Provider>;
};

/**
 * Hook to use app update context
 */
export const useAppUpdate = () => {
    const context = useContext(AppUpdateContext);
    if (!context) {
        throw new Error('useAppUpdate must be used within an AppUpdateProvider');
    }
    return context;
};
