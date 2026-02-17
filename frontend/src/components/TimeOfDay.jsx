import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { spacing, padding } from '../design/spacing.js';
import useCurrentTime from '../utils/useCurrentTime.js';

const { width, height } = Dimensions.get('window');
const WIDTH = width - padding.SCREEN_PADDING * 2;
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const TimeOfDay = () => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const currentTime = useCurrentTime();

    // Get current hour (0-23)
    const currentHour = currentTime.getHours();

    // Determine time of day and corresponding message
    const getTimeOfDayInfo = () => {
        if (currentHour >= 5 && currentHour < 12) {
            // Morning: 5 AM - 11:59 AM
            return {
                greeting: 'Good Morning!',
                message: 'All the best for your day ahead.',
                backgroundImage: require('../../assets/time-of-day/day.png'),
            };
        } else if (currentHour >= 12 && currentHour < 17) {
            // Afternoon: 12 PM - 4:59 PM
            return {
                greeting: 'Good Afternoon!',
                message: 'You got this. Keep on going!',
                backgroundImage: require('../../assets/time-of-day/day.png'),
            };
        } else if (currentHour >= 17 && currentHour < 21) {
            // Evening: 5 PM - 8:59 PM
            return {
                greeting: 'Good Evening!',
                message: 'Keep going, one last stretch!',
                backgroundImage: require('../../assets/time-of-day/evening.png'),
            };
        } else {
            // Night: 9 PM - 4:59 AM
            return {
                greeting: 'Good Night!',
                message: 'You did amazing today.',
                backgroundImage: require('../../assets/time-of-day/night.png'),
            };
        }
    };

    const timeInfo = getTimeOfDayInfo();

    return (
        <View style={styles.container}>
            <ImageBackground
                source={timeInfo.backgroundImage}
                style={styles.card}
                imageStyle={styles.backgroundImage}
            >
                <View style={styles.overlay}>
                    <View style={styles.content}>
                        <Text style={styles.greetingText}>{timeInfo.greeting}</Text>
                        <Text style={styles.messageText}>{timeInfo.message}</Text>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: WIDTH,
        alignSelf: 'center',
        marginBottom: SPACE,
    },
    card: {
        width: WIDTH,
        height: 140,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
    },
    backgroundImage: {
        borderRadius: 12,
        resizeMode: 'cover',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark overlay for text readability
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    greetingText: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: '#000',
        textShadowOffset: {
            width: 0,
            height: 0,
        },
        textShadowOpacity: 0.1,
    },
    messageText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        color: '#FFFFFF',
        textAlign: 'center',
        opacity: 0.95,
        textShadowColor: '#000',
        textShadowOffset: {
            width: 0,
            height: 0,
        },
        textShadowOpacity: 0.1,
    },
});

export default TimeOfDay;
