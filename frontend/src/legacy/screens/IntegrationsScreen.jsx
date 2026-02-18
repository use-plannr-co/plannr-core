import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useAppState } from '../context/AppStateContext.js';
import { useAuthenticatedAPI } from '../api/index.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { useSSO } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';

// Import SVG icons
import Google from '../../assets/auth/Google.svg';
import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const IntegrationsScreen = ({ navigation }) => {
    const { appState } = useAppState();
    const { checkGoogleCalendarStatus, getUserIntegrations, updateUserIntegrations } =
        useAuthenticatedAPI();
    const { logUserAction, logScreenView } = useActionLogger('Integrations');
    const { startSSOFlow } = useSSO();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [integrations, setIntegrations] = useState({
        googleCalendar: false,
        todoist: false,
        notion: false,
        googleTasks: false,
        microsoftTodo: false,
    });
    const [loading, setLoading] = useState(true);

    // Screen view logging
    useEffect(() => {
        logScreenView({
            userHasIntegrations:
                integrations.googleCalendar ||
                integrations.todoist ||
                integrations.notion ||
                integrations.googleTasks ||
                integrations.microsoftTodo,
        });
    }, [integrations]);

    // Check integration statuses on component mount
    useEffect(() => {
        const checkIntegrations = async () => {
            try {
                setLoading(true);

                // Get all integrations from backend
                const userIntegrations = await getUserIntegrations();
                setIntegrations(userIntegrations);

                logUserAction('integrations_status_checked', userIntegrations);
            } catch (error) {
                console.error('Error checking integration statuses:', error);
                logUserAction('integrations_check_failed', { error: error.message });
            } finally {
                setLoading(false);
            }
        };

        checkIntegrations();
    }, []);

    const handleGoogleCalendarToggle = async () => {
        if (integrations.googleCalendar) {
            // For now, just show that it's already connected
            Alert.alert(
                'Already Connected',
                'Google Calendar is already connected to your account.',
                [{ text: 'OK' }],
            );
            return;
        }

        try {
            logUserAction('google_calendar_connect_attempt');

            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl: 'plannr://sso-callback',

                // Force consent screen to appear (required for Google verification demo)
                additionalParameters: {
                    prompt: 'consent',
                    access_type: 'offline',
                    include_granted_scopes: 'true',
                },

                scopes: [
                    'openid',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/calendar.app.created',
                    'https://www.googleapis.com/auth/calendar.calendars.readonly',
                    'https://www.googleapis.com/auth/calendar.events',
                    'https://www.googleapis.com/auth/calendar.events.readonly',
                ],
            });

            if (createdSessionId) {
                await setActive({ session: createdSessionId });

                // Update integration status in backend
                try {
                    await updateUserIntegrations({ googleCalendar: true });
                    setIntegrations((prev) => ({ ...prev, googleCalendar: true }));
                    logUserAction('google_calendar_connected_successfully');
                } catch (updateError) {
                    console.error('Failed to update integration status:', updateError);
                    // Still show success since OAuth worked
                }

                Alert.alert(
                    'Google Calendar Connected',
                    'Plannr can now add and read calendar events.',
                    [{ text: 'OK' }],
                );
            }
        } catch (error) {
            console.error('Google Calendar OAuth error:', error);
            logUserAction('google_calendar_connect_failed', { error: error.message });

            Alert.alert(
                'Connection Failed',
                error?.message ?? 'Unable to connect Google Calendar. Please try again.',
                [{ text: 'OK' }],
            );
        }
    };

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <View style={styles.titleContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>Integrations</Text>
            </View>
            <ScrollView style={{ ...styles.subContainer, backgroundColor: theme.BACKGROUND }}>
                {/* Calendar Services Section */}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Calendar Integrations
                </Text>
                {/* Google Calendar Integration */}
                <TouchableOpacity
                    style={{
                        ...styles.integrationItem,
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                    }}
                >
                    <View style={styles.integrationLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.COMP_COLOR }]}>
                            <Google width={24} height={24} />
                        </View>
                        <View style={styles.integrationInfo}>
                            <Text style={[styles.integrationTitle, { color: theme.FOREGROUND }]}>
                                Google Calendar
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.connectionButtonComingSoon}>
                        <Text
                            style={{
                                ...styles.subHeading,
                                color: theme.FOREGROUND,
                                fontSize: typography.bodySize,
                                marginBottom: 0,
                            }}
                        >
                            Coming Soon
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Available Integrations Section */}
                <Text
                    style={{ ...styles.subHeading, color: theme.FOREGROUND, marginTop: SPACE * 2 }}
                >
                    Tasks Integrations
                </Text>

                {/* Todoist Integration */}
                <TouchableOpacity
                    style={{
                        ...styles.integrationItem,
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                    }}
                >
                    <View style={styles.integrationLeft}>
                        <View style={styles.integrationInfo}>
                            <Text style={[styles.integrationTitle, { color: theme.FOREGROUND }]}>
                                Todoist
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.connectionButtonComingSoon}>
                        <Text
                            style={{
                                ...styles.subHeading,
                                color: theme.FOREGROUND,
                                fontSize: typography.bodySize,
                                marginBottom: 0,
                            }}
                        >
                            Coming Soon
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Notion Integration */}
                <TouchableOpacity
                    style={{
                        ...styles.integrationItem,
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                    }}
                >
                    <View style={styles.integrationLeft}>
                        <View style={styles.integrationInfo}>
                            <Text style={[styles.integrationTitle, { color: theme.FOREGROUND }]}>
                                Notion
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.connectionButtonComingSoon}>
                        <Text
                            style={{
                                ...styles.subHeading,
                                color: theme.FOREGROUND,
                                fontSize: typography.bodySize,
                                marginBottom: 0,
                            }}
                        >
                            Coming Soon
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Google Tasks Integration */}
                <TouchableOpacity
                    style={{
                        ...styles.integrationItem,
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                    }}
                >
                    <View style={styles.integrationLeft}>
                        <View style={styles.integrationInfo}>
                            <Text style={[styles.integrationTitle, { color: theme.FOREGROUND }]}>
                                Google Tasks
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.connectionButtonComingSoon}>
                        <Text
                            style={{
                                ...styles.subHeading,
                                color: theme.FOREGROUND,
                                fontSize: typography.bodySize,
                                marginBottom: 0,
                            }}
                        >
                            Coming Soon
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Microsoft To Do Integration */}
                <TouchableOpacity
                    style={{
                        ...styles.integrationItem,
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                    }}
                >
                    <View style={styles.integrationLeft}>
                        <View style={styles.integrationInfo}>
                            <Text style={[styles.integrationTitle, { color: theme.FOREGROUND }]}>
                                Microsoft To Do
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.connectionButtonComingSoon}>
                        <Text
                            style={{
                                ...styles.subHeading,
                                color: theme.FOREGROUND,
                                fontSize: typography.bodySize,
                                marginBottom: 0,
                            }}
                        >
                            Coming Soon
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: padding.SCREEN_PADDING,
        height: '100%',
    },
    subContainer: {
        marginTop: SPACE,
        paddingHorizontal: padding.SCREEN_PADDING,
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 64,
        marginLeft: padding.SCREEN_PADDING,
        marginRight: padding.SCREEN_PADDING,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    subHeading: {
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
        fontWeight: '600',
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: SPACE,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    integrationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    integrationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    integrationRight: {
        marginLeft: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    integrationInfo: {
        flex: 1,
    },
    integrationTitle: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 8,
        marginHorizontal: 4,
    },
    helpCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: SPACE * 3,
    },
    helpTitle: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        marginBottom: 8,
    },
    helpDescription: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        lineHeight: 20,
    },
    connectionButtonConnect: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#000000',
    },
    connectionButtonConnected: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 255, 0, 0.3)',
        outlineColor: 'green',
        outlineWidth: 1,
    },
    connectionButtonComingSoon: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(128, 128, 128, 0.3)',
        outlineColor: 'gray',
        outlineWidth: 1,
    },
});

export default IntegrationsScreen;
