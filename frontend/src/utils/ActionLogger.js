/**
 * Action Logger - Singleton Pattern
 *
 * Logs user actions and system events for debugging and crash reporting.
 * Uses singleton pattern to ensure single instance across the app.
 * Automatically collects device info, session data, and user interactions.
 *
 * Features:
 * - Singleton pattern for global access
 * - Persistent storage using AsyncStorage
 * - Automatic session management
 * - Device and app info collection
 * - Action timestamping
 * - Log rotation (keeps last 1000 actions)
 * - Export functionality for crash reports
 *
 * Usage:
 * import { ActionLogger } from '../utils/ActionLogger';
 * ActionLogger.logAction('SCREEN_NAVIGATION', { from: 'Home', to: 'Profile' });
 * ActionLogger.logError('API_CALL_FAILED', error, { endpoint: '/api/user' });
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

const ACTION_LOG_KEY = '@plannr_action_logs';
const MAX_ACTIONS = 1000; // Keep last 1000 actions
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class ActionLoggerClass {
    constructor() {
        if (ActionLoggerClass.instance) {
            return ActionLoggerClass.instance;
        }

        this.sessionId = this.generateSessionId();
        this.sessionStart = new Date().toISOString();
        this.actions = [];
        this.initialized = false;
        this.deviceInfo = null;

        ActionLoggerClass.instance = this;
        this.init();
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async init() {
        try {
            // Collect device information once
            await this.collectDeviceInfo();

            // Load existing logs
            await this.loadLogs();

            // Log session start
            this.logAction('SESSION_START', {
                sessionId: this.sessionId,
                timestamp: this.sessionStart,
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize ActionLogger:', error);
        }
    }

    async collectDeviceInfo() {
        try {
            this.deviceInfo = {
                // Device Info
                platform: Platform.OS,
                platformVersion: Platform.Version,
                deviceName: Device.deviceName,
                deviceType: Device.deviceType,
                manufacturer: Device.manufacturer,
                modelName: Device.modelName,
                osName: Device.osName,
                osVersion: Device.osVersion,

                // App Info
                appName: Application.applicationName,
                appVersion: Application.nativeApplicationVersion,
                buildVersion: Application.nativeBuildVersion,
                bundleId: Application.applicationId,

                // Expo Info
                expoVersion: Constants.expoVersion,

                // System Info
                isDevice: Device.isDevice,
                brand: Device.brand,

                // Memory info (if available)
                totalMemory: Device.totalMemory,

                // Screen info
                screenData: Constants.screenData,

                // Other
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                locale: Intl.DateTimeFormat().resolvedOptions().locale,
            };
        } catch (error) {
            console.error('Failed to collect device info:', error);
            this.deviceInfo = { error: 'Failed to collect device info' };
        }
    }

    async loadLogs() {
        try {
            const storedLogs = await AsyncStorage.getItem(ACTION_LOG_KEY);
            if (storedLogs) {
                const parsed = JSON.parse(storedLogs);
                this.actions = Array.isArray(parsed) ? parsed : [];

                // Remove old actions if we have too many
                if (this.actions.length > MAX_ACTIONS) {
                    this.actions = this.actions.slice(-MAX_ACTIONS);
                }
            }
        } catch (error) {
            console.error('Failed to load action logs:', error);
            this.actions = [];
        }
    }

    async saveLogs() {
        try {
            // Only keep the most recent actions
            const logsToSave = this.actions.slice(-MAX_ACTIONS);
            await AsyncStorage.setItem(ACTION_LOG_KEY, JSON.stringify(logsToSave));
        } catch (error) {
            console.error('Failed to save action logs:', error);
        }
    }

    /**
     * Log a user action
     */
    logAction(actionType, data = {}, context = {}) {
        const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: actionType,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            data,
            context,
            level: 'INFO',
        };

        this.actions.push(action);
        this.saveLogs(); // Save asynchronously

        if (__DEV__) {
            console.log(`[ActionLogger] ${actionType}:`, data);
        }
    }

    /**
     * Log an error
     */
    logError(errorType, error, context = {}) {
        const action = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: errorType,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            level: 'ERROR',
            error: {
                message: error?.message || 'Unknown error',
                stack: error?.stack || 'No stack trace',
                name: error?.name || 'Error',
            },
            context,
        };

        this.actions.push(action);
        this.saveLogs(); // Save asynchronously

        console.error(`[ActionLogger] ${errorType}:`, error, context);
    }

    /**
     * Log a warning
     */
    logWarning(warningType, message, context = {}) {
        const action = {
            id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: warningType,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            level: 'WARNING',
            message,
            context,
        };

        this.actions.push(action);
        this.saveLogs(); // Save asynchronously

        if (__DEV__) {
            console.warn(`[ActionLogger] ${warningType}:`, message, context);
        }
    }

    /**
     * Get current session info
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            sessionStart: this.sessionStart,
            sessionDuration: Date.now() - new Date(this.sessionStart).getTime(),
            totalActions: this.actions.length,
            deviceInfo: this.deviceInfo,
        };
    }

    /**
     * Get recent actions (for debugging)
     */
    getRecentActions(count = 50) {
        return this.actions.slice(-count);
    }

    /**
     * Get all actions in current session
     */
    getCurrentSessionActions() {
        return this.actions.filter((action) => action.sessionId === this.sessionId);
    }

    /**
     * Export logs for crash reporting
     */
    async exportLogs() {
        const sessionInfo = this.getSessionInfo();
        const recentActions = this.getRecentActions(200); // Last 200 actions

        const exportData = {
            exportTimestamp: new Date().toISOString(),
            session: sessionInfo,
            device: this.deviceInfo,
            recentActions,
            summary: {
                totalActionsInSession: this.getCurrentSessionActions().length,
                errorCount: recentActions.filter((a) => a.level === 'ERROR').length,
                warningCount: recentActions.filter((a) => a.level === 'WARNING').length,
                sessionDurationMinutes: Math.floor(sessionInfo.sessionDuration / (1000 * 60)),
            },
        };

        return exportData;
    }

    /**
     * Clear all logs (for privacy)
     */
    async clearLogs() {
        try {
            this.actions = [];
            await AsyncStorage.removeItem(ACTION_LOG_KEY);

            // Start fresh session
            this.sessionId = this.generateSessionId();
            this.sessionStart = new Date().toISOString();

            this.logAction('LOGS_CLEARED', { reason: 'User requested' });
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    /**
     * Get logs as formatted string (for sharing)
     */
    async getLogsAsString() {
        const exportData = await this.exportLogs();
        return JSON.stringify(exportData, null, 2);
    }
}

// Create and export singleton instance
export const ActionLogger = new ActionLoggerClass();

// Export common action types for consistency
export const ActionTypes = {
    // Navigation
    SCREEN_NAVIGATION: 'SCREEN_NAVIGATION',
    TAB_SWITCH: 'TAB_SWITCH',
    MODAL_OPEN: 'MODAL_OPEN',
    MODAL_CLOSE: 'MODAL_CLOSE',

    // User Actions
    BUTTON_PRESS: 'BUTTON_PRESS',
    INPUT_CHANGE: 'INPUT_CHANGE',
    FORM_SUBMIT: 'FORM_SUBMIT',
    SETTING_CHANGE: 'SETTING_CHANGE',

    // App State
    APP_FOREGROUND: 'APP_FOREGROUND',
    APP_BACKGROUND: 'APP_BACKGROUND',
    SESSION_START: 'SESSION_START',
    SESSION_END: 'SESSION_END',

    // API Calls
    API_REQUEST: 'API_REQUEST',
    API_SUCCESS: 'API_SUCCESS',
    API_ERROR: 'API_ERROR',

    // Scheduling
    SCHEDULE_GENERATE: 'SCHEDULE_GENERATE',
    SCHEDULE_ACTIVATE: 'SCHEDULE_ACTIVATE',
    TASK_COMPLETE: 'TASK_COMPLETE',
    TASK_RESCHEDULE: 'TASK_RESCHEDULE',

    // Authentication
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    TOKEN_REFRESH: 'TOKEN_REFRESH',

    // Errors
    CRASH: 'CRASH',
    JAVASCRIPT_ERROR: 'JAVASCRIPT_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',

    // Debug
    LOGS_CLEARED: 'LOGS_CLEARED',
    LOGS_EXPORTED: 'LOGS_EXPORTED',
};

export default ActionLogger;
