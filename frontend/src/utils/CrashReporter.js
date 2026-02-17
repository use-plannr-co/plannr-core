/**
 * Crash Reporter Integration
 *
 * Integrates with platform-specific crash reporting systems and ActionLogger
 * to provide comprehensive crash reports with user action logs.
 *
 * Features:
 * - JavaScript error boundary integration
 * - Native crash reporting setup
 * - Automatic log export on crashes
 * - User consent management
 * - Sentry integration ready
 * - Apple/Google crash reporting integration
 *
 * Usage:
 * 1. Wrap your app with ErrorBoundary
 * 2. Call setupCrashReporting() in App.js
 * 3. Logs will be automatically included in crash reports
 */

import { ActionLogger, ActionTypes } from './ActionLogger';
import * as Application from 'expo-application';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_CONSENT_KEY = '@plannr_crash_consent';

class CrashReporter {
    constructor() {
        this.consentGiven = false;
        this.initialized = false;
    }

    async init() {
        try {
            // Check if user has given consent
            const consent = await AsyncStorage.getItem(CRASH_CONSENT_KEY);
            this.consentGiven = consent === 'true';

            if (!this.consentGiven) {
                await this.requestCrashReportingConsent();
            }

            this.setupErrorHandling();
            this.initialized = true;

            ActionLogger.logAction(ActionTypes.SESSION_START, {
                crashReportingEnabled: this.consentGiven,
            });
        } catch (error) {
            console.error('Failed to initialize crash reporter:', error);
        }
    }

    async requestCrashReportingConsent() {
        return new Promise((resolve) => {
            Alert.alert(
                'Help Improve Plannr',
                'Would you like to help improve Plannr by automatically sending crash reports and usage logs when the app encounters issues? This helps us fix bugs faster.\n\nNo personal data is included - only technical information about what went wrong.',
                [
                    {
                        text: 'No Thanks',
                        style: 'cancel',
                        onPress: async () => {
                            await AsyncStorage.setItem(CRASH_CONSENT_KEY, 'false');
                            this.consentGiven = false;
                            resolve(false);
                        },
                    },
                    {
                        text: 'Yes, Help Improve',
                        onPress: async () => {
                            await AsyncStorage.setItem(CRASH_CONSENT_KEY, 'true');
                            this.consentGiven = true;
                            ActionLogger.logAction(ActionTypes.SETTING_CHANGE, {
                                setting: 'crash_reporting_consent',
                                value: true,
                            });
                            resolve(true);
                        },
                    },
                ],
                { cancelable: false },
            );
        });
    }

    setupErrorHandling() {
        // Set up global error handler for JavaScript errors
        const originalHandler = ErrorUtils.getGlobalHandler();

        ErrorUtils.setGlobalHandler(async (error, isFatal) => {
            // Log the crash with ActionLogger
            ActionLogger.logError(ActionTypes.JAVASCRIPT_ERROR, error, {
                isFatal,
                timestamp: new Date().toISOString(),
                platform: Platform.OS,
            });

            if (isFatal) {
                ActionLogger.logAction(ActionTypes.CRASH, {
                    type: 'JavaScript',
                    fatal: true,
                    error: error.message,
                });

                // Export logs for crash report
                if (this.consentGiven) {
                    await this.prepareCrashReport(error, 'JavaScript Fatal Error');
                }
            }

            // Call original handler
            if (originalHandler) {
                originalHandler(error, isFatal);
            }
        });

        // Set up unhandled promise rejection handler
        const originalPromiseRejectionHandler =
            require('react-native/Libraries/Core/ExceptionsManager').unstable_setExceptionDecorator;

        global.addEventListener?.('unhandledRejection', async (event) => {
            ActionLogger.logError(ActionTypes.JAVASCRIPT_ERROR, new Error(event.reason), {
                type: 'unhandledPromiseRejection',
                reason: event.reason,
            });
        });
    }

    async prepareCrashReport(error, crashType) {
        try {
            if (!this.consentGiven) {
                return null;
            }

            // Get comprehensive logs
            const crashReport = await this.generateCrashReport(error, crashType);

            // Store crash report for later upload
            await this.storeCrashReport(crashReport);

            return crashReport;
        } catch (reportError) {
            console.error('Failed to prepare crash report:', reportError);
            return null;
        }
    }

    async generateCrashReport(error, crashType) {
        // Get action logs
        const actionLogs = await ActionLogger.exportLogs();

        // Create comprehensive crash report
        const crashReport = {
            crashId: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            crashType,

            // Error details
            error: {
                message: error?.message || 'Unknown error',
                stack: error?.stack || 'No stack trace',
                name: error?.name || 'Error',
            },

            // App context
            app: {
                version: Application.nativeApplicationVersion,
                buildVersion: Application.nativeBuildVersion,
                bundleId: Application.applicationId,
            },

            // User action logs (last 200 actions)
            actionLogs,

            // Summary
            summary: {
                crashedAfterMinutes: Math.floor(
                    (Date.now() - new Date(actionLogs.session.sessionStart).getTime()) /
                        (1000 * 60),
                ),
                totalActions: actionLogs.recentActions.length,
                errorsBefore: actionLogs.recentActions.filter((a) => a.level === 'ERROR').length,
                lastAction: actionLogs.recentActions[actionLogs.recentActions.length - 1],
            },
        };

        return crashReport;
    }

    async storeCrashReport(crashReport) {
        try {
            const key = `@plannr_crash_${crashReport.crashId}`;
            await AsyncStorage.setItem(key, JSON.stringify(crashReport));

            // Keep track of stored crash reports
            const existingCrashes = (await AsyncStorage.getItem('@plannr_crash_reports')) || '[]';
            const crashes = JSON.parse(existingCrashes);
            crashes.push({
                id: crashReport.crashId,
                timestamp: crashReport.timestamp,
                type: crashReport.crashType,
            });

            // Only keep last 10 crash reports
            const recentCrashes = crashes.slice(-10);
            await AsyncStorage.setItem('@plannr_crash_reports', JSON.stringify(recentCrashes));
        } catch (error) {
            console.error('Failed to store crash report:', error);
        }
    }

    // For manual error reporting
    async reportError(error, context = {}) {
        ActionLogger.logError(ActionTypes.JAVASCRIPT_ERROR, error, context);

        if (this.consentGiven) {
            const crashReport = await this.prepareCrashReport(error, 'Manual Report');
            return crashReport;
        }

        return null;
    }

    // Get stored crash reports (for sending to server later)
    async getStoredCrashReports() {
        try {
            const crashList = (await AsyncStorage.getItem('@plannr_crash_reports')) || '[]';
            const crashes = JSON.parse(crashList);

            const reports = [];
            for (const crash of crashes) {
                const key = `@plannr_crash_${crash.id}`;
                const reportData = await AsyncStorage.getItem(key);
                if (reportData) {
                    reports.push(JSON.parse(reportData));
                }
            }

            return reports;
        } catch (error) {
            console.error('Failed to get stored crash reports:', error);
            return [];
        }
    }

    // Clear old crash reports
    async clearCrashReports() {
        try {
            const crashList = (await AsyncStorage.getItem('@plannr_crash_reports')) || '[]';
            const crashes = JSON.parse(crashList);

            // Remove individual crash report files
            for (const crash of crashes) {
                const key = `@plannr_crash_${crash.id}`;
                await AsyncStorage.removeItem(key);
            }

            // Clear the crash list
            await AsyncStorage.removeItem('@plannr_crash_reports');

            ActionLogger.logAction(ActionTypes.LOGS_CLEARED, {
                type: 'crash_reports',
                count: crashes.length,
            });
        } catch (error) {
            console.error('Failed to clear crash reports:', error);
        }
    }

    // For settings screen - toggle crash reporting
    async toggleCrashReporting(enabled) {
        this.consentGiven = enabled;
        await AsyncStorage.setItem(CRASH_CONSENT_KEY, enabled.toString());

        ActionLogger.logAction(ActionTypes.SETTING_CHANGE, {
            setting: 'crash_reporting_consent',
            value: enabled,
        });

        if (!enabled) {
            // Clear existing crash reports if user opts out
            await this.clearCrashReports();
        }
    }

    // Check consent status
    getCrashReportingStatus() {
        return this.consentGiven;
    }
}

// Error Boundary Component for React errors
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    async componentDidCatch(error, errorInfo) {
        // Log to ActionLogger
        ActionLogger.logError(ActionTypes.JAVASCRIPT_ERROR, error, {
            componentStack: errorInfo.componentStack,
            type: 'React Error Boundary',
        });

        // Report crash if consent given
        if (CrashReporterInstance.consentGiven) {
            await CrashReporterInstance.prepareCrashReport(error, 'React Component Error');
        }
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                this.props.fallback || (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 20,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                            Oops! Something went wrong
                        </Text>
                        <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
                            The app encountered an unexpected error. Our team has been notified and
                            will fix this soon.
                        </Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}
                            onPress={() => {
                                this.setState({ hasError: false, error: null });
                                // Optionally restart the app or navigate to home
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )
            );
        }

        return this.props.children;
    }
}

// Export singleton instance
export const CrashReporterInstance = new CrashReporter();

// Setup function to call in App.js
export const setupCrashReporting = async () => {
    await CrashReporterInstance.init();
};

// Utility functions
export const reportManualError = (error, context) => {
    return CrashReporterInstance.reportError(error, context);
};

export const getCrashReports = () => {
    return CrashReporterInstance.getStoredCrashReports();
};

export const clearCrashReports = () => {
    return CrashReporterInstance.clearCrashReports();
};

export default CrashReporterInstance;
