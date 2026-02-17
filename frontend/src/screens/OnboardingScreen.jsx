import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TextInput,
    TouchableOpacity,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import LottieView from 'lottie-react-native';

import { useAppState } from '../context/AppStateContext.js';
import { useAuthenticatedAPI } from '../api/index.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { padding } from '../design/spacing.js';
import LoadingScreen from './LoadingScreen.jsx';
import { typography } from '../design/typography.js';
import { CheckCheck } from 'lucide-react-native';
import { getAvatarList, getRandomAvatar } from '../utils/avatarUtils.js';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
    const { appState, setAppState } = useAppState();
    const { updateUserProfile, updatePreferences, markOnboardingComplete } = useAuthenticatedAPI();
    const { logAction, logScreenView, logError } = useActionLogger('Onboarding');

    const [fontsLoaded] = Font.useFonts({
        PinkSunset: require('../../assets/fonts/PinkSunset-Regular.ttf'),
        AlbertSans: require('../../assets/fonts/AlbertSans-VariableFont_wght.ttf'),
    });

    const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

    const insets = useSafeAreaInsets();
    const [currentStep, setCurrentStep] = useState(1); // Steps 1-8
    const [buttonText, setButtonText] = useState("Let's go");
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);

    // Animated value for progress bar
    const progressAnim = useRef(new Animated.Value(12.5)).current; // Start at 12.5% (1/8 * 100)

    // Animated value for progress ring (Step 7)
    const progressRingAnim = useRef(new Animated.Value(0)).current;

    // Animated value for Step 1 fade-in
    const step1FadeAnim = useRef(new Animated.Value(0)).current;

    // Onboarding data states
    const [name, setName] = useState('');
    const [preferredStrategy, setPreferredStrategy] = useState('');
    const [remindersOn, setRemindersOn] = useState(true);
    const [selectedAvatar, setSelectedAvatar] = useState('');

    const avatarList = getAvatarList();

    // Animated values for each step (8 animated views)
    const stepAnimations = useRef([
        new Animated.Value(0), // Step 1
        new Animated.Value(width), // Step 2
        new Animated.Value(width), // Step 3
        new Animated.Value(width), // Step 4
        new Animated.Value(width), // Step 5
        new Animated.Value(width), // Step 6
        new Animated.Value(width), // Step 7
        new Animated.Value(width), // Step 8
    ]).current;

    const progressPercentage = (currentStep / 8) * 100;

    // Animate progress bar when currentStep changes
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPercentage,
            duration: 800, // 800ms smooth animation
            useNativeDriver: false, // Width animations need to use JS driver
        }).start();
    }, [currentStep, progressPercentage]);

    // Fade in Step 1 when screen becomes visible (after fonts are loaded)
    useEffect(() => {
        if (fontsLoaded) {
            // Add a small delay to ensure the screen is fully rendered
            const timer = setTimeout(() => {
                Animated.timing(step1FadeAnim, {
                    toValue: 1,
                    duration: 1000, // 1 second smooth fade-in
                    useNativeDriver: true,
                }).start();
            }, 100); // 100ms delay to ensure screen is visible

            return () => clearTimeout(timer);
        }
    }, [fontsLoaded]);

    // Function to check if button should be disabled for current step
    const checkButtonDisability = (step) => {
        switch (step) {
            case 1:
                // Step 1: Welcome - disabled while name is empty
                return name.trim() === '';
            case 2:
                // Step 2: User info - always enabled
                return false;
            case 3:
                // Step 3: Strategy selection - disabled while no strategy selected
                return preferredStrategy === '';
            case 4:
                // Step 4: Validating user's scheduling needs - always enabled
                return false;
            case 5:
                // Step 5: Plannr comes in - always enabled
                return false;
            case 6:
                // Step 6: Notifications - always enabled
                return false;
            case 7:
                // Step 7: Almost done - always enabled
                return false;
            case 8:
                // Step 8: Avatar selection - disabled while no avatar selected
                return selectedAvatar === '';
            default:
                return false;
        }
    };

    // Function to get button text for current step
    const getButtonText = (step) => {
        switch (step) {
            case 1:
                return "Let's go";
            case 2:
                return 'Find my style';
            case 3:
                return 'Continue';
            case 4:
                return "That's reassuring";
            case 5:
                return 'Save my time';
            case 6:
                return 'Continue';
            case 7:
                return "Let's do this";
            case 8:
                return "Let's dive in";
            default:
                return 'Continue';
        }
    };

    // Update button disability and text when step changes
    useEffect(() => {
        setIsButtonDisabled(checkButtonDisability(currentStep));
        setButtonText(getButtonText(currentStep));

        // Trigger progress ring animation when reaching step 7
        if (currentStep === 7) {
            Animated.timing(progressRingAnim, {
                toValue: 95,
                duration: 2000, // 2 second animation
                useNativeDriver: false,
            }).start();
        }
    }, [currentStep, name, preferredStrategy, selectedAvatar]);

    // Function to handle step navigation
    const goToNextStep = async () => {
        if (isButtonDisabled) return; // Prevent navigation if button is disabled

        if (currentStep < 8) {
            const nextStep = currentStep + 1;

            // Log action for step navigation
            logAction('onboarding_step_completed', {
                fromStep: currentStep,
                toStep: nextStep,
                stepData: {
                    name: currentStep === 1 ? name : undefined,
                    preferredStrategy: currentStep === 3 ? preferredStrategy : undefined,
                    remindersOn: currentStep === 6 ? remindersOn : undefined,
                },
            });

            // First, ensure the next step is positioned off-screen to the right
            stepAnimations[nextStep - 1].setValue(width);

            // Animate current step out to the left and next step in from the right simultaneously
            Animated.parallel([
                Animated.timing(stepAnimations[currentStep - 1], {
                    toValue: -width,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(stepAnimations[nextStep - 1], {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();

            setCurrentStep(nextStep);
        } else {
            // Handle onboarding completion - Step 8
            try {
                logAction('onboarding_completion_started', {
                    name: name,
                    preferredStrategy: preferredStrategy,
                    remindersOn: remindersOn,
                    selectedAvatar: selectedAvatar,
                });

                // Update user profile with collected data
                await updateUserProfile({
                    displayName: name,
                    avatarName: selectedAvatar,
                });

                // Update user preferences
                await updatePreferences({
                    defaultStrategy: preferredStrategy,
                    taskRemindersEnabled: remindersOn,
                });

                // Mark onboarding as complete
                await markOnboardingComplete();

                // Update app state
                setAppState((prevState) => ({
                    ...prevState,
                    user: {
                        ...prevState.user,
                        name: name,
                        avatarName: selectedAvatar,
                    },
                    userPreferences: {
                        ...prevState.userPreferences,
                        defaultStrategy: preferredStrategy,
                        taskRemindersEnabled: remindersOn,
                    },
                    onboarded: true,
                }));

                logAction('onboarding_completed', {
                    name: name,
                    preferredStrategy: preferredStrategy,
                    remindersOn: remindersOn,
                    selectedAvatar: selectedAvatar,
                });

                console.log('Onboarding completed successfully!');
                // TODO: Navigate to main app
            } catch (error) {
                logError('onboarding_completion_failed', error, {
                    name: name,
                    preferredStrategy: preferredStrategy,
                    remindersOn: remindersOn,
                    selectedAvatar: selectedAvatar,
                });
                console.error('Failed to complete onboarding:', error);
            }
        }
    };

    if (!fontsLoaded) return <LoadingScreen />;

    return (
        <LinearGradient
            colors={['#b79fffff', '#856bd3ff']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                        <Animated.View
                            style={[
                                styles.progressBarForeground,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%'],
                                        extrapolate: 'clamp',
                                    }),
                                },
                            ]}
                        />
                    </View>
                </View>

                <View style={[styles.stepsContainer, styles.centerContent]}>
                    {/* Step 1 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            {
                                transform: [{ translateX: stepAnimations[0] }],
                                opacity: step1FadeAnim,
                            },
                        ]}
                    >
                        <Text style={{ ...styles.stepTitle, marginBottom: 64 }}>
                            Let's build your perfect schedule.
                        </Text>
                        <Text style={styles.stepDescription}>
                            Welcome to Plannr! What's your name?
                        </Text>
                        <View style={{ ...styles.bgCard, marginBottom: 64 }}>
                            <TextInput
                                style={styles.input}
                                value={name}
                                autoCorrect={false}
                                autoCapitalize="words"
                                onChange={({ nativeEvent }) => {
                                    setName(nativeEvent.text);
                                }}
                                editable={currentStep === 1}
                            />
                        </View>
                    </Animated.View>

                    {/* Step 2 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[1] }] },
                        ]}
                    >
                        <Text style={{ ...styles.stepTitle, marginBottom: 16 }}>Hello, {name}</Text>
                        <Text style={styles.stepDescription}>
                            Everyone plans differently. There's no "right" way — just what works for
                            you.
                        </Text>
                        <View style={{ ...styles.bgCard, marginBottom: 64 }}>
                            <View style={styles.animContainer}>
                                <LottieView
                                    source={require('../../assets/animations/checklist.json')}
                                    autoPlay
                                    loop
                                    style={{ width: '100%', height: 240 }}
                                />
                            </View>
                        </View>
                    </Animated.View>

                    {/* Step 3 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[2] }] },
                        ]}
                    >
                        <Text style={styles.stepTitle}>
                            When it comes to tasks, you usually prefer to...
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginVertical: 24,
                            }}
                        >
                            <TouchableOpacity
                                style={{
                                    ...styles.choiceButton,
                                    backgroundColor:
                                        preferredStrategy === 'earliest-fit'
                                            ? 'rgba(255, 255, 255, 1)'
                                            : 'rgba(255, 255, 255, 0.5)',
                                }}
                                onPress={() => setPreferredStrategy('earliest-fit')}
                            >
                                <Text style={{ fontSize: 32 }}>⚡</Text>
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'AlbertSans',
                                        marginTop: 8,
                                    }}
                                >
                                    Get it done early
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    ...styles.choiceButton,
                                    backgroundColor:
                                        preferredStrategy === 'balanced-work'
                                            ? 'rgba(255, 255, 255, 1)'
                                            : 'rgba(255, 255, 255, 0.5)',
                                }}
                                onPress={() => setPreferredStrategy('balanced-work')}
                            >
                                <Text style={{ fontSize: 32 }}>⚖️</Text>
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'AlbertSans',
                                        marginTop: 8,
                                    }}
                                >
                                    Spread it out evenly
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    ...styles.choiceButton,
                                    backgroundColor:
                                        preferredStrategy === 'deadline-oriented'
                                            ? 'rgba(255, 255, 255, 1)'
                                            : 'rgba(255, 255, 255, 0.5)',
                                }}
                                onPress={() => setPreferredStrategy('deadline-oriented')}
                            >
                                <Text style={{ fontSize: 32 }}>🚨</Text>
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'AlbertSans',
                                        marginTop: 8,
                                    }}
                                >
                                    Leave it to the deadlines
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.stepDescription}>
                            We'll adapt your schedules around this.
                        </Text>
                    </Animated.View>

                    {/* Step 4 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[3] }] },
                        ]}
                    >
                        <Text style={{ ...styles.stepTitle, marginBottom: 32 }}>
                            {preferredStrategy === 'earliest-fit' && "Perfect! You're a go-getter."}
                            {preferredStrategy === 'balanced-work' &&
                                'Great choice! Balance is key.'}
                            {preferredStrategy === 'deadline-oriented' &&
                                'Smart! You work well under pressure.'}
                            {!preferredStrategy && 'Your scheduling style'}
                        </Text>
                        <Text style={styles.stepDescription}>
                            {preferredStrategy === 'earliest-fit' &&
                                'Getting tasks done early reduces stress and leaves room for unexpected opportunities. This approach works great for proactive planners.'}
                            {preferredStrategy === 'balanced-work' &&
                                'Spreading work evenly prevents burnout and maintains consistent productivity. This steady approach helps build sustainable habits.'}
                            {preferredStrategy === 'deadline-oriented' &&
                                'Working closer to deadlines can boost focus and creativity. This approach works well for people who thrive under time pressure.'}
                            {!preferredStrategy &&
                                "Once you choose a strategy, we'll show you why it's a great approach!"}
                        </Text>
                        {preferredStrategy && (
                            <View style={{ ...styles.bgCard, marginBottom: 64 }}>
                                <View style={styles.animContainer}>
                                    <LottieView
                                        source={
                                            preferredStrategy === 'earliest-fit'
                                                ? require('../../assets/animations/time-green.json')
                                                : preferredStrategy === 'balanced-work'
                                                  ? require('../../assets/animations/time-yellow.json')
                                                  : require('../../assets/animations/time-red.json')
                                        }
                                        autoPlay
                                        loop
                                        style={{ width: '100%', height: 240 }}
                                    />
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* Step 5 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[4] }] },
                        ]}
                    >
                        <Text style={{ ...styles.stepTitle, marginBottom: 32 }}>
                            Here's the thing
                        </Text>
                        <Text style={styles.stepDescription}>
                            You're wasting time in either coming up with the perfect schedule, or
                            improvising on the go and facing decision fatigue.
                        </Text>

                        <View style={{ ...styles.bgCard, marginBottom: 32 }}>
                            <View style={styles.animContainer}>
                                <LottieView
                                    source={require('../../assets/animations/onboarding-calendar.json')}
                                    autoPlay
                                    loop
                                    style={{ width: '100%', height: 200, marginVertical: 16 }}
                                />
                            </View>
                        </View>

                        <Text style={{ ...styles.stepDescription, color: '#000000' }}>
                            You can save 10+ hours every week. Plannr matches your pace, adapts when
                            plans change, and rebuilds your schedule automatically.
                        </Text>
                    </Animated.View>

                    {/* Step 6 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[5] }] },
                        ]}
                    >
                        <Text style={styles.stepTitle}>Want a nudge when it matters?</Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginVertical: 24,
                            }}
                        >
                            <TouchableOpacity
                                style={{
                                    ...styles.choiceButton,
                                    backgroundColor: remindersOn
                                        ? 'rgba(255, 255, 255, 1)'
                                        : 'rgba(255, 255, 255, 0.5)',
                                    width: (width - padding.SCREEN_PADDING * 2 - 12) / 2,
                                }}
                                onPress={() => setRemindersOn(true)}
                            >
                                <Text style={{ fontSize: 32 }}>⏰</Text>
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'AlbertSans',
                                        marginTop: 8,
                                    }}
                                >
                                    Yes! I'd like reminders
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    ...styles.choiceButton,
                                    backgroundColor: !remindersOn
                                        ? 'rgba(255, 255, 255, 1)'
                                        : 'rgba(255, 255, 255, 0.5)',
                                    width: (width - padding.SCREEN_PADDING * 2 - 12) / 2,
                                }}
                                onPress={() => setRemindersOn(false)}
                            >
                                <Text style={{ fontSize: 32 }}>👎</Text>
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'AlbertSans',
                                        marginTop: 8,
                                    }}
                                >
                                    No
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.stepDescription}>
                            {' '}
                            Plannr only notifies you when it actually helps - not random reminders.
                            You can change this anytime
                        </Text>
                    </Animated.View>

                    {/* Step 7 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[6] }] },
                        ]}
                    >
                        <Text style={styles.stepDescription}>You're already ahead.</Text>
                        <AnimatedCircularProgress
                            size={200}
                            width={18}
                            fill={progressRingAnim}
                            tintColor={'rgba(255, 255, 255, 1.0)'}
                            backgroundColor={'rgba(255, 255, 255, 0.5)'}
                            rotation={0}
                            lineCap="round"
                            children={(fill) => <CheckCheck size={60} color={'#fff'} />}
                            style={{ marginVertical: 24, alignSelf: 'center' }}
                        />
                        <Text style={styles.stepDescription}>People who finish set up are</Text>
                        <Text
                            style={{
                                ...styles.stepTitle,
                                marginBottom: -2,
                                fontFamily: 'PinkSunset',
                                fontSize: 64,
                            }}
                        >
                            2X MORE
                        </Text>
                        <Text style={styles.stepDescription}>likely to stay consistent.</Text>
                    </Animated.View>

                    {/* Step 8 */}
                    <Animated.View
                        style={[
                            styles.cardAbsolute,
                            { transform: [{ translateX: stepAnimations[7] }] },
                        ]}
                    >
                        <Text style={styles.stepTitle}>Pick your avatar!</Text>
                        <Text style={styles.stepDescription}>
                            Choose an avatar that represents you.
                        </Text>

                        <View style={styles.avatarGrid}>
                            {avatarList.map((avatar) => (
                                <TouchableOpacity
                                    key={avatar.name}
                                    style={[
                                        styles.avatarOption,
                                        selectedAvatar === avatar.name &&
                                            styles.selectedAvatarOption,
                                    ]}
                                    onPress={() => setSelectedAvatar(avatar.name)}
                                >
                                    <Image
                                        source={avatar.image}
                                        style={styles.avatarImage}
                                        resizeMode="cover"
                                    />
                                    <Text style={styles.avatarText}>{avatar.displayName}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={{ ...styles.stepDescription, fontSize: 14, opacity: 0.8 }}>
                            You can change this later, don't worry
                        </Text>
                    </Animated.View>
                </View>

                <AnimatedTouchable
                    style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
                    onPress={goToNextStep}
                    disabled={isButtonDisabled}
                >
                    <Text
                        style={[styles.buttonText, isButtonDisabled && styles.buttonTextDisabled]}
                    >
                        {buttonText}
                    </Text>
                </AnimatedTouchable>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        justifyContent: 'space-between',
        paddingHorizontal: padding.SCREEN_PADDING,
        flex: 1,
    },
    stepsContainer: {
        width: '100%',
    },
    progressBarContainer: {
        width: '100%',
    },
    progressBarBackground: {
        height: 4,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.5)', // White with 50% opacity
    },
    progressBarForeground: {
        height: 4,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 1.0)', // White with 100% opacity
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 28,
        color: '#fff',
        fontFamily: 'PinkSunset',
        textAlign: 'center',
        marginBottom: 16,
    },
    stepText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'AlbertSans',
        textAlign: 'center',
    },
    cardAbsolute: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    stepTitle: {
        fontSize: 32,
        color: '#fff',
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        marginBottom: 16,
    },
    stepDescription: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 1)',
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 12,
    },
    bgCard: {
        width: width - padding.SCREEN_PADDING * 2,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',

        boxShadow: `
        inset -4px 0px 12px rgba(0, 0, 0, 0.05),
        inset 0px -4px 12px rgba(0, 0, 0, 0.05),
        inset 4px 0px 12px rgba(255, 255, 255, 0.15),
        inset 0px 4px 12px rgba(255, 255, 255, 0.15)
        `,
        padding: padding.PADDING_4,
    },
    button: {
        width: width - padding.SCREEN_PADDING * 2,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: padding.PADDING_3,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 48,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
    },
    buttonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        opacity: 0.6,
    },
    buttonText: {
        color: '#000000',
        fontSize: 16,
        fontFamily: 'AlbertSans',
    },
    buttonTextDisabled: {
        color: 'rgba(0, 0, 0, 0.5)',
    },
    input: {
        height: 40,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    choiceButton: {
        width: (width - padding.SCREEN_PADDING * 2 - 24) / 3,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',

        boxShadow: `
        inset -4px 0px 12px rgba(0, 0, 0, 0.05),
        inset 0px -4px 12px rgba(0, 0, 0, 0.05),
        inset 4px 0px 12px rgba(255, 255, 255, 0.15),
        inset 0px 4px 12px rgba(255, 255, 255, 0.15)
        `,
        padding: padding.PADDING_4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animContainer: {
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 16,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 24,
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
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    selectedAvatarOption: {
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 1.0)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 4,
    },
    avatarText: {
        fontSize: 12,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        fontWeight: '700',
        color: '#fff',
    },
});

export default OnboardingScreen;
