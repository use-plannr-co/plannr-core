import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import FireIcon from '../../assets/system-icons/FireIcon.svg';
import WarningIcon from '../../assets/system-icons/WarningIcon.svg';
import CheckIcon from '../../assets/system-icons/CheckIcon.svg';
import ClockIcon from '../../assets/system-icons/ClockIcon.svg';
import useCurrentTime from '../utils/useCurrentTime.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';

const { width, height } = Dimensions.get('window');
const WIDTH = width - padding.SCREEN_PADDING * 2;
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const Insights = ({ version, schedule }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    // Return placeholder if no schedule is available
    if (!schedule) {
        return (
            <View
                style={{
                    ...styles.card,
                    backgroundColor: theme.COMP_COLOR,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1,
                }}
            >
                <Text
                    style={{ ...styles.subHeading, color: theme.FOREGROUND, textAlign: 'center' }}
                >
                    No schedule data available
                </Text>
            </View>
        );
    }

    const Type1 = (schedule) => {
        const datesList = schedule.getAllDatesInOrder();
        const currentDate = convertDateToScheduleDate(useCurrentTime()).getId();
        const day = datesList.indexOf(currentDate);
        const totalDays = datesList.length;
        return (
            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Day</Text>
                    <ClockIcon width={24} height={24} color={theme.PURPLE} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: -4,
                            fontSize: 48,
                            color: theme.FOREGROUND,
                            width: 100,
                        }}
                    >
                        {day + 1}
                        <Text
                            style={{
                                ...styles.subHeading,
                                marginBottom: 0,
                                fontSize: 24,
                                color: theme.FOREGROUND,
                            }}
                        >
                            {' '}
                            / {totalDays}
                        </Text>
                    </Text>
                </View>
            </View>
        );
    };

    const Type2 = (schedule) => {
        const [completed, setCompleted] = useState(0);
        const [totalTasks, setTotalTasks] = useState(0);

        useEffect(() => {
            const datesList = schedule.getAllDatesInOrder();
            let total = 0;
            let done = 0;

            for (const date of datesList) {
                const tasks = schedule.getScheduleForDate(date).getTimeBlocks();
                total += tasks.length;
                done += tasks.filter((task) => task.completed).length;
            }

            setCompleted(done);
            setTotalTasks(total);
        }, [schedule]);

        const [animatedFill] = useState(new Animated.Value(0));

        useEffect(() => {
            Animated.timing(animatedFill, {
                toValue: (completed * 100) / totalTasks,
                duration: 1000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }).start();
        }, [schedule, completed, totalTasks]);

        return (
            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Tasks</Text>
                    <CheckIcon width={24} height={24} color={theme.GREEN} />
                </View>
                <AnimatedCircularProgress
                    size={96}
                    width={10}
                    fill={animatedFill}
                    tintColor={theme.GRADIENT_START}
                    backgroundColor={theme.INPUT}
                    rotation={0}
                    lineCap="round"
                    children={(fill) => (
                        <Text
                            style={{
                                fontFamily: 'AlbertSans',
                                fontSize: 16,
                                fontWeight: '600',
                                color: theme.FOREGROUND,
                            }}
                        >
                            {Math.round(fill)}%
                        </Text>
                    )}
                />
            </View>
        );
    };

    const Type3 = (schedule) => {
        const time = useCurrentTime();
        const currentDate = convertDateToScheduleDate(time).getId();
        const [missedTasks, setMissedTasks] = useState(0);

        useEffect(() => {
            const datesList = schedule.getAllDatesInOrder();
            let missingTasks = 0;

            for (const date of datesList) {
                if (date === currentDate) {
                    break;
                }
                const tasks = schedule.getScheduleForDate(date).getTimeBlocks();
                missingTasks += tasks.filter((task) => !task.completed).length;
            }
            setMissedTasks(missingTasks);
        }, [schedule]);

        return (
            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Missed</Text>
                    <WarningIcon width={24} height={24} color={theme.RED} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: -4,
                            fontSize: 48,
                            color: theme.FOREGROUND,
                            width: 120,
                        }}
                    >
                        {missedTasks}
                        <Text
                            style={{ ...styles.subHeading, fontSize: 24, color: theme.FOREGROUND }}
                        >
                            {' '}
                            tasks
                        </Text>
                    </Text>
                </View>
            </View>
        );
    };

    const Type4 = (schedule) => {
        const [streak, setStreak] = useState(0);
        const currentDate = convertDateToScheduleDate(useCurrentTime()).getId();

        useEffect(() => {
            const datesList = schedule.getAllDatesInOrder();
            let currStreak = 0;

            for (const date of datesList) {
                const tasks = schedule.getScheduleForDate(date).getTimeBlocks();
                if (date === currentDate) {
                    if (tasks.length > 0 && tasks.every((task) => task.completed)) {
                        currStreak += 1;
                        break;
                    } else {
                        break;
                    }
                }
                if (tasks.length > 0 && tasks.every((task) => task.completed)) {
                    currStreak += 1;
                } else {
                    currStreak = 0;
                }
            }

            setStreak(currStreak);
        }, [schedule]);
        return (
            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Streak</Text>
                    <FireIcon width={24} height={24} color={theme.ORANGE} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text
                        style={{
                            ...styles.subHeading,
                            marginBottom: -4,
                            fontSize: 48,
                            color: theme.FOREGROUND,
                            width: 100,
                        }}
                    >
                        {streak}
                        <Text
                            style={{ ...styles.subHeading, fontSize: 24, color: theme.FOREGROUND }}
                        >
                            {' '}
                            days
                        </Text>
                    </Text>
                </View>
            </View>
        );
    };

    switch (version) {
        case 1:
            return Type1(schedule);
        case 2:
            return Type2(schedule);
        case 3:
            return Type3(schedule);
        case 4:
            return Type4(schedule);
        default:
            return (
                <View
                    style={{
                        ...styles.card,
                        backgroundColor: theme.COMP_COLOR,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                        No insights available
                    </Text>
                </View>
            );
    }
};

const styles = StyleSheet.create({
    card: {
        width: (WIDTH - padding.SCREEN_PADDING) / 2,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        padding: 16,
        marginBottom: SPACE,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
    },
});

export default Insights;
