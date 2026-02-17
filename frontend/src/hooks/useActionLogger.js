/**
 * Action Logging Hook
 *
 * React hook for easy integration of ActionLogger in components.
 * Provides convenient methods for logging user actions and tracking screen views.
 *
 * Usage:
 * const { logAction, logScreenView, logError, logUserAction } = useActionLogger();
 *
 * Examples:
 * logScreenView('UserProfile');
 * logUserAction('button_press', { button: 'save_preferences' });
 * logError('api_call_failed', error, { endpoint: '/api/user' });
 */

import { useEffect, useCallback } from 'react';
import { ActionLogger, ActionTypes } from '../utils/ActionLogger';
import { useFocusEffect } from '@react-navigation/native';

export const useActionLogger = (screenName = null) => {
    // Log screen view when component mounts or screen focuses
    useFocusEffect(
        useCallback(() => {
            if (screenName) {
                ActionLogger.logAction(ActionTypes.SCREEN_NAVIGATION, {
                    screen: screenName,
                    timestamp: new Date().toISOString(),
                });
            }
        }, [screenName]),
    );

    // Convenient logging functions
    const logAction = useCallback(
        (actionType, data = {}, context = {}) => {
            ActionLogger.logAction(actionType, data, { ...context, screen: screenName });
        },
        [screenName],
    );

    const logError = useCallback(
        (errorType, error, context = {}) => {
            ActionLogger.logError(errorType, error, { ...context, screen: screenName });
        },
        [screenName],
    );

    const logWarning = useCallback(
        (warningType, message, context = {}) => {
            ActionLogger.logWarning(warningType, message, { ...context, screen: screenName });
        },
        [screenName],
    );

    const logUserAction = useCallback(
        (action, data = {}) => {
            ActionLogger.logAction(
                ActionTypes.BUTTON_PRESS,
                {
                    action,
                    ...data,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logScreenView = useCallback(
        (screen) => {
            ActionLogger.logAction(ActionTypes.SCREEN_NAVIGATION, {
                screen,
                previousScreen: screenName,
                timestamp: new Date().toISOString(),
            });
        },
        [screenName],
    );

    const logApiCall = useCallback(
        (endpoint, method = 'GET', data = {}) => {
            ActionLogger.logAction(
                ActionTypes.API_REQUEST,
                {
                    endpoint,
                    method,
                    ...data,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logApiSuccess = useCallback(
        (endpoint, data = {}) => {
            ActionLogger.logAction(
                ActionTypes.API_SUCCESS,
                {
                    endpoint,
                    ...data,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logApiError = useCallback(
        (endpoint, error, data = {}) => {
            ActionLogger.logError(ActionTypes.API_ERROR, error, {
                endpoint,
                ...data,
                screen: screenName,
            });
        },
        [screenName],
    );

    const logFormSubmit = useCallback(
        (formName, data = {}) => {
            ActionLogger.logAction(
                ActionTypes.FORM_SUBMIT,
                {
                    form: formName,
                    ...data,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logSettingChange = useCallback(
        (setting, value, previousValue = null) => {
            ActionLogger.logAction(
                ActionTypes.SETTING_CHANGE,
                {
                    setting,
                    value,
                    previousValue,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logModalOpen = useCallback(
        (modalName, data = {}) => {
            ActionLogger.logAction(
                ActionTypes.MODAL_OPEN,
                {
                    modal: modalName,
                    ...data,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logModalClose = useCallback(
        (modalName, data = {}) => {
            ActionLogger.logAction(
                ActionTypes.MODAL_CLOSE,
                {
                    modal: modalName,
                    ...data,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    const logScheduleAction = useCallback(
        (action, scheduleData = {}) => {
            const actionType =
                {
                    generate: ActionTypes.SCHEDULE_GENERATE,
                    activate: ActionTypes.SCHEDULE_ACTIVATE,
                    complete_task: ActionTypes.TASK_COMPLETE,
                    reschedule: ActionTypes.TASK_RESCHEDULE,
                }[action] || ActionTypes.BUTTON_PRESS;

            ActionLogger.logAction(
                actionType,
                {
                    action,
                    ...scheduleData,
                },
                { screen: screenName },
            );
        },
        [screenName],
    );

    return {
        // Generic logging
        logAction,
        logError,
        logWarning,

        // Specific action types
        logUserAction,
        logScreenView,
        logApiCall,
        logApiSuccess,
        logApiError,
        logFormSubmit,
        logSettingChange,
        logModalOpen,
        logModalClose,
        logScheduleAction,

        // Get logger instance for advanced usage
        logger: ActionLogger,
    };
};

// Hook for tracking component lifecycle
export const useComponentLogger = (componentName) => {
    const { logAction } = useActionLogger();

    useEffect(() => {
        logAction(ActionTypes.SCREEN_NAVIGATION, {
            component: componentName,
            lifecycle: 'mount',
        });

        return () => {
            logAction(ActionTypes.SCREEN_NAVIGATION, {
                component: componentName,
                lifecycle: 'unmount',
            });
        };
    }, [componentName, logAction]);

    return { logAction };
};

// Hook for tracking API calls
export const useApiLogger = (screenName) => {
    const { logApiCall, logApiSuccess, logApiError } = useActionLogger(screenName);

    const wrapApiCall = useCallback(
        async (apiFunction, endpoint, method = 'GET') => {
            logApiCall(endpoint, method);

            try {
                const result = await apiFunction();
                logApiSuccess(endpoint, {
                    success: true,
                    statusCode: result?.status || 200,
                });
                return result;
            } catch (error) {
                logApiError(endpoint, error, {
                    statusCode: error?.status || 500,
                });
                throw error;
            }
        },
        [logApiCall, logApiSuccess, logApiError],
    );

    return { wrapApiCall };
};

export default useActionLogger;
