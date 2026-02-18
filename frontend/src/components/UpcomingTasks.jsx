import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import ActivityTypeIcons from '../model/ActivityTypeIcons';
import { useAppState } from '../context/AppStateContext.js';
import convertTimeToTime24 from '../utils/timeConversion.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import useCurrentTime from '../utils/useCurrentTime.js';
import Expand from '../../assets/system-icons/Expand.svg';
import Other from '../../assets/type-icons/Other.svg';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const WIDTH = width - padding.SCREEN_PADDING * 2;
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const UpcomingTasks = ({ onClick }) => {
    const { appState } = useAppState();
    const currentTime = useCurrentTime();

    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const todaysDate = convertDateToScheduleDate(currentTime);
    let todaysTasks = [];

    const loadTodaysTasks = () => {
        // Check if the user has an active schedule and the schedule object is not null
        if (appState.activeSchedule !== null && appState.activeSchedule.schedule !== null) {
            const todaysSchedule = appState.activeSchedule.schedule.getScheduleForDate(
                todaysDate.getId(),
            );
            if (todaysSchedule !== undefined) {
                todaysTasks = todaysSchedule.getTimeBlocks();
            }
        }
    };

    loadTodaysTasks();

    const [upcomingTasks, setUpcomingTasks] = useState([]);
    const [allCompleted, setAllComplete] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            loadTodaysTasks();
            const check = todaysTasks.every((task) => task.completed);
            setAllComplete(check);
            const tasksLeft = todaysTasks.filter((task) => {
                let curr = convertTimeToTime24(currentTime);
                return curr.isBefore(task.endTime);
            });
            setUpcomingTasks(tasksLeft);
        }, 500);

        return () => clearInterval(timer);
    }, [todaysTasks, appState]);

    const NoUpcomingTasksView = () => {
        const imageMap = {
            light: require('../../assets/images/light/NoUpcomingTasks.png'),
            dark: require('../../assets/images/dark/NoUpcomingTasks.png'),
        };

        return (
            <View
                style={{
                    ...styles.card,
                    backgroundColor: theme.COMP_COLOR,
                    justifyContent: 'center',
                }}
            >
                <Image
                    source={imageMap[appState.userPreferences.theme]}
                    style={{ width: 192, height: 192, alignSelf: 'center' }}
                />
                <Text
                    style={{
                        fontSize: typography.subHeadingSize,
                        fontFamily: 'AlbertSans',
                        alignSelf: 'center',
                        color: theme.FOREGROUND,
                    }}
                >
                    You have no upcoming tasks for today!
                </Text>
            </View>
        );
    };

    const NoTasksView = () => {
        const imageMap = {
            light: require('../../assets/images/light/NoTasks.png'),
            dark: require('../../assets/images/dark/NoTasks.png'),
        };

        return (
            <View
                style={{
                    ...styles.card,
                    backgroundColor: theme.COMP_COLOR,
                    justifyContent: 'center',
                }}
            >
                <Image
                    source={imageMap[appState.userPreferences.theme]}
                    style={{ width: 192, height: 192, alignSelf: 'center' }}
                />
                <Text
                    style={{
                        fontSize: typography.subHeadingSize,
                        fontFamily: 'AlbertSans',
                        alignSelf: 'center',
                        color: theme.FOREGROUND,
                    }}
                >
                    You have no tasks due for today!
                </Text>
            </View>
        );
    };

    const TasksView = () => {
        return (
            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                <FlatList
                    data={upcomingTasks.slice(0, 3)}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => {
                        const ICON = ActivityTypeIcons[item.activityType] || Other;
                        return (
                            <View style={{ height: 64, marginBottom: 4 }}>
                                <View
                                    style={{
                                        ...styles.taskCard,
                                        backgroundColor: theme.COMP_COLOR,
                                    }}
                                >
                                    <ICON width={36} height={36} color={theme.FOREGROUND} />
                                    <View>
                                        <Text
                                            style={{ ...styles.taskName, color: theme.FOREGROUND }}
                                        >
                                            {item.name}
                                        </Text>
                                        <Text style={{ ...styles.time, color: theme.FOREGROUND }}>
                                            {`${item.startTime.hour}:${item.startTime.minute < 10 ? '0' + item.startTime.minute : item.startTime.minute}`}{' '}
                                            -{' '}
                                            {`${item.endTime.hour}:${item.endTime.minute < 10 ? '0' + item.endTime.minute : item.endTime.minute}`}
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    style={{ ...styles.divider, backgroundColor: theme.FOREGROUND }}
                                />
                            </View>
                        );
                    }}
                />
                <View
                    style={{
                        ...styles.horizontalGrid,
                        backgroundColor: theme.COMP_COLOR,
                        marginTop: 8,
                    }}
                >
                    <Text
                        style={{ fontSize: 12, fontFamily: 'AlbertSans', color: theme.FOREGROUND }}
                    >
                        Expand to view all of today's tasks
                    </Text>
                    <TouchableOpacity onPress={onClick}>
                        <Expand width={18} height={18} color={theme.FOREGROUND} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const CompletedTasksView = () => {
        const imageMap = {
            light: require('../../assets/images/light/Celebration.png'),
            dark: require('../../assets/images/dark/Celebration.png'),
        };

        return (
            <View
                style={{
                    ...styles.card,
                    backgroundColor: theme.COMP_COLOR,
                    justifyContent: 'center',
                }}
            >
                <Image
                    source={imageMap[appState.userPreferences.theme]}
                    style={{ width: 192, height: 192, alignSelf: 'center' }}
                />
                <Text
                    style={{
                        fontSize: 16,
                        fontFamily: 'AlbertSans',
                        alignSelf: 'center',
                        color: theme.FOREGROUND,
                    }}
                >
                    You have completed all your tasks for today!
                </Text>
            </View>
        );
    };

    return todaysTasks.length == 0
        ? NoTasksView()
        : allCompleted
          ? CompletedTasksView()
          : upcomingTasks.length == 0
            ? NoUpcomingTasksView()
            : TasksView();
};

const styles = StyleSheet.create({
    card: {
        width: WIDTH,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        padding: 16,
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    taskCard: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    taskName: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
        fontFamily: 'AlbertSans',
        opacity: 0.5,
    },
    horizontalGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    divider: {
        height: 1,
        opacity: 0.15,
        marginVertical: 8,
    },
});

export default UpcomingTasks;
