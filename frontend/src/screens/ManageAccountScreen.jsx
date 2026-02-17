import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TextInput,
    TouchableOpacity,
    Platform,
    Image,
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { useUser } from '@clerk/clerk-expo';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthenticatedAPI } from '../api/index.js';
import { getAvatarImageSource } from '../utils/avatarUtils.js';
import AvatarPickerBottomSheet from '../components/AvatarPickerBottomSheet.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import useCurrentTime from '../utils/useCurrentTime.js';
import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const ManageAccountScreen = ({ navigation }) => {
    const { appState, setAppState } = useAppState();
    const { logUserAction, logError, logSettingChange } = useActionLogger('ManageAccount');
    const { user } = useUser();
    const { getToken } = useAuth();
    const authenticatedAPI = useAuthenticatedAPI();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const avatarPickerRef = useRef();

    const [userName, setUserName] = useState(appState.name || '');
    const [userEmail, setUserEmail] = useState(user?.primaryEmailAddress?.emailAddress || '');

    // Sync email from Clerk user when it changes
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress) {
            setUserEmail(user.primaryEmailAddress.emailAddress);
        }
    }, [user?.primaryEmailAddress?.emailAddress]);

    // Track if name has been changed to show save button
    const [nameChanged, setNameChanged] = useState(false);
    const [isUpdatingName, setIsUpdatingName] = useState(false);

    // Track if user is actively editing to prevent backend data from overriding input
    const [isEditingName, setIsEditingName] = useState(false);

    // Avatar selection state
    const [selectedAvatar, setSelectedAvatar] = useState('cat'); // Default avatar
    const [userProfile, setUserProfile] = useState(null);

    // Load user profile on component mount
    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                if (authenticatedAPI?.getUserProfile) {
                    // console.log('🔄 Loading user profile for avatar...');
                    const profileData = await authenticatedAPI.getUserProfile();

                    if (profileData.success && profileData.data) {
                        setUserProfile(profileData.data);
                        if (profileData.data.avatarName) {
                            setSelectedAvatar(profileData.data.avatarName);
                            // console.log('🐾 Loaded current avatar:', profileData.data.avatarName);
                        }

                        // Only update name field if user is not actively editing it
                        if (profileData.data.displayName && !isEditingName && !nameChanged) {
                            setUserName(profileData.data.displayName);
                        }

                        // Note: We don't update email from database since it's encrypted
                        // Email comes from Clerk's useUser hook instead
                    }
                } else {
                    console.warn('⚠️ getUserProfile API not available');
                }
            } catch (error) {
                console.error('💥 Error loading user profile:', error);
            }
        };

        loadUserProfile();
    }, [authenticatedAPI, isEditingName, nameChanged]);

    // Handle name updates
    const updateUserName = async () => {
        if (!nameChanged) return;

        try {
            setIsUpdatingName(true);

            const newDisplayName = userName.trim();

            console.log('🔄 Updating user name:', { displayName: newDisplayName });

            logSettingChange('user_name', newDisplayName, appState.name);

            const result = await authenticatedAPI.updateUserProfile({
                displayName: newDisplayName,
            });

            if (result.success) {
                console.log('✅ Name updated successfully:', result.data);

                // Update AppState with new name
                setAppState((prevState) => ({
                    ...prevState,
                    name: newDisplayName,
                }));

                setNameChanged(false);
                setIsEditingName(false);
                logUserAction('name_updated_success', {
                    displayName: newDisplayName,
                });
                Alert.alert('Success', 'Your name has been updated successfully!');
            } else {
                console.error('❌ Failed to update name:', result);
                logError('name_update_failed', new Error('API call failed'), {
                    displayName: newDisplayName,
                    result,
                });
                Alert.alert('Error', 'Failed to update your name. Please try again.');
            }
        } catch (error) {
            logError('name_update_error', error, { displayName: userName });
            console.error('💥 Error updating name:', error);
            Alert.alert('Error', 'Failed to update your name. Please try again.');
        } finally {
            setIsUpdatingName(false);
        }
    };

    // Handle name change
    const handleNameChange = (text) => {
        setUserName(text);
        setNameChanged(true);
        if (!isEditingName) {
            setIsEditingName(true);
        }
    };

    // Handle when user finishes editing name
    const handleNameEndEditing = () => {
        setIsEditingName(false);
    };

    const selectAvatar = async (avatarName) => {
        try {
            // Update local state immediately for responsive UI
            setSelectedAvatar(avatarName);

            // Update AppState immediately so avatar reflects across all screens
            setAppState((prevState) => ({
                ...prevState,
                avatarName: avatarName,
            }));

            console.log('🐾 Updating avatar to:', avatarName);

            logSettingChange('avatar', avatarName, selectedAvatar);

            if (authenticatedAPI?.updateAvatar) {
                const result = await authenticatedAPI.updateAvatar(avatarName);

                if (result.success) {
                    console.log('✅ Avatar updated successfully:', result.data);
                    logUserAction('avatar_updated_success', { avatarName });
                    Alert.alert('Success', 'Avatar updated successfully!');
                } else {
                    console.error('❌ Failed to update avatar:', result);
                    logError('avatar_update_failed', new Error('API call failed'), {
                        avatarName,
                        result,
                    });
                    Alert.alert('Error', 'Failed to update avatar. Please try again.');
                    // Revert AppState on failure
                    setAppState((prevState) => ({
                        ...prevState,
                        avatarName: appState.avatarName || 'cat', // fallback to previous or default
                    }));
                    setSelectedAvatar(appState.avatarName || 'cat');
                }
            } else {
                console.warn('⚠️ updateAvatar API not available');
            }
        } catch (error) {
            logError('avatar_update_error', error, { avatarName });
            console.error('💥 Error updating avatar:', error);
            Alert.alert('Error', 'Failed to update avatar. Please try again.');
            // Revert AppState on error
            setAppState((prevState) => ({
                ...prevState,
                avatarName: appState.avatarName || 'cat',
            }));
            setSelectedAvatar(appState.avatarName || 'cat');
        }
    };

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <View style={styles.titleContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>Your Account</Text>
            </View>
            <ScrollView style={{ ...styles.subContainer, backgroundColor: theme.BACKGROUND }}>
                {/* Avatar Selection */}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, marginBottom: 0 }}>
                    Your Avatar
                </Text>
                <View
                    style={{
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                        alignItems: 'center',
                    }}
                >
                    <TouchableOpacity
                        style={styles.profileImageContainer}
                        onPress={() => avatarPickerRef.current?.show()}
                    >
                        <Image
                            source={getAvatarImageSource(selectedAvatar)}
                            style={styles.profileImage}
                            resizeMode="cover"
                        />
                        <View style={styles.editIconOverlay}>
                            <Text style={styles.editIconText}>✏️</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={{ ...styles.profileImageHint, color: theme.FOREGROUND }}>
                        Tap to choose your avatar
                    </Text>
                </View>

                {/* User Name */}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, marginBottom: 0 }}>
                    Your Name
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TextInput
                        style={{
                            ...styles.input,
                            color: theme.FOREGROUND,
                            backgroundColor: theme.INPUT,
                            marginBottom: 12,
                        }}
                        value={userName}
                        autoCorrect={false}
                        onChangeText={handleNameChange}
                        onFocus={() => setIsEditingName(true)}
                        onEndEditing={handleNameEndEditing}
                        placeholder="Enter your name"
                        placeholderTextColor={theme.FOREGROUND_SECONDARY}
                    />

                    {/* Save Name Button - Always visible */}
                    <TouchableOpacity
                        style={{
                            ...styles.button,
                            backgroundColor: isUpdatingName ? '#666' : '#000',
                            opacity: isUpdatingName ? 0.6 : 1,
                            marginTop: 4,
                            marginBottom: 8,
                        }}
                        onPress={updateUserName}
                        disabled={isUpdatingName}
                    >
                        <Text style={{ ...styles.buttonText, color: '#FFFFFF' }}>
                            {isUpdatingName ? 'Saving...' : 'Save Name'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Email */}
                <Text
                    style={{
                        ...styles.subHeading,
                        color: theme.FOREGROUND,
                        marginBottom: 0,
                        marginTop: 16,
                    }}
                >
                    Your Email
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TextInput
                        style={{
                            ...styles.input,
                            color: theme.FOREGROUND,
                            backgroundColor: theme.INPUT,
                        }}
                        value={userEmail}
                        editable={false}
                        selectTextOnFocus={false}
                        placeholder="Email address"
                        placeholderTextColor={theme.FOREGROUND_SECONDARY}
                    />

                    <Text style={{ ...styles.disabledText, color: theme.FOREGROUND }}>
                        Emails cannot be changed.
                    </Text>
                </View>
            </ScrollView>

            <AvatarPickerBottomSheet
                ref={avatarPickerRef}
                theme={theme}
                selectedAvatar={selectedAvatar}
                onAvatarSelect={selectAvatar}
            />
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
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.SPACING_16,
        marginBottom: SPACE,
        marginLeft: padding.SCREEN_PADDING,
        marginRight: padding.SCREEN_PADDING,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
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
    input: {
        height: 40,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    disabledText: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginTop: 8,
        opacity: 0.6,
        fontStyle: 'italic',
    },
    datePickerButton: {
        height: 40,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
    },
    datePickerText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
    },
    doneButton: {
        width: '92%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        alignSelf: 'center',
        marginTop: 8,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#E0E0E0',
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImagePlaceholderText: {
        fontSize: 48,
        fontFamily: 'PinkSunset',
        fontWeight: 'bold',
    },
    editIconOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#000',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    editIconText: {
        fontSize: 16,
    },
    profileImageHint: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        opacity: 0.7,
        textAlign: 'center',
    },
    saveButton: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
    },
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: typography.subHeadingSize - 2,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ManageAccountScreen;
