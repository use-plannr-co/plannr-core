import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    Image,
    TouchableOpacity,
    Switch,
    TextInput,
    Alert,
    Linking,
} from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppState } from '../context/AppStateContext.js';
import { useAuthenticatedAPI } from '../api/index.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { TokenCacheUtils } from '../../cache.js';

import LoadingScreen from './LoadingScreen.jsx';
import MenuButton from '../components/MenuButton.jsx';
import ComingSoonBottomSheet from '../components/ComingSoonBottomSheet.jsx';

import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import useCurrentTime from '../utils/useCurrentTime.js';
import { getAvatarImageSource } from '../utils/avatarUtils.js';

import LightMode from '../../assets/system-icons/LightMode.svg';
import DarkMode from '../../assets/system-icons/DarkMode.svg';
import Link from '../../assets/system-icons/Link.svg';
import EarliestFitIcon from '../../assets/strategy-icons/EarliestFitIcon.svg';
import BalancedWorkIcon from '../../assets/strategy-icons/BalancedWorkIcon.svg';
import DeadlineOrientedIcon from '../../assets/strategy-icons/DeadlineOrientedIcon.svg';

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const UserProfileScreen = ({ navigation }) => {
    const { appState, setAppState, storageLoaded } = useAppState();
    const { signOut } = useClerk();
    const { logAction, logScreenView, logError } = useActionLogger('UserProfile');

    const currentTime = useCurrentTime();
    const { getUserProfile, updatePreferences, deleteUserAccount } = useAuthenticatedAPI();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showMinGapWarning, setShowMinGapWarning] = useState(false);
    const [showMaxHoursWarning, setShowMaxHoursWarning] = useState(false);
    const [showLeadMinutesWarning, setShowLeadMinutesWarning] = useState(false);

    // Ref for coming soon bottom sheet
    const comingSoonSheetRef = useRef();

    // Early return if storage not loaded
    if (!storageLoaded) {
        return <LoadingScreen />;
    }

    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const todaysDate = convertDateToScheduleDate(currentTime);

    // Screen view logging
    useEffect(() => {
        logScreenView({
            hasActiveSchedule: !!appState.activeSchedule,
            totalSavedSchedules: appState.savedSchedules.length,
            userName: appState.name,
        });
    }, []);

    // Fetch user profile data including avatar
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                console.log('🔄 Starting to fetch user profile...');
                const profileData = await getUserProfile();
                console.log('📦 Raw profile data received:', JSON.stringify(profileData, null, 2));

                if (profileData.success) {
                    setUserProfile(profileData.data);
                    console.log('✅ User profile set:', JSON.stringify(profileData.data, null, 2));
                    console.log('🖼️ Avatar name specifically:', profileData.data?.avatarName);
                } else {
                    console.log('❌ Profile fetch failed:', profileData);
                }
            } catch (error) {
                console.error('💥 Failed to fetch user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    // Debug userProfile changes
    useEffect(() => {
        console.log('🔍 UserProfile state changed:', userProfile);
        console.log('🖼️ Current avatarName:', userProfile?.avatarName);
    }, [userProfile]);

    const handleLogout = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        // Clear all authentication tokens from secure storage
                        await TokenCacheUtils.clearAllAuthData();

                        // Sign out from Clerk
                        await signOut();

                        console.log('Successfully signed out and cleared all tokens');
                    } catch (error) {
                        console.error('Error signing out:', error);
                        Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                },
            },
        ]);
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Delete Account',
            '⚠️ WARNING: This action cannot be undone!\n\nDeleting your account will permanently remove:\n• All your data and preferences\n• Your schedules and tasks\n• Your account settings\n\nAre you absolutely sure you want to delete your account?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: () => {
                        // Second confirmation dialog
                        Alert.alert(
                            'Final Confirmation',
                            'This is your last chance to cancel.\n\nType DELETE to confirm account deletion.',
                            [
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                },
                                {
                                    text: 'I understand, DELETE my account',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            console.log('🗑️ Starting account deletion process...');

                                            // Call backend API to delete user account
                                            const result = await deleteUserAccount();
                                            console.log(
                                                '🔄 Backend account deletion result:',
                                                result,
                                            );

                                            // Clear all authentication tokens from secure storage
                                            await TokenCacheUtils.clearAllAuthData();

                                            // Sign out from Clerk (this will also delete the Clerk user)
                                            await signOut();

                                            console.log(
                                                '✅ Account successfully deleted and user signed out',
                                            );

                                            Alert.alert(
                                                'Account Deleted',
                                                "Your account has been permanently deleted. We're sorry to see you go!",
                                                [{ text: 'OK' }],
                                            );
                                        } catch (error) {
                                            console.error('💥 Error deleting account:', error);
                                            Alert.alert(
                                                'Error',
                                                'Failed to delete your account. Please try again or contact support if the problem persists.',
                                            );
                                        }
                                    },
                                },
                            ],
                        );
                    },
                },
            ],
        );
    };

    const handleOpenExternalLink = async (url) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
                logAction('external_link_opened', { url });
            } else {
                Alert.alert('Error', 'Unable to open this link. Please try again later.');
                logError('external_link_failed', new Error('URL not supported'), { url });
            }
        } catch (error) {
            console.error('Error opening external link:', error);
            logError('external_link_error', error, { url });
            Alert.alert('Error', 'Unable to open this link. Please try again later.');
        }
    };

    // Separate function for saving preferences to backend
    const savePreferences = async (updatedPreferences = null) => {
        try {
            // Use passed preferences or current state
            const prefsToSave = updatedPreferences || appState.userPreferences;
            const payload = {
                theme: prefsToSave.theme,
                taskRemindersEnabled: prefsToSave.taskRemindersEnabled,
                leadMinutes: prefsToSave.leadMinutes,
                defaultMinGap: prefsToSave.defaultMinGap,
                defaultMaxWorkingHours: prefsToSave.defaultMaxWorkingHours,
                defaultStrategy: prefsToSave.defaultStrategy,
            };
            console.log('📤 Updating user preferences via authenticatedAPI...');
            console.log('📦 Payload:', JSON.stringify(payload, null, 2));
            console.log('🎯 Default Strategy being sent:', payload.defaultStrategy);

            const response = await updatePreferences(payload);
            console.log('✅ Preferences saved successfully via authenticatedAPI.');
            console.log('ℹ️ Server response:', response);

            // If server returns normalized/validated preferences, merge them into app state
            if (response && response.data) {
                // Map backend response to frontend format
                const updatedPreferences = {
                    theme: response.data.theme || appState.userPreferences.theme,
                    defaultStrategy:
                        response.data.defaultStrategy || appState.userPreferences.defaultStrategy,
                    defaultMinGap:
                        response.data.defaultMinGap || appState.userPreferences.defaultMinGap,
                    defaultMaxWorkingHours:
                        response.data.defaultMaxWorkingHours ||
                        appState.userPreferences.defaultMaxWorkingHours,
                    taskRemindersEnabled:
                        response.data.taskRemindersEnabled ??
                        appState.userPreferences.taskRemindersEnabled,
                    leadMinutes: response.data.leadMinutes || appState.userPreferences.leadMinutes,
                    nickname: response.data.nickname || appState.userPreferences.nickname,
                };

                setAppState((prevState) => ({
                    ...prevState,
                    userPreferences: updatedPreferences,
                }));
                console.log(
                    '🔁 Local appState.userPreferences updated from server response:',
                    updatedPreferences,
                );
            } else {
                console.log(
                    'ℹ️ Server did not return preferences data; keeping local state as-is.',
                );
            }
        } catch (error) {
            console.error('💥 Error saving preferences via authenticatedAPI:', error);
            Alert.alert('Error', 'An unexpected error occurred while saving preferences.');
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <Text style={{ ...styles.title, color: theme.FOREGROUND }}>Hey, {appState.name}!</Text>
            <ScrollView style={{ ...styles.subContainer, backgroundColor: theme.BACKGROUND }}>
                {/* Avatar Container */}
                <View
                    style={{
                        height: 164,
                        width: 164,
                        alignSelf: 'center',
                        marginBottom: 2 * SPACE,
                    }}
                >
                    <LinearGradient
                        style={{ height: 164, width: 164, alignSelf: 'center', borderRadius: 120 }}
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View
                        style={{
                            height: 156,
                            width: 156,
                            borderRadius: 120,
                            backgroundColor: theme.BACKGROUND,
                            zIndex: 1,
                            position: 'absolute',
                            top: 4,
                            left: 4,
                        }}
                    />
                    <View
                        style={{
                            height: 148,
                            width: 148,
                            borderRadius: 120,
                            backgroundColor: theme.FOREGROUND,
                            zIndex: 2,
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            overflow: 'hidden',
                        }}
                    >
                        {appState.avatarName ? (
                            <Image
                                source={getAvatarImageSource(appState.avatarName)}
                                style={{ width: '100%', height: '100%', borderRadius: 120 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <Image
                                source={getAvatarImageSource('cat')} // Default to cat avatar
                                style={{ width: '100%', height: '100%', borderRadius: 120 }}
                                resizeMode="cover"
                            />
                        )}
                    </View>
                </View>
                <View
                    style={{
                        ...styles.horizontalGrid,
                        backgroundColor: theme.BACKGROUND,
                        marginBottom: 4,
                    }}
                >
                    <MenuButton
                        title="Manage Your Account"
                        icon="Profile"
                        navTo={() => {
                            navigation.navigate('ManageAccount');
                        }}
                    />
                    <MenuButton
                        title="Plannr Pro"
                        icon="Pro"
                        navTo={() => {
                            navigation.navigate('ProPaywall');
                        }}
                    />
                </View>
                <View style={{ ...styles.horizontalGrid, backgroundColor: theme.BACKGROUND }}>
                    <MenuButton
                        broad={false}
                        title="Saved Schedules"
                        icon="Saved"
                        navTo={() => {
                            navigation.navigate('SavedSchedules');
                        }}
                    />
                    <MenuButton
                        broad={false}
                        title="Your Productivity Analytics"
                        icon="Productivity"
                        navTo={() => {
                            navigation.navigate('ProductivityAnalytics');
                        }}
                    />
                </View>
                {/* Theme and Reminders Settings */}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Settings</Text>
                <View
                    style={{
                        ...styles.card,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: theme.COMP_COLOR,
                    }}
                >
                    <TouchableOpacity
                        style={
                            appState.userPreferences.theme == 'light'
                                ? { ...styles.uiModeButtonSelected, borderColor: theme.FOREGROUND }
                                : {
                                      ...styles.uiModeButtonDefault,
                                      borderColor: theme.FOREGROUND + '1A',
                                  }
                        }
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            const newPrefs = { ...appState.userPreferences, theme: 'light' };
                            setAppState({ ...appState, userPreferences: newPrefs });
                            setTimeout(() => savePreferences(newPrefs), 300);
                        }}
                    >
                        <View>
                            <LightMode
                                width={32}
                                height={32}
                                style={{ marginBottom: 4 }}
                                color={
                                    appState.userPreferences.theme == 'light'
                                        ? '#E3CD00'
                                        : theme.FOREGROUND
                                }
                            />
                            <Text
                                style={{
                                    fontFamily: 'AlbertSans',
                                    color: theme.FOREGROUND,
                                    fontSize: typography.subHeadingSize,
                                }}
                            >
                                Light
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={
                            appState.userPreferences.theme == 'dark'
                                ? { ...styles.uiModeButtonSelected, borderColor: theme.FOREGROUND }
                                : {
                                      ...styles.uiModeButtonDefault,
                                      borderColor: theme.FOREGROUND + '1A',
                                  }
                        }
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            const newPrefs = { ...appState.userPreferences, theme: 'dark' };
                            setAppState({ ...appState, userPreferences: newPrefs });
                            setTimeout(() => savePreferences(newPrefs), 300);
                        }}
                    >
                        <View>
                            <DarkMode
                                width={32}
                                height={32}
                                style={{ marginBottom: 4 }}
                                color={
                                    appState.userPreferences.theme == 'dark'
                                        ? '#8C84E5'
                                        : theme.FOREGROUND
                                }
                            />
                            <Text
                                style={{
                                    fontFamily: 'AlbertSans',
                                    color: theme.FOREGROUND,
                                    fontSize: typography.subHeadingSize,
                                }}
                            >
                                Dark
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={{ ...styles.card, gap: 16, backgroundColor: theme.COMP_COLOR }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: typography.subHeadingSize,
                                fontFamily: 'AlbertSans',
                                color: theme.FOREGROUND,
                                opacity: 0.5,
                            }}
                        >
                            Task Reminders{' '}
                            {appState.userPreferences.taskRemindersEnabled ? 'Enabled' : 'Disabled'}
                        </Text>
                        <Switch
                            trackColor={{ false: '#000000', true: theme.GRADIENT_START }}
                            thumbColor={'#FFFFFF'}
                            ios_backgroundColor={'#C0C0C0'}
                            onValueChange={() => {
                                const currPref = appState.userPreferences.taskRemindersEnabled;
                                const newPrefs = {
                                    ...appState.userPreferences,
                                    taskRemindersEnabled: !currPref,
                                };
                                setAppState({ ...appState, userPreferences: newPrefs });
                                setTimeout(() => savePreferences(newPrefs), 300);
                            }}
                            value={appState.userPreferences.taskRemindersEnabled}
                        />
                    </View>
                    {appState.userPreferences.taskRemindersEnabled && (
                        <View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        ...styles.subHeading,
                                        marginTop: 4,
                                        marginBottom: 4,
                                        color: theme.FOREGROUND,
                                    }}
                                >
                                    Remind me
                                </Text>
                                <TextInput
                                    style={{
                                        ...styles.input,
                                        backgroundColor: theme.INPUT,
                                        color: theme.FOREGROUND,
                                    }}
                                    value={appState.userPreferences.leadMinutes}
                                    keyboardType="numeric"
                                    autoCorrect={false}
                                    autoCapitalize="words"
                                    onChange={({ nativeEvent }) => {
                                        setAppState({
                                            ...appState,
                                            userPreferences: {
                                                ...appState.userPreferences,
                                                leadMinutes: nativeEvent.text,
                                            },
                                        });
                                    }}
                                    onBlur={() => {
                                        // Validate lead minutes first
                                        const leadMinutesInt = parseInt(
                                            appState.userPreferences.leadMinutes,
                                        );
                                        if (isNaN(leadMinutesInt) || leadMinutesInt <= 0) {
                                            setShowLeadMinutesWarning(true);
                                        } else {
                                            setShowLeadMinutesWarning(false);
                                            savePreferences();
                                        }
                                    }}
                                />
                                <Text
                                    style={{
                                        ...styles.subHeading,
                                        marginTop: 4,
                                        marginBottom: 4,
                                        color: theme.FOREGROUND,
                                    }}
                                >
                                    minutes earlier
                                </Text>
                            </View>
                            {showLeadMinutesWarning && (
                                <Text style={styles.warning}>Must be greater than 0</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Default Scheduling Preferences */}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, marginTop: 16 }}>
                    Default Scheduling Preferences
                </Text>
                <View style={{ ...styles.card, gap: 16, backgroundColor: theme.COMP_COLOR }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ width: '50%' }}>
                            <Text
                                style={{
                                    ...styles.subHeading,
                                    marginTop: 0,
                                    marginBottom: 8,
                                    color: theme.FOREGROUND,
                                }}
                            >
                                Min. Gap (mins)
                            </Text>
                            <TextInput
                                style={{
                                    ...styles.input,
                                    width: '90%',
                                    backgroundColor: theme.INPUT,
                                    color: theme.FOREGROUND,
                                }}
                                value={appState.userPreferences.defaultMinGap}
                                keyboardType="numeric"
                                autoCorrect={false}
                                autoCapitalize="words"
                                onChange={({ nativeEvent }) => {
                                    setAppState({
                                        ...appState,
                                        userPreferences: {
                                            ...appState.userPreferences,
                                            defaultMinGap: nativeEvent.text,
                                        },
                                    });
                                }}
                                onBlur={() => {
                                    // Validate min gap first
                                    const minGapInt = parseInt(
                                        appState.userPreferences.defaultMinGap,
                                    );
                                    if (isNaN(minGapInt) || minGapInt < 0) {
                                        setShowMinGapWarning(true);
                                    } else {
                                        setShowMinGapWarning(false);
                                        savePreferences();
                                    }
                                }}
                            />
                            {showMinGapWarning && (
                                <Text style={styles.warning}>Must be non-negative</Text>
                            )}
                        </View>
                        <View style={{ width: '50%' }}>
                            <Text
                                style={{
                                    ...styles.subHeading,
                                    marginTop: 0,
                                    marginBottom: 8,
                                    color: theme.FOREGROUND,
                                }}
                            >
                                Max. Working Hours
                            </Text>
                            <TextInput
                                style={{
                                    ...styles.input,
                                    width: '90%',
                                    backgroundColor: theme.INPUT,
                                    color: theme.FOREGROUND,
                                }}
                                value={appState.userPreferences.defaultMaxWorkingHours}
                                keyboardType="numeric"
                                autoCorrect={false}
                                autoCapitalize="words"
                                onChange={({ nativeEvent }) => {
                                    setAppState({
                                        ...appState,
                                        userPreferences: {
                                            ...appState.userPreferences,
                                            defaultMaxWorkingHours: nativeEvent.text,
                                        },
                                    });
                                }}
                                onBlur={() => {
                                    // Validate max working hours first
                                    const maxHoursFloat = parseFloat(
                                        appState.userPreferences.defaultMaxWorkingHours,
                                    );
                                    if (
                                        isNaN(maxHoursFloat) ||
                                        maxHoursFloat <= 0 ||
                                        maxHoursFloat > 24
                                    ) {
                                        setShowMaxHoursWarning(true);
                                    } else {
                                        setShowMaxHoursWarning(false);
                                        savePreferences();
                                    }
                                }}
                            />
                            {showMaxHoursWarning && (
                                <Text style={styles.warning}>Must be 0-24</Text>
                            )}
                        </View>
                    </View>
                </View>
                <View style={{ ...styles.card, gap: 12, backgroundColor: theme.COMP_COLOR }}>
                    <View
                        style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 8,
                        }}
                    >
                        <EarliestFitIcon width={20} height={20} />
                        <TouchableOpacity
                            style={{
                                ...styles.choiceButton,
                                backgroundColor:
                                    appState.userPreferences.defaultStrategy == 'earliest-fit'
                                        ? theme.SELECTION
                                        : theme.INPUT,
                            }}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newPrefs = {
                                    ...appState.userPreferences,
                                    defaultStrategy: 'earliest-fit',
                                };
                                console.log(
                                    '🎯 Setting strategy to earliest-fit, new prefs:',
                                    newPrefs,
                                );
                                setAppState({ ...appState, userPreferences: newPrefs });
                                // Save immediately when strategy changes
                                setTimeout(() => savePreferences(newPrefs), 300);
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: typography.subHeadingSize,
                                    fontFamily: 'AlbertSans',
                                    color:
                                        appState.userPreferences.defaultStrategy == 'earliest-fit'
                                            ? theme.SELECTED_TEXT
                                            : theme.FOREGROUND,
                                }}
                            >
                                Earliest Fit
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View
                        style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 8,
                        }}
                    >
                        <BalancedWorkIcon width={20} height={20} />
                        <TouchableOpacity
                            style={{
                                ...styles.choiceButton,
                                backgroundColor:
                                    appState.userPreferences.defaultStrategy == 'balanced-work'
                                        ? theme.SELECTION
                                        : theme.INPUT,
                            }}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newPrefs = {
                                    ...appState.userPreferences,
                                    defaultStrategy: 'balanced-work',
                                };
                                console.log(
                                    '🎯 Setting strategy to balanced-work, new prefs:',
                                    newPrefs,
                                );
                                setAppState({ ...appState, userPreferences: newPrefs });
                                // Save immediately when strategy changes
                                setTimeout(() => savePreferences(newPrefs), 300);
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: typography.subHeadingSize,
                                    fontFamily: 'AlbertSans',
                                    color:
                                        appState.userPreferences.defaultStrategy == 'balanced-work'
                                            ? theme.SELECTED_TEXT
                                            : theme.FOREGROUND,
                                }}
                            >
                                Balanced Work
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View
                        style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 8,
                        }}
                    >
                        <DeadlineOrientedIcon width={20} height={20} />
                        <TouchableOpacity
                            style={{
                                ...styles.choiceButton,
                                backgroundColor:
                                    appState.userPreferences.defaultStrategy == 'deadline-oriented'
                                        ? theme.SELECTION
                                        : theme.INPUT,
                            }}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newPrefs = {
                                    ...appState.userPreferences,
                                    defaultStrategy: 'deadline-oriented',
                                };
                                console.log(
                                    '🎯 Setting strategy to deadline-oriented, new prefs:',
                                    newPrefs,
                                );
                                setAppState({ ...appState, userPreferences: newPrefs });
                                // Save immediately when strategy changes
                                setTimeout(() => savePreferences(newPrefs), 300);
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: typography.subHeadingSize,
                                    fontFamily: 'AlbertSans',
                                    color:
                                        appState.userPreferences.defaultStrategy ==
                                        'deadline-oriented'
                                            ? theme.SELECTED_TEXT
                                            : theme.FOREGROUND,
                                }}
                            >
                                Deadline Oriented
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Links */}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, marginTop: 16 }}>
                    Support & Community
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleOpenExternalLink('https://useplannr.co')}
                    >
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            About Plannr
                        </Text>
                        <Link
                            width={24}
                            height={24}
                            style={{ marginRight: 8 }}
                            color={theme.FOREGROUND}
                            opacity={0.5}
                        />
                    </TouchableOpacity>
                    <View style={{ ...styles.divider, backgroundColor: theme.FOREGROUND }} />
                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleOpenExternalLink('https://plannr.featurebase.app')}
                    >
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            Request a Feature
                        </Text>
                        <Link
                            width={24}
                            height={24}
                            style={{ marginRight: 8 }}
                            color={theme.FOREGROUND}
                            opacity={0.5}
                        />
                    </TouchableOpacity>
                    <View style={{ ...styles.divider, backgroundColor: theme.FOREGROUND }} />
                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleOpenExternalLink('mailto:shaurya@useplannr.co')}
                    >
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            Contact us
                        </Text>
                        <Link
                            width={24}
                            height={24}
                            style={{ marginRight: 8 }}
                            color={theme.FOREGROUND}
                            opacity={0.5}
                        />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={{
                        ...styles.destructiveButton,
                        backgroundColor: '#FF222220',
                        marginTop: 12,
                        borderColor: '#FF2222',
                    }}
                    onPress={handleLogout}
                >
                    <Text style={{ ...styles.destructiveButtonText, color: '#FF2222' }}>
                        Sign Out
                    </Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity
                    style={{
                        ...styles.destructiveButton,
                        backgroundColor: '#FF222220',
                        borderColor: '#FF2222',
                    }}
                    onPress={handleDeleteAccount}
                >
                    <Text style={{ ...styles.destructiveButtonText, color: '#FF2222' }}>
                        Delete Account
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Coming Soon Bottom Sheet */}
            <ComingSoonBottomSheet ref={comingSoonSheetRef} theme={theme} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: padding.SCREEN_PADDING,
        height: '100%',
    },
    subContainer: {
        width: width,
        alignSelf: 'center',
        alignContent: 'center',
        paddingHorizontal: padding.SCREEN_PADDING,
    },
    card: {
        width: '99%',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        padding: 16,
        marginVertical: 8,
        margin: 8,
        alignSelf: 'center',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginTop: spacing.SPACING_16,
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
    },
    horizontalGrid: {
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACE,
    },
    uiModeButtonDefault: {
        width: '45%',
        height: 80,
        borderRadius: 12,
        borderWidth: 2,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    uiModeButtonSelected: {
        width: '45%',
        height: 80,
        borderRadius: 12,
        borderWidth: 2,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    input: {
        height: 40,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        opacity: 0.1,
        marginVertical: 12,
        marginHorizontal: 4,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    destructiveButton: {
        width: '99%',
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    destructiveButtonText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginTop: 8,
        color: '#FF0000',
        alignSelf: 'center',
    },
    choiceButton: {
        width: '92%',
        borderRadius: 12,
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    button: {
        width: '92%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        alignSelf: 'center',
    },
});

export default UserProfileScreen;
