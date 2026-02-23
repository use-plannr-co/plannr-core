import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    Animated,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { useAuthenticatedAPI } from '../utils/authenticatedAPI';
import { useUser, useSSO } from '@clerk/clerk-expo';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import { addScheduleToAppleCalendar } from '../utils/appleCalendarExport.ts';
import Indicator from '../../assets/system-icons/Indicator.svg';
import ScheduleCalendarView from '../components/ScheduleCalendarView.jsx';
import EventInfoModal from '../modals/EventInfoModal.jsx';
import ExportCalIcon from '../../assets/system-icons/ExportCalIcon.svg';
import DeleteIcon from '../../assets/system-icons/DeleteIcon.svg';
import DeleteScheduleModal from '../modals/DeleteScheduleModal.jsx';
import ExportCalendarBottomSheet from '../components/ExportCalendarBottomSheet.jsx';
import LoadingScreen from './LoadingScreen.jsx';

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;
const ICON_DIM = width > 400 ? 24 : 20;
const INDICATOR_DIM = (ICON_DIM * 7) / 4;
const PADDING_HORIZONTAL = (ICON_DIM * 5) / 6;
const OFFSET = PADDING_HORIZONTAL - (INDICATOR_DIM - ICON_DIM) / 2;

const ScheduleViewScreen = ({ route }) => {
    const { appState, setAppState } = useAppState();
    const { logUserAction, logScheduleAction, logError } = useActionLogger('ScheduleView');
    const {
        updateSchedule,
        getSchedules,
        checkGoogleCalendarStatus,
        exportScheduleToGoogleCalendar,
    } = useAuthenticatedAPI();
    const { user } = useUser();
    const { startSSOFlow } = useSSO();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const { schedName } = route.params;

    // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTB, setSelectedTB] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const indicatorX = useRef(new Animated.Value(0)).current;
    const exportBottomSheetRef = useRef(null);

    // ✅ NOW we can safely check for schedule existence
    const schedule = appState.savedSchedules.find((sched) => sched.name === schedName);

    // ✅ Initialize selectedDate when schedule is available
    useEffect(() => {
        if (!schedule || selectedDate) return; // ✅ Early return if no schedule or already set
        setSelectedDate(schedule.schedule.getFirstDate().getId());
    }, [schedule, selectedDate]);

    // ✅ Screen view logging
    useEffect(() => {
        if (!schedule) return;
        logUserAction('view_schedule', {
            scheduleName: schedName,
            isActive: schedule.isActive || false,
            totalDays: schedule.schedule?.numDays || 0,
        });
    }, [schedule, schedName]);

    // ✅ Date indicator animation — must be before any early return
    useEffect(() => {
        if (!schedule || !selectedDate) return;

        const index = schedule.schedule.getAllDatesInOrder().indexOf(selectedDate);
        const xPosition = index * (2 * PADDING_HORIZONTAL + ICON_DIM) + OFFSET;
        Animated.spring(indicatorX, {
            toValue: xPosition,
            useNativeDriver: true,
        }).start();
    }, [selectedDate, schedule]);

    // Early return for missing/deleted schedule — show nothing while navigation animates away
    if (!schedule || !schedule.schedule) {
        return null;
    }

    const onSelectTB = (tb) => {
        setSelectedTB(tb);
        setShowInfoModal(true);
    };

    const onCloseModal = () => {
        setShowInfoModal(false);
    };

    // Handle Google Calendar authorization/re-authorization
    const handleGoogleCalendarAuth = async () => {
        try {
            logUserAction('google_calendar_auth_attempt', {
                scheduleName: schedName,
                reason: 'missing_calendar_scope',
            });

            // Check if user already has Google OAuth connected
            console.log('🔍 Checking user external accounts...');
            console.log('🔍 User external accounts count:', user.externalAccounts?.length || 0);

            // Debug: Log all external accounts
            if (user.externalAccounts && user.externalAccounts.length > 0) {
                user.externalAccounts.forEach((account, index) => {
                    console.log(`🔍 Auth check - External account ${index}:`, {
                        provider: account.provider,
                        email: account.emailAddress,
                        verification: account.verification?.status,
                    });
                });
            }

            const existingGoogleAccount = user.externalAccounts?.find(
                (account) => account.provider === 'google' || account.provider === 'oauth_google',
            );

            if (existingGoogleAccount) {
                console.log('✅ User already has Google OAuth connected');
                console.log('🔍 Checking if we need additional scopes...');

                // User is already signed in with Google, but we might need additional scopes
                // Since we can't easily check scopes on the frontend, we'll show a message
                // explaining that we need calendar permissions
                Alert.alert(
                    'Google Calendar Permissions',
                    "You're already signed in with Google, but we need additional calendar permissions to export your schedule. This will redirect you to Google to grant calendar access.",
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Grant Permissions',
                            onPress: async () => {
                                try {
                                    // Force a new OAuth flow with additional scopes
                                    const { createdSessionId, setActive } = await startSSOFlow({
                                        strategy: 'oauth_google',
                                        redirectUrl: 'plannr://sso-callback',
                                        scopes: [
                                            'openid',
                                            'https://www.googleapis.com/auth/userinfo.email',
                                            'https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/calendar.app.created',
                                            'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
                                        ],
                                    });

                                    if (createdSessionId) {
                                        await setActive({ session: createdSessionId });

                                        Alert.alert(
                                            'Permissions Updated!',
                                            'Google Calendar permissions have been updated. You can now export your schedule.',
                                            [
                                                { text: 'Later', style: 'cancel' },
                                                {
                                                    text: 'Export Now',
                                                    onPress: () => {
                                                        setTimeout(
                                                            () => handleExportToGoogleCalendar(),
                                                            1000,
                                                        );
                                                    },
                                                },
                                            ],
                                        );
                                    }
                                } catch (error) {
                                    console.error('Failed to update permissions:', error);
                                    Alert.alert(
                                        'Permission Update Failed',
                                        'Failed to update Google Calendar permissions. The export might still work - would you like to try it?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Try Export',
                                                onPress: () => handleExportToGoogleCalendar(),
                                            },
                                        ],
                                    );
                                }
                            },
                        },
                    ],
                );
                return;
            }

            // No existing Google account - proceed with normal OAuth flow
            console.log('🔍 No existing Google account, starting OAuth flow...');

            // Start Google OAuth flow with calendar permissions
            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl: 'plannr://sso-callback',
                scopes: [
                    'openid',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/calendar.app.created',
                    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
                ],
            });

            if (createdSessionId) {
                await setActive({ session: createdSessionId });

                logUserAction('google_calendar_auth_success', {
                    scheduleName: schedName,
                });

                // Show success message and offer to retry export
                Alert.alert(
                    'Google Calendar Connected!',
                    'Your Google Calendar is now connected with calendar permissions. Would you like to export your schedule now?',
                    [
                        { text: 'Later', style: 'cancel' },
                        {
                            text: 'Export Now',
                            onPress: () => {
                                logUserAction('google_calendar_export_after_auth', {
                                    scheduleName: schedName,
                                });
                                setTimeout(() => handleExportToGoogleCalendar(), 1000);
                            },
                        },
                    ],
                );
            } else {
                // OAuth flow completed but no session created (user might have cancelled)
                logUserAction('google_calendar_auth_incomplete', { scheduleName: schedName });

                Alert.alert(
                    'Connection Incomplete',
                    'Google Calendar connection was not completed. Please try again if you want to export your schedule.',
                    [{ text: 'OK' }],
                );
            }
        } catch (error) {
            console.error('Google Calendar OAuth error:', error);
            logError('google_calendar_auth_failed', error, { scheduleName: schedName });

            // Handle specific OAuth error cases
            if (error.errors && error.errors.length > 0) {
                const errorCode = error.errors[0]?.code;

                switch (errorCode) {
                    case 'oauth_access_denied':
                        // User cancelled the OAuth process
                        logUserAction('google_calendar_auth_cancelled', {
                            scheduleName: schedName,
                        });
                        break;
                    case 'clerk_network_error':
                        Alert.alert(
                            'Network Error',
                            'Please check your internet connection and try again.',
                        );
                        break;
                    default:
                        Alert.alert(
                            'Connection Failed',
                            'Failed to connect Google Calendar. Please try again or check your Google account settings.',
                        );
                }
            } else {
                Alert.alert(
                    'Connection Failed',
                    'Failed to connect Google Calendar. Please try again.',
                );
            }
        }
    };

    // Handle the actual export process
    const handleExportToGoogleCalendar = async () => {
        try {
            setIsLoading(true);
            logUserAction('google_calendar_export_attempt', {
                scheduleName: schedName,
                totalDays: schedule.schedule?.numDays || 0,
            });

            console.log('🔍 Starting Google Calendar export...');

            // Check if user has Google account connected
            const googleAccount = user.externalAccounts?.find(
                (account) => account.provider === 'google' || account.provider === 'oauth_google',
            );

            if (!googleAccount) {
                console.log('❌ No Google account found, prompting to connect...');
                Alert.alert(
                    'Google Calendar Not Connected',
                    'You need to connect your Google account first to export to Google Calendar.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Connect Google',
                            onPress: () => handleGoogleCalendarAuth(),
                        },
                    ],
                );
                return;
            }

            console.log('✅ Google account found:', {
                provider: googleAccount.provider,
                email: googleAccount.emailAddress,
                verification: googleAccount.verification?.status,
            });

            // Step 2: Get user's timezone - you might want to get this from user preferences
            const userTimezone = 'America/Vancouver'; // TODO: Get from user preferences

            // Step 3: Prepare user and schedule names for calendar naming
            const userName = user?.firstName || user?.fullName || 'User';
            const currentScheduleName = schedName || 'Schedule';

            // Step 4: Export to Google Calendar - let backend handle token retrieval
            try {
                console.log('🔍 Attempting to export schedule via backend...');

                const result = await exportScheduleToGoogleCalendar(
                    schedule.schedule,
                    userTimezone,
                    null, // Let backend handle OAuth tokens
                    currentScheduleName, // Pass schedule name
                    userName, // Pass user name
                );

                // Show success message
                Alert.alert(
                    'Success!',
                    `Exported ${result.inserted} events to your "Plannr" calendar in Google Calendar.`,
                    [{ text: 'Great!' }],
                );

                logUserAction('google_calendar_export_success', {
                    scheduleName: schedName,
                    eventsExported: result.inserted,
                    calendarId: result.calendarId,
                });
                return;
            } catch (exportError) {
                console.log('🔍 Export error details:', exportError);
                console.log('🔍 Export error message:', exportError.message);

                // Check if we need to use frontend token (Clerk backend SDK limitation)
                if (exportError.message?.includes('GOOGLE_CALENDAR_USE_FRONTEND_TOKEN')) {
                    console.log(
                        '🔍 Backend cannot access OAuth tokens - user has permissions but tokens not accessible',
                    );
                    console.log('💡 Need to refresh OAuth connection to get accessible tokens');

                    Alert.alert(
                        'Calendar Connection Issue',
                        'Your Google Calendar is connected but we need to refresh the connection to export your schedule.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Refresh Connection',
                                onPress: () => handleGoogleCalendarAuth(),
                            },
                        ],
                    );
                    return;
                }

                // Check if it's other auth-related errors
                if (
                    exportError.message?.includes('GOOGLE_CALENDAR_NOT_CONNECTED') ||
                    exportError.message?.includes('GOOGLE_CALENDAR_NEEDS_REAUTH')
                ) {
                    Alert.alert(
                        'Google Calendar Permissions Required',
                        'We need additional calendar permissions to export your schedule. This will redirect you to Google.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Grant Permissions',
                                onPress: () => handleGoogleCalendarAuth(),
                            },
                        ],
                    );
                    return;
                }

                // Re-throw the error to be handled by the outer catch
                throw exportError;
            }

            // Show success message
            Alert.alert(
                'Success!',
                `Exported ${result.inserted} events to your "Plannr" calendar in Google Calendar.`,
                [{ text: 'Great!' }],
            );

            logUserAction('google_calendar_export_success', {
                scheduleName: schedName,
                eventsExported: result.inserted,
                calendarId: result.calendarId,
            });
        } catch (error) {
            console.error('Google Calendar export failed:', error);

            // Handle specific error types with user-friendly messages
            let errorMessage = 'Failed to export to Google Calendar. Please try again.';
            let shouldShowAuthOption = false;

            if (error.message?.includes('GOOGLE_CALENDAR_NOT_CONNECTED')) {
                errorMessage = 'Google Calendar is not connected or missing calendar permissions.';
                shouldShowAuthOption = true;
            } else if (error.message?.includes('GOOGLE_CALENDAR_REAUTH_REQUIRED')) {
                errorMessage = 'Google Calendar access has expired. Please reconnect your account.';
                shouldShowAuthOption = true;
            } else if (error.message?.includes('No events found')) {
                errorMessage = 'No events found in your schedule to export.';
            }

            if (shouldShowAuthOption) {
                Alert.alert('Export Failed', errorMessage, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Fix Connection',
                        onPress: () => handleGoogleCalendarAuth(),
                    },
                    {
                        text: 'Try Again',
                        onPress: () => {
                            // Retry export after a short delay in case permissions are propagating
                            setTimeout(() => {
                                logUserAction('google_calendar_export_retry', {
                                    scheduleName: schedName,
                                });
                                handleExportToGoogleCalendar();
                            }, 2000);
                        },
                    },
                ]);
            } else {
                Alert.alert('Export Failed', errorMessage, [
                    { text: 'OK', style: 'cancel' },
                    {
                        text: 'Try Again',
                        onPress: () => {
                            setTimeout(() => {
                                logUserAction('google_calendar_export_retry', {
                                    scheduleName: schedName,
                                });
                                handleExportToGoogleCalendar();
                            }, 1000);
                        },
                    },
                ]);
            }

            logError('google_calendar_export_error', error, {
                scheduleName: schedName,
                errorType: error.message?.includes('GOOGLE_CALENDAR')
                    ? 'auth_error'
                    : 'unknown_error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: spacing.SPACING_16,
                    justifyContent: 'space-between',
                    paddingBottom: SPACE,
                }}
            >
                <Text style={{ ...styles.title, color: theme.FOREGROUND, alignSelf: 'center' }}>
                    {schedule.name}
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        alignSelf: 'flex-start',
                    }}
                >
                    <TouchableOpacity 
                        style={{ width: 32, height: 32, marginRight: 8, opacity: (schedule.isActive) ? 0.2 : 1 }} 
                        disabled={schedule.isActive}
                        onPress={() => {
                            setShowDeleteModal(true);
                        }}
                    >
                        <DeleteIcon width={32} height={32} color={theme.FOREGROUND} />
                    </TouchableOpacity>
                   
                    <TouchableOpacity
                        style={{ width: 32, height: 32, marginRight: 8 }}
                        onPress={() => exportBottomSheetRef.current?.show()}
                    >
                        <ExportCalIcon width={32} height={32} color={theme.FOREGROUND} />
                    </TouchableOpacity>
                </View>
            </View>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: SPACE,
                    alignItems: 'center',
                }}
            >
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, alignSelf: 'center', fontSize: 16, marginBottom: 0, }}>
                    {schedule.isActive ? 'This schedule is currently active' : 'This schedule is currently inactive'}
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        alignSelf: 'flex-start',
                    }}
                >
                    <Switch
                        trackColor={{ false: '#000000', true: theme.GRADIENT_START }}
                        thumbColor={'#FFFFFF'}
                        ios_backgroundColor={'#C0C0C0'}
                        onValueChange={async () => {
                            const wasActive = schedule.isActive;

                            // 🚀 OPTIMISTIC UPDATE: Update UI immediately
                            if (wasActive) {
                                // Deactivating current schedule
                                setAppState({
                                    ...appState,
                                    activeSchedule: null,
                                    savedSchedules: appState.savedSchedules.map((sched) => {
                                        if (sched.name === schedule.name) {
                                            return { ...sched, isActive: false };
                                        }
                                        return sched;
                                    }),
                                });
                            } else {
                                // Activating this schedule - deactivate all others
                                setAppState({
                                    ...appState,
                                    activeSchedule: {
                                        name: schedule.name,
                                        schedule: schedule.schedule,
                                        backendId: schedule.backendId,
                                        isActive: true,
                                    },
                                    savedSchedules: appState.savedSchedules.map((sched) => {
                                        if (sched.name === schedule.name) {
                                            return { ...sched, isActive: true };
                                        }
                                        return {
                                            ...sched,
                                            isActive: false,
                                        };
                                    }),
                                });
                            }

                            // 🔄 BACKGROUND UPDATE: Handle backend request
                            try {
                                if (wasActive) {
                                    // Deactivating current schedule
                                    logScheduleAction('deactivate', {
                                        scheduleName: schedule.name,
                                        scheduleId: schedule.backendId,
                                    });

                                    await updateSchedule(schedule.backendId, { isActive: false });
                                } else {
                                    // Activating this schedule - first deactivate all others
                                    logScheduleAction('activate', {
                                        scheduleName: schedule.name,
                                        scheduleId: schedule.backendId,
                                        totalDays: schedule.schedule?.numDays || 0,
                                    });

                                    const allSchedules = await getSchedules();

                                    // Update all schedules in database
                                    await Promise.all(
                                        allSchedules.data.map((sched) =>
                                            updateSchedule(sched.id, {
                                                isActive: sched.id === schedule.backendId,
                                            }),
                                        ),
                                    );
                                }

                                console.log(
                                    '✅ Schedule activation updated successfully in backend',
                                );
                            } catch (error) {
                                // 🚨 REVERT ON ERROR: If backend fails, revert the optimistic update
                                console.error(
                                    '❌ Failed to update schedule activation in backend, reverting UI:',
                                    error,
                                );

                                logError('schedule_activation_failed', error, {
                                    scheduleName: schedule.name,
                                    scheduleId: schedule.backendId,
                                    action: wasActive ? 'deactivate' : 'activate',
                                });

                                // Revert to original state
                                if (wasActive) {
                                    // Revert deactivation - make it active again
                                    setAppState({
                                        ...appState,
                                        activeSchedule: {
                                            name: schedule.name,
                                            schedule: schedule.schedule,
                                            backendId: schedule.backendId,
                                            isActive: true,
                                        },
                                        savedSchedules: appState.savedSchedules.map((sched) => {
                                            if (sched.name === schedule.name) {
                                                return { ...sched, isActive: true };
                                            }
                                            return sched;
                                        }),
                                    });
                                } else {
                                    // Revert activation - make it inactive again
                                    setAppState({
                                        ...appState,
                                        activeSchedule: appState.activeSchedule, // Keep previous active schedule
                                        savedSchedules: appState.savedSchedules.map((sched) => {
                                            if (sched.name === schedule.name) {
                                                return { ...sched, isActive: false };
                                            }
                                            return sched;
                                        }),
                                    });
                                }

                                // Could add error toast here to inform user
                                // showErrorToast('Failed to update schedule. Please try again.');
                            }
                        }}
                        value={schedule.isActive}
                    />
                </View>
            </View>
            <View style={styles.subContainer}>
                {/* Date Selection Carousel */}
                <View style={{ width: '100%' }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{
                            width: '100%',
                            contentContainerStyle: {
                                justifyContent: 'center',
                                alignItems: 'center',
                            },
                        }}
                    >
                        <Animated.View
                            style={[styles.indicator, { transform: [{ translateX: indicatorX }] }]}
                        >
                            <Indicator
                                width={INDICATOR_DIM}
                                height={INDICATOR_DIM}
                                color={theme.FOREGROUND}
                            />
                        </Animated.View>
                        {schedule.schedule.getAllDatesInOrder().map((date, index) => {
                            const dateString = date.split('-')[0];

                            return (
                                <TouchableOpacity
                                    style={{
                                        width: ICON_DIM,
                                        margin: PADDING_HORIZONTAL,
                                        alignItems: 'center',
                                    }}
                                    key={index}
                                    onPress={() => setSelectedDate(date)}
                                >
                                    <Text
                                        style={{
                                            ...styles.bodySize,
                                            color:
                                                date === selectedDate
                                                    ? theme.ACCENT
                                                    : theme.FOREGROUND,
                                        }}
                                    >
                                        {dateString}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
                {/* Schedule Calendar Component */}
                <View style={{ height: '100%', paddingBottom: SPACE * 3 }}>
                    {schedule.schedule.getAllDatesInOrder().map((date, index) => {
                        const visible = date === selectedDate;

                        return (
                            <ScheduleCalendarView
                                schedule={schedule.schedule}
                                date={date}
                                isVisible={visible}
                                onBlockSelect={(block) => onSelectTB(block)}
                                key={index}
                            />
                        );
                    })}
                </View>
            </View>
            <EventInfoModal isVisible={showInfoModal} tb={selectedTB} onClose={onCloseModal} />
            <DeleteScheduleModal 
                isVisible={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)} 
                toDelete={schedule.name}
            />

            <ExportCalendarBottomSheet
                ref={exportBottomSheetRef}
                onExportGoogle={handleExportToGoogleCalendar}
                onExportApple={() => addScheduleToAppleCalendar(appState.name, schedule.schedule)}
                theme={theme}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: padding.SCREEN_PADDING,
        height: '100%',
    },
    subContainer: {
        height: '80%',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
    },
    subHeading: {
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
    },
    bodySize: {
        fontSize: ICON_DIM / 1.5,
        fontFamily: 'AlbertSans',
        lineHeight: ICON_DIM,
    },
    indicator: {
        position: 'absolute',
        top: OFFSET,
        left: 0,
        bottom: OFFSET,
        zIndex: -1,
    },
});

export default ScheduleViewScreen;
