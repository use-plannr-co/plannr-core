import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Image,
    TouchableOpacity,
    ScrollView,
    Animated,
} from 'react-native';

import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { typography } from '../design/typography.js';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import WalkthroughBottomSheet from '../components/WalkthroughBottomSheet.jsx';
const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;
const IMAGE_WIDTH = height > 900 ? 260 : height > 800 ? 220 : 200;

const WalkthroughScreen = () => {
    const { appState, setAppState } = useAppState();
    const { logAction, logScreenView } = useActionLogger('Walkthrough');
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [currentStep, setCurrentStep] = useState(0);
    const walkthroughBottomSheetRef = useRef(null);

    React.useEffect(() => {
        logScreenView({ currentStep: currentStep });
    }, [currentStep]);

    const indicatorX0 = useRef(new Animated.Value(0)).current;
    const indicatorX1 = useRef(new Animated.Value(0)).current;
    const indicatorX2 = useRef(new Animated.Value(0)).current;
    const indicatorX3 = useRef(new Animated.Value(0)).current;
    const indicatorX4 = useRef(new Animated.Value(0)).current;
    const indicatorX5 = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={{
                        width: 48,
                        height: 48,
                        marginBottom: SPACE,
                        position: 'absolute',
                        left: 0,
                    }}
                />
                <Text style={{ ...styles.title, marginBottom: 0 }}>Plannr</Text>
                <TouchableOpacity
                    style={styles.button1}
                    onPress={() => {
                        logAction('walkthrough_skipped', { currentStep: currentStep });
                        console.log('Skip Pressed');
                        setAppState((prevState) => ({
                            ...prevState,
                            // onboarded: true, // Uncomment when onboarding is added
                        }));
                    }}
                >
                    <Text style={{ ...styles.subHeading, color: '#fff', marginBottom: 0 }}>
                        Skip
                    </Text>
                </TouchableOpacity>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                style={{ width: '100%', zIndex: 0 }}
            >
                <Animated.View
                    style={{ ...styles.walkthroughView, transform: [{ translateX: indicatorX0 }] }}
                >
                    <Image
                        source={require('../../assets/walkthrough/Planzo.png')}
                        style={{
                            width: 300,
                            height: 350,
                            marginBottom: SPACE,
                            alignSelf: 'center',
                        }}
                    />
                    <Text style={{ ...styles.title, marginBottom: SPACE }}>I'm Planzo</Text>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: SPACE,
                            width: width - 2 * padding.SCREEN_PADDING,
                            textAlign: 'center',
                        }}
                    >
                        I'm your personal planning assistant! P.S. I'm getting a crazy update soon
                        :)
                    </Text>
                </Animated.View>
                <Animated.View
                    style={{ ...styles.walkthroughView, transform: [{ translateX: indicatorX1 }] }}
                >
                    <View style={styles.imageView}>
                        <Image
                            source={require('../../assets/walkthrough/HomeScreen.png')}
                            style={{
                                borderRadius: 12,
                                width: IMAGE_WIDTH,
                                height: (20 / 9) * IMAGE_WIDTH,
                                alignSelf: 'center',
                            }}
                        />
                    </View>
                    <Text style={{ ...styles.title, marginBottom: SPACE }}>Home Screen</Text>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: SPACE,
                            width: width - 2 * padding.SCREEN_PADDING,
                            textAlign: 'center',
                        }}
                    >
                        This is your home base where you can quickly access your tasks, schedules,
                        and preferences.
                    </Text>
                </Animated.View>
                <Animated.View
                    style={{ ...styles.walkthroughView, transform: [{ translateX: indicatorX2 }] }}
                >
                    <View style={styles.imageView}>
                        <Image
                            source={require('../../assets/walkthrough/TodaysTasks.png')}
                            style={{
                                borderRadius: 12,
                                width: IMAGE_WIDTH,
                                height: (20 / 9) * IMAGE_WIDTH,
                                alignSelf: 'center',
                            }}
                        />
                    </View>
                    <Text style={{ ...styles.title, marginBottom: SPACE }}>Today's Tasks</Text>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: SPACE,
                            width: width - 2 * padding.SCREEN_PADDING,
                            textAlign: 'center',
                        }}
                    >
                        This is your home base where you can quickly access your tasks, schedules,
                        and preferences.
                    </Text>
                </Animated.View>
                <Animated.View
                    style={{ ...styles.walkthroughView, transform: [{ translateX: indicatorX3 }] }}
                >
                    <View style={styles.imageView}>
                        <Image
                            source={require('../../assets/walkthrough/PlannrCenter.png')}
                            style={{
                                borderRadius: 12,
                                width: IMAGE_WIDTH,
                                height: (20 / 9) * IMAGE_WIDTH,
                                alignSelf: 'center',
                            }}
                        />
                    </View>
                    <Text style={{ ...styles.title, marginBottom: SPACE }}>Plannr Center</Text>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: SPACE,
                            width: width - 2 * padding.SCREEN_PADDING,
                            textAlign: 'center',
                        }}
                    >
                        This is your home base where you can quickly access your tasks, schedules,
                        and preferences.
                    </Text>
                </Animated.View>
                <Animated.View
                    style={{ ...styles.walkthroughView, transform: [{ translateX: indicatorX4 }] }}
                >
                    <View style={styles.imageView}>
                        <Image
                            source={require('../../assets/walkthrough/SavedSchedules.png')}
                            style={{
                                borderRadius: 12,
                                width: IMAGE_WIDTH,
                                height: (20 / 9) * IMAGE_WIDTH,
                                alignSelf: 'center',
                            }}
                        />
                    </View>
                    <Text style={{ ...styles.title, marginBottom: SPACE }}>Saved Schedules</Text>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: SPACE,
                            width: width - 2 * padding.SCREEN_PADDING,
                            textAlign: 'center',
                        }}
                    >
                        This is your home base where you can quickly access your tasks, schedules,
                        and preferences.
                    </Text>
                </Animated.View>
                <Animated.View
                    style={{ ...styles.walkthroughView, transform: [{ translateX: indicatorX5 }] }}
                >
                    <View style={styles.imageView}>
                        <Image
                            source={require('../../assets/walkthrough/Preferences.png')}
                            style={{
                                borderRadius: 12,
                                width: IMAGE_WIDTH,
                                height: (20 / 9) * IMAGE_WIDTH,
                                alignSelf: 'center',
                            }}
                        />
                    </View>
                    <Text style={{ ...styles.title, marginBottom: SPACE }}>Preferences</Text>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: SPACE,
                            width: width - 2 * padding.SCREEN_PADDING,
                            textAlign: 'center',
                        }}
                    >
                        This is your home base where you can quickly access your tasks, schedules,
                        and preferences.
                    </Text>
                </Animated.View>
            </ScrollView>
            <View style={{ width: '100%', position: 'absolute', bottom: 32 }}>
                <Animated.Image
                    source={require('../../assets/walkthrough/PlanzoPeep.png')}
                    style={{
                        width: 80,
                        height: 72,
                        alignSelf: 'center',
                        marginBottom: -18,
                        zIndex: 1,
                        opacity: fadeAnim,
                        alignSelf: 'flex-end',
                        marginRight: 12,
                    }}
                />
                <TouchableOpacity
                    style={styles.button2}
                    onPress={() => {
                        logAction('walkthrough_next_pressed', {
                            fromStep: currentStep,
                            toStep: currentStep + 1,
                        });
                        console.log(currentStep, 'Next Pressed');
                        if (currentStep === 0) {
                            Animated.timing(indicatorX0, {
                                toValue: -(width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(fadeAnim, {
                                toValue: 1,
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX1, {
                                toValue: -(width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX2, {
                                toValue: -(width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX3, {
                                toValue: -(width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX4, {
                                toValue: -(width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX5, {
                                toValue: -(width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            setCurrentStep(1);
                        } else if (currentStep === 1) {
                            Animated.timing(indicatorX1, {
                                toValue: -2 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX2, {
                                toValue: -2 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX3, {
                                toValue: -2 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX4, {
                                toValue: -2 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX5, {
                                toValue: -2 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            setCurrentStep(2);
                        } else if (currentStep === 2) {
                            Animated.timing(indicatorX2, {
                                toValue: -3 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX3, {
                                toValue: -3 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX4, {
                                toValue: -3 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX5, {
                                toValue: -3 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            setCurrentStep(3);
                        } else if (currentStep === 3) {
                            Animated.timing(indicatorX3, {
                                toValue: -4 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX4, {
                                toValue: -4 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX5, {
                                toValue: -4 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            setCurrentStep(4);
                        } else if (currentStep === 4) {
                            Animated.timing(indicatorX4, {
                                toValue: -5 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            Animated.timing(indicatorX5, {
                                toValue: -5 * (width - 2 * padding.SCREEN_PADDING),
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            setCurrentStep(5);
                        } else if (currentStep === 5) {
                            Animated.timing(fadeAnim, {
                                toValue: 0,
                                duration: 500,
                                useNativeDriver: true,
                            }).start();
                            walkthroughBottomSheetRef.current?.show();
                        }
                    }}
                >
                    <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                        Next
                    </Text>
                </TouchableOpacity>
            </View>

            <WalkthroughBottomSheet ref={walkthroughBottomSheetRef} theme={theme} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: padding.SCREEN_PADDING,
        backgroundColor: lightColor.BACKGROUND,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACE,
        position: 'absolute',
        top: 72,
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    imageView: {
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        marginBottom: SPACE,
    },
    button1: {
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'absolute',
        right: 0,
    },
    button2: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    walkthroughView: {
        width: width - 2 * padding.SCREEN_PADDING,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default WalkthroughScreen;
