import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import GoToIcon from '../../assets/system-icons/GoToIcon.svg';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import Modal from 'react-native-modal';

const GenerationModal = ({ isVisible, onViewSchedule, reschedule = false }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const titles1 = ['Generating Schedule', 'Schedule Generated!'];
    const titles2 = ['Rescheduling', 'Reschedule Complete!'];
    const titles = !reschedule ? titles1 : titles2;
    const [showFinish, setShowFinish] = useState(false);
    const [title, setTitle] = useState(titles[0]);

    const onAnimFinish = () => {
        setShowFinish(true);
        setTitle(titles[1]);
    };

    const reset = () => {
        setShowFinish(false);
        setTitle(titles[0]);
    };

    const animMap = {
        light: require('../../assets/animations/light/CalendarLoadingAnimation.json'),
        dark: require('../../assets/animations/dark/CalendarLoadingAnimation.json'),
    };

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <View style={{ ...styles.card, backgroundColor: theme.BACKGROUND }}>
                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>{title}</Text>
                <LottieView
                    source={animMap[appState.userPreferences.theme]}
                    loop={false}
                    autoPlay={true}
                    speed={2}
                    onAnimationFinish={() => onAnimFinish()}
                    style={{ width: 300, height: 250 }}
                />
                {showFinish ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            The process is complete. You can now view your schedule!
                        </Text>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                onViewSchedule();
                                reset();
                            }}
                        >
                            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                <Text
                                    style={{
                                        color: '#FFF',
                                        fontFamily: 'AlbertSans',
                                        alignSelf: 'center',
                                    }}
                                >
                                    View Schedule
                                </Text>
                                <GoToIcon width={20} height={20} />
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                        This may take a few seconds...
                    </Text>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        marginVertical: 16,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginBottom: 16,
        alignSelf: 'center',
    },
    subHeading: {
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        marginVertical: 8,
        textAlign: 'center',
    },
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 16,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
});

export default GenerationModal;
