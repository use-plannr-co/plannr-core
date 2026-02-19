import React, { useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import MenuButton from '../components/MenuButton.jsx';
import Insights from '../components/Insights.jsx';
const { width, height } = Dimensions.get('window');

const WIDTH = width - padding.SCREEN_PADDING * 2;
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const SchedulingCenterScreen = ({ navigation }) => {
    const { appState } = useAppState();
    const { logUserAction } = useActionLogger('SchedulingCenter');
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const bottomSheetRef = useRef();

    console.log(appState.activeSchedule);

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <Text style={{ ...styles.title, color: theme.FOREGROUND }}>Plannr Center</Text>
            <ScrollView style={{ ...styles.subContainer, backgroundColor: theme.BACKGROUND }}>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Your current schedule
                </Text>
                {!appState.activeSchedule || !appState.activeSchedule.schedule ? (
                    <View
                        style={{
                            ...styles.card,
                            backgroundColor: theme.COMP_COLOR,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                ...styles.subHeading,
                                color: theme.FOREGROUND,
                                textAlign: 'center',
                            }}
                        >
                            You currently have no active schedule.
                        </Text>
                    </View>
                ) : (
                    <View>
                        <View style={styles.horizontalGrid}>
                            <Insights version={1} schedule={appState.activeSchedule.schedule} />
                            <Insights version={2} schedule={appState.activeSchedule.schedule} />
                        </View>
                        <View style={styles.horizontalGrid}>
                            <Insights version={3} schedule={appState.activeSchedule.schedule} />
                            <Insights version={4} schedule={appState.activeSchedule.schedule} />
                        </View>
                    </View>
                )}
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Manage your scheduling
                </Text>
                <View style={{ gap: SPACE }}>
                    <MenuButton
                        broad={true}
                        title="Generate a New Schedule"
                        icon="Generate"
                        navTo={() => {
                            logUserAction('generate_schedule_clicked');
                            navigation.navigate('Generate');
                        }}
                    />
                    <MenuButton
                        broad={true}
                        title="Productivity Analytics"
                        icon="Productivity"
                        navTo={() => {
                            logUserAction('productivity_analytics_clicked');
                            navigation.navigate('Analytics');
                        }}
                    />
                    {/* <MenuButton
                        broad={true}
                        title="Reschedule Tasks"
                        icon="Reschedule"
                        navTo={() => { 
                            logUserAction('reschedule_tasks_clicked');
                            bottomSheetRef.current?.show();
                        }}
                    /> */}
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
        height: '90%',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    card: {
        width: WIDTH,
        aspectRatio: 3,
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
    },
});

export default SchedulingCenterScreen;
