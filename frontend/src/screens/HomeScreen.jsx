import React, { useEffect } from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import LoadingScreen from './LoadingScreen.jsx';
import TimeOfDay from '../components/TimeOfDay.jsx';
import UpcomingTasks from '../components/UpcomingTasks.jsx';
import Progress from '../components/Progress.jsx';
import MenuButton from '../components/MenuButton.jsx';

import { useAppState } from '../context/AppStateContext.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import useCurrentTime from '../utils/useCurrentTime.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const HomeScreen = ({ navigation }) => {
    const { appState, storageLoaded } = useAppState();
    const currentTime = useCurrentTime();
    const { logUserAction } = useActionLogger('Home');

    const noSchedules = appState.savedSchedules.length === 0;

    if (!storageLoaded) {
        return <LoadingScreen />;
    }

    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const todaysDate = convertDateToScheduleDate(currentTime);

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <Text style={{ ...styles.title, color: theme.FOREGROUND }}>Hello {appState.name}</Text>
            <ScrollView style={{ ...styles.subContainer, backgroundColor: theme.BACKGROUND }}>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Here's your day for {todaysDate.getDateString()}
                </Text>
                <TimeOfDay />
                <UpcomingTasks
                    onClick={() => {
                        logUserAction('upcoming_tasks_clicked');
                        navigation.navigate('Tasks');
                    }}
                />
                <Progress />
                <View style={{ ...styles.horizontalGrid, backgroundColor: theme.BACKGROUND }}>
                    <MenuButton
                        broad={true}
                        title="Create a New Schedule"
                        icon="Generate"
                        navTo={() => {
                            logUserAction('generate_schedule_clicked');
                            navigation.navigate('Generate');
                        }}
                        createFirstFlag={noSchedules}
                    />
                </View>
            </ScrollView>
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
        marginTop: spacing.SPACING_16,
        marginBottom: SPACE,
        marginLeft: padding.SCREEN_PADDING,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
    },
    horizontalGrid: {
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export default HomeScreen;
