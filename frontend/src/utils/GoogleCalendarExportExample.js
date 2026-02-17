/**
 * Google Calendar Integration Usage Example
 *
 * This example shows how to use the Google Calendar export functionality
 * in a React Native component with the authenticatedAPI hook.
 */

import React, { useState } from 'react';
import { View, Button, Alert, Text } from 'react-native';
import { useAuthenticatedAPI } from '../utils/authenticatedAPI';

const GoogleCalendarExportExample = ({ schedule, userTimezone = 'America/Vancouver' }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isConnected, setIsConnected] = useState(null);
    const { checkGoogleCalendarStatus, exportScheduleToGoogleCalendar } = useAuthenticatedAPI();

    // Check if Google Calendar is connected
    const handleCheckConnection = async () => {
        try {
            const connected = await checkGoogleCalendarStatus();
            setIsConnected(connected);

            if (connected) {
                Alert.alert('Connected', 'Google Calendar is connected and ready to use!');
            } else {
                Alert.alert(
                    'Not Connected',
                    'Please connect your Google Calendar in the app settings first.',
                    [
                        { text: 'OK' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                // Navigate to settings or open Google OAuth flow
                                console.log('Navigate to Google Calendar connection settings');
                            },
                        },
                    ],
                );
            }
        } catch (error) {
            console.error('Failed to check Google Calendar status:', error);
            Alert.alert('Error', 'Failed to check Google Calendar connection status');
        }
    };

    // Export current schedule to Google Calendar
    const handleExportToGoogleCalendar = async () => {
        if (!schedule) {
            Alert.alert('Error', 'No schedule to export');
            return;
        }

        try {
            setIsExporting(true);

            // First check if Google Calendar is connected
            const connected = await checkGoogleCalendarStatus();
            if (!connected) {
                Alert.alert(
                    'Google Calendar Not Connected',
                    'Please connect your Google Calendar account first.',
                    [
                        { text: 'Cancel' },
                        {
                            text: 'Connect',
                            onPress: () => {
                                // Navigate to Google Calendar connection flow
                                console.log('Navigate to Google Calendar connection');
                            },
                        },
                    ],
                );
                return;
            }

            // Export the schedule
            const result = await exportScheduleToGoogleCalendar(schedule, userTimezone);

            Alert.alert(
                'Export Successful!',
                `Successfully exported ${result.inserted} events to your "Plannr" calendar in Google Calendar.`,
                [{ text: 'Great!' }],
            );
        } catch (error) {
            console.error('Google Calendar export failed:', error);

            let errorMessage = 'Failed to export to Google Calendar. Please try again.';

            if (error.message?.includes('GOOGLE_CALENDAR_NOT_CONNECTED')) {
                errorMessage =
                    'Google Calendar is not connected. Please connect your account in settings.';
            } else if (error.message?.includes('GOOGLE_CALENDAR_REAUTH_REQUIRED')) {
                errorMessage =
                    'Google Calendar access has expired. Please reconnect your account in settings.';
            } else if (error.message?.includes('No events found')) {
                errorMessage = 'No events found in your schedule to export.';
            }

            Alert.alert('Export Failed', errorMessage);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
                Google Calendar Integration
            </Text>

            {/* Connection Status */}
            <View style={{ marginBottom: 15 }}>
                <Button title="Check Google Calendar Connection" onPress={handleCheckConnection} />
                {isConnected !== null && (
                    <Text
                        style={{
                            marginTop: 5,
                            color: isConnected ? 'green' : 'red',
                            fontWeight: 'bold',
                        }}
                    >
                        Status: {isConnected ? 'Connected ✅' : 'Not Connected ❌'}
                    </Text>
                )}
            </View>

            {/* Export Button */}
            <View style={{ marginBottom: 15 }}>
                <Button
                    title={isExporting ? 'Exporting...' : 'Export Schedule to Google Calendar'}
                    onPress={handleExportToGoogleCalendar}
                    disabled={isExporting || !schedule}
                />
                {!schedule && (
                    <Text style={{ marginTop: 5, color: 'orange' }}>
                        No schedule available to export
                    </Text>
                )}
            </View>

            {/* Instructions */}
            <View style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5 }}>
                <Text style={{ fontSize: 14, color: '#666' }}>
                    💡 Tip: This will create a dedicated "Plannr" calendar in your Google Calendar
                    and export all your scheduled events there. Breaks are not exported.
                </Text>
            </View>
        </View>
    );
};

export default GoogleCalendarExportExample;

// Usage in a screen component:
/*
import GoogleCalendarExportExample from '../components/GoogleCalendarExportExample';
import { useAppState } from '../context/AppStateContext'; // or wherever your schedule comes from

const MyScreen = () => {
    const { activeSchedule } = useAppState(); // Get current schedule
    const userTimezone = 'America/Vancouver'; // Get from user settings or device

    return (
        <View>
            <GoogleCalendarExportExample 
                schedule={activeSchedule} 
                userTimezone={userTimezone} 
            />
        </View>
    );
};
*/
