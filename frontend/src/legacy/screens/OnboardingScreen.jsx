import React, { useState, useRef, useEffect } from 'react'
import { Text, View, Animated, Image, StyleSheet, Dimensions, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import * as Font from 'expo-font'

import { useAppState } from '../../context/AppStateContext'
import { useActionLogger } from '../../hooks/useActionLogger.js'

import { lightColor, darkColor } from '../../design/colors.js'
import { spacing, padding } from '../../design/spacing.js'
import { typography  } from '../../design/typography.js'
import { getAvatarList, getRandomAvatar } from '../../utils/avatarUtils.js'
import { useAuthenticatedAPI } from '../api/index.js'
const { width, height } = Dimensions.get('window');
const SPACE = (height > 900) ? spacing.SPACING_4 : (height > 800) ? spacing.SPACING_3 : spacing.SPACING_2

const OnboardingScreen = ({ navigation }) => {
    const { appState, setAppState } = useAppState();
    const { updateUserProfile, updatePreferences, markOnboardingComplete } = useAuthenticatedAPI();
    const { logAction, logScreenView, logError } = useActionLogger('Onboarding');

    const [fontsLoaded] = Font.useFonts({
            'PinkSunset': require('../../assets/fonts/PinkSunset-Regular.ttf'),
            'AlbertSans': require('../../assets/fonts/AlbertSans-VariableFont_wght.ttf'),
    });

    const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
    const [currentStep, setCurrentStep] = useState(0);
    const isButtonDisabled = () => {
        if (currentStep === 0) {
            return name.trim() === '';
        } else if (currentStep === 1) {
            return selectedAvatar === '';
        } else if (currentStep === 2) {
            return preferredStrategy.trim() === '';
        } else if (currentStep === 3) {
            return false;
        }
    }

    // Y-coordinate for Logo
    const indicatorYLogo = useRef(new Animated.Value(0)).current;

    // Information for Name Card
    const [name, setName] = useState('');
    const indicatorXName = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // Information for Avatar Card
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const indicatorXAvatar = useRef(new Animated.Value(0)).current;
    const avatarList = getAvatarList();

    // Information for Strategy Card
    const [preferredStrategy, setPreferredStrategy] = useState('');
    const indicatorXStrategy = useRef(new Animated.Value(0)).current;

    // Information for Reminders Card
    const [remindersOn, setRemindersOn] = useState(true);
    const indicatorXReminders = useRef(new Animated.Value(0)).current;

    const enterName = (name) => {
        logAction('onboarding_name_entered', { nameLength: name.trim().length });
        
        setAppState(prevState => ({
            ...prevState,
            name: name.trim(),
        }));
        Animated.timing(indicatorXName, {
            toValue: -width,
            duration: 500,
            useNativeDriver: true,
        }).start();
        Animated.timing(indicatorXAvatar, {
            toValue: -width,
            duration: 500,
            useNativeDriver: true,
        }).start();
        setCurrentStep(1);
    };

    const enterAvatar = (avatar) => {
        logAction('onboarding_avatar_selected', { avatarName: avatar });
        
        setAppState(prevState => ({
            ...prevState,
            avatarName: avatar,
        }));
        Animated.timing(indicatorXAvatar, {
            toValue: -(2*width),
            duration: 500,
            useNativeDriver: true,
        }).start();
        Animated.timing(indicatorXStrategy, {
            toValue: -(2*width),
            duration: 500,
            useNativeDriver: true,
        }).start();
        setCurrentStep(2);
    };

    const enterStrategy = (strategy) => {
        logAction('onboarding_strategy_selected', { strategy: strategy });
        
        setAppState(prevState => ({
            ...prevState,
            userPreferences: {
                ...prevState.userPreferences,
                defaultStrategy: strategy,
            }
        }));
        Animated.timing(indicatorXStrategy, {
            toValue: -(3*width),
            duration: 500,
            useNativeDriver: true,
        }).start();
        Animated.timing(indicatorXReminders, {
            toValue: -(3*width),
            duration: 500,
            useNativeDriver: true,
        }).start();
        setCurrentStep(3);
    };

    useEffect(() => {
        logScreenView({ currentStep: currentStep });
        
        if (!fontsLoaded) return;
        
        const timeout = setTimeout(() => {
            Animated.timing(indicatorYLogo, {
                toValue: -250,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [fontsLoaded, indicatorYLogo, fadeAnim]);
    
    if (!fontsLoaded) return null;

    return (
        <View style={styles.container}>
            <Animated.View style={{ justifyContent: 'center', alignItems: 'center', position: 'absolute', transform: [{ translateY: indicatorYLogo }] }}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={{ width: 180, height: 180, marginBottom: SPACE, alignSelf: 'center' }}
                />
                <Text style={styles.subHeading}>Welcome to</Text>
                <Text style={styles.title}>Plannr</Text>
            </Animated.View>
            <ScrollView horizontal scrollEnabled={false} style={{ width: '100%' }}>
                <Animated.View style={{ ...styles.card, backgroundColor: lightColor.COMP_COLOR, transform: [{ translateX: indicatorXName }], opacity: fadeAnim }}>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize }}>🙋🏻‍♂️ What's your name, friend?</Text>
                    <TextInput
                        style={{ ...styles.input, backgroundColor: lightColor.INPUT, color: lightColor.FOREGROUND }}
                        value={name}
                        autoCorrect={false}
                        autoCapitalize='words'
                        onChange={ ({ nativeEvent }) => { 
                            setName(nativeEvent.text)
                        } }
                    />
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize - 2, marginBottom: 0, marginTop: SPACE }}>You can change this later, don't worry</Text>
                </Animated.View>
                <Animated.View style={{ ...styles.card, backgroundColor: lightColor.COMP_COLOR, transform: [{ translateX: indicatorXAvatar }] }}>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize }}>🐾 Pick your avatar!</Text>
                    <View style={styles.avatarGrid}>
                        {avatarList.map((avatar) => (
                            <TouchableOpacity
                                key={avatar.name}
                                style={[
                                    styles.avatarOption,
                                    { backgroundColor: lightColor.INPUT },
                                    selectedAvatar === avatar.name && { 
                                        ...styles.selectedAvatarOption, 
                                        borderColor: '#000',
                                        backgroundColor: '#000' + '20' 
                                    }
                                ]}
                                onPress={() => setSelectedAvatar(avatar.name)}
                            >
                                <Image 
                                    source={avatar.image} 
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                />
                                <Text style={{ ...styles.avatarText, color: lightColor.FOREGROUND }}>
                                    {avatar.displayName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize - 2, marginBottom: 0, marginTop: 0 }}>You can change this later, don't worry</Text>
                </Animated.View>
                <Animated.View style={{ ...styles.card, backgroundColor: lightColor.COMP_COLOR, transform: [{ translateX: indicatorXStrategy }] }}>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize }}>How do you like to get your work done?</Text>
                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}>
                        <TouchableOpacity 
                            style={{ ...styles.choiceButton, backgroundColor: (preferredStrategy == 'earliest-fit') ? '#000' : lightColor.INPUT, marginBottom: 0, width: (width - padding.SCREEN_PADDING * 2) / 3 - 20 }}
                            onPress={() => { setPreferredStrategy('earliest-fit') }}
                        >
                            <Text style={{ ...styles.subHeading, marginBottom: 0, textAlign: 'center' }}>⚡</Text>
                            <Text style={{ ...styles.subHeading, fontSize: typography.subHeadingSize * 0.8, marginBottom: 0, textAlign: 'center', color: (preferredStrategy == 'earliest-fit') ? '#FFF' : '#000' }}>Get it done early</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ ...styles.choiceButton, backgroundColor: (preferredStrategy == 'balanced-work') ? '#000' : lightColor.INPUT, marginBottom: 0, width: (width - padding.SCREEN_PADDING * 2) / 3 - 20 }}
                            onPress={() => { setPreferredStrategy('balanced-work') }}
                        >
                            <Text style={{ ...styles.subHeading, marginBottom: 0, textAlign: 'center' }}>⚖️</Text>
                            <Text style={{ ...styles.subHeading, fontSize: typography.subHeadingSize * 0.8, marginBottom: 0, textAlign: 'center', color: (preferredStrategy == 'balanced-work') ? '#FFF' : '#000' }}>Spread my work out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ ...styles.choiceButton, backgroundColor: (preferredStrategy == 'deadline-oriented') ? '#000' : lightColor.INPUT, marginBottom: 0, width: (width - padding.SCREEN_PADDING * 2) / 3 - 20 }}
                            onPress={() => { setPreferredStrategy('deadline-oriented') }}
                        >
                            <Text style={{ ...styles.subHeading, marginBottom: 0, textAlign: 'center' }}>🚨</Text>
                            <Text style={{ ...styles.subHeading, fontSize: typography.subHeadingSize * 0.8, marginBottom: 0, textAlign: 'center', color: (preferredStrategy == 'deadline-oriented') ? '#FFF' : '#000' }}>Deadlines get me going</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize - 2, marginBottom: 0, marginTop: SPACE }}>You can change this later, don't worry</Text>
                </Animated.View>
                <Animated.View style={{ ...styles.card, backgroundColor: lightColor.COMP_COLOR, transform: [{ translateX: indicatorXReminders }] }}>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize }}>Would you like task reminders?</Text>
                        <TouchableOpacity 
                            style={{ ...styles.choiceButton, backgroundColor: (remindersOn == true) ? '#000' : lightColor.INPUT }}
                            onPress={() => { setRemindersOn(true); }}
                        >
                            <Text style={{ ...styles.subHeading, fontSize: typography.subHeadingSize, marginBottom: 0, textAlign: 'center', color: (remindersOn == true) ? '#FFF' : '#000' }}>⏰ Yes! I'd like reminders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ ...styles.choiceButton, backgroundColor: (remindersOn == false) ? '#000' : lightColor.INPUT, marginBottom: 0 }}
                            onPress={() => { setRemindersOn(false); }}
                        >
                            <Text style={{ ...styles.subHeading, fontSize: typography.subHeadingSize * 0.8, marginBottom: 0, textAlign: 'center', color: (remindersOn == false) ? '#FFF' : '#000' }}>👎 No</Text>
                        </TouchableOpacity>
                    <Text style={{ ...styles.subHeading, color: lightColor.FOREGROUND, fontSize: typography.subHeadingSize - 2, marginBottom: 0, marginTop: SPACE }}>You can change this later, don't worry</Text>
                </Animated.View>
            </ScrollView>
            <AnimatedTouchable
                style={{ 
                    ...styles.button, 
                    opacity: fadeAnim,
                    backgroundColor: isButtonDisabled() ? '#888' : '#000'
                }}
                onPress={() => {
                    if (currentStep === 0) {
                        enterName(name)
                    } else if (currentStep === 1) {
                        enterAvatar(selectedAvatar)
                    } else if (currentStep === 2) {
                        enterStrategy(preferredStrategy)
                    } else if (currentStep === 3) {
                        // Save all onboarding data to database
                        const saveOnboardingData = async () => {
                            try {
                                logAction('onboarding_completion_started', {
                                    name: name.trim(),
                                    selectedAvatar: selectedAvatar,
                                    preferredStrategy: preferredStrategy,
                                    remindersEnabled: remindersOn
                                });

                                console.log('💾 Saving onboarding data to database...');
                                
                                // Update user profile (name and avatar)
                                await updateUserProfile({
                                    displayName: name.trim(),
                                    avatarName: selectedAvatar
                                });
                                console.log('✅ User profile updated');
                                
                                // Update preferences (strategy and reminders)
                                await updatePreferences({
                                    defaultStrategy: preferredStrategy,
                                    notificationsEnabled: remindersOn
                                });
                                console.log('✅ User preferences updated');
                                
                                // Mark onboarding as complete
                                await markOnboardingComplete();
                                console.log('✅ Onboarding marked as complete');
                                
                                // Update local app state
                                setAppState(prevState => ({
                                    ...prevState,
                                    name: name.trim(),
                                    avatarName: selectedAvatar,
                                    userPreferences: {
                                        ...prevState.userPreferences,
                                        defaultStrategy: preferredStrategy,
                                        taskRemindersEnabled: remindersOn,
                                    },
                                    onboarded: true,
                                }));
                                
                                logAction('onboarding_completed_successfully', {
                                    name: name.trim(),
                                    selectedAvatar: selectedAvatar,
                                    preferredStrategy: preferredStrategy,
                                    remindersEnabled: remindersOn
                                });
                                
                                console.log('✅ All onboarding data saved successfully');
                                
                                // Navigate to main app
                                console.log('🏠 Navigating to main app...');
                                navigation.replace('MainTabs');
                                
                            } catch (error) {
                                logError('onboarding_completion_failed', error, {
                                    name: name.trim(),
                                    selectedAvatar: selectedAvatar,
                                    preferredStrategy: preferredStrategy,
                                    remindersEnabled: remindersOn
                                });
                                
                                console.error('⚠️ Failed to save onboarding data:', error);
                                // Still navigate to main app even if API calls fail
                                console.log('📊 Current appState in error case:', {
                                    savedSchedulesCount: appState.savedSchedules?.length,
                                    activeSchedule: appState.activeSchedule?.name,
                                    onboarded: appState.onboarded
                                });
                                
                                setAppState(prevState => ({
                                    ...prevState,
                                    name: name.trim(),
                                    avatarName: selectedAvatar,
                                    onboarded: true, // Mark onboarding as complete even on error
                                    userPreferences: {
                                        ...prevState.userPreferences,
                                        defaultStrategy: preferredStrategy,
                                        taskRemindersEnabled: remindersOn,
                                    }
                                }));
                                
                                // Navigate to main app even if there was an error
                                console.log('🏠 Navigating to main app despite error...');
                                navigation.replace('MainTabs');
                            }
                        };
                        
                        saveOnboardingData();
                    }
                }}
                disabled={isButtonDisabled()}
            >
                <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>Next</Text>
            </AnimatedTouchable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: padding.SCREEN_PADDING,
        backgroundColor: lightColor.BACKGROUND,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: typography.titleSize * 1.5,
        fontFamily: 'PinkSunset',
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    subHeading: {
        fontSize: typography.subHeadingSize * 1.5,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    card: {
        width: width - padding.SCREEN_PADDING * 2,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        padding: 16,
        marginHorizontal: padding.SCREEN_PADDING,
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
    button: {
        width: '90%',
        borderRadius: 12,
        backgroundColor: '#000' ,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 16,
        gap: 12,
        position: 'absolute',
        bottom: 32,
    },
    choiceButton: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#F0F0F0' ,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    avatarOption: {
        width: '30%',
        aspectRatio: 1,
        marginBottom: 12,
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedAvatarOption: {
        borderWidth: 2,
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 40,
        marginBottom: 4,
    },
    avatarText: {
        fontSize: 10,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default OnboardingScreen;