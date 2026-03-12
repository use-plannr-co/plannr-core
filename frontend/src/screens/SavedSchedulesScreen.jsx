import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';

import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { padding, spacing } from '../design/spacing.js';
import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';

const SavedSchedulesScreen = ({ navigation }) => {
    const { appState } = useAppState();
    const { logAction, logScreenView } = useActionLogger('SavedSchedules');
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const activeScheduleName = appState.activeSchedule?.name;

    React.useEffect(() => {
        logScreenView({
            totalSavedSchedules: appState.savedSchedules.length,
            hasActiveSchedule: !!appState.activeSchedule,
        });
    }, []);

    const handleSchedulePress = (scheduleName) => {
        logAction('view_saved_schedule', {
            scheduleName: scheduleName,
            totalSavedSchedules: appState.savedSchedules.length,
        });
        navigation.navigate('View', { schedName: scheduleName });
    };

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <View>
                <View style={styles.titleContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                    </TouchableOpacity>
                    <Text style={{ ...styles.title, color: theme.FOREGROUND }}>
                        Saved Schedules
                    </Text>
                </View>
                {appState.savedSchedules.length === 0 ? (
                    <View style={{ alignItems: 'center' }}>
                        <Image
                            source={require('../../assets/planova/planova-sad.png')}
                            style={{ width: 300, height: 247.5, marginVertical: 32 }}
                        />
                        <Text
                            style={{
                                fontSize: typography.headingSize,
                                fontFamily: 'AlbertSans',
                                marginVertical: 16,
                                color: theme.FOREGROUND,
                            }}
                        >
                            You have no saved schedules.
                        </Text>
                    </View>
                ) : null}
                <FlatList
                    style={styles.subContainer}
                    showsVerticalScrollIndicator={false}
                    data={appState.savedSchedules}
                    keyExtractor={(item) => item.name}
                    renderItem={({ item }) => {
                        const imageMap = {
                            light: require('../../assets/images/light/BG-Gradient.png'),
                            dark: require('../../assets/images/dark/BG-Gradient.png'),
                        };
                        return (
                            <TouchableOpacity
                                onPress={() => {
                                    handleSchedulePress(item.name);
                                }}
                            >
                                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                                    {/* Background Image */}
                                    <Image
                                        source={imageMap[appState.userPreferences.theme]}
                                        style={styles.bgImage}
                                    />
                                    <View
                                        style={{
                                            ...styles.bottomCover,
                                            backgroundColor: theme.COMP_COLOR,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                width: '100%',
                                                alignSelf: 'center',
                                            }}
                                        >
                                            <View>
                                                <Text
                                                    style={{
                                                        ...styles.heading,
                                                        color: theme.FOREGROUND,
                                                    }}
                                                >
                                                    {item.name}
                                                </Text>
                                                <Text
                                                    style={{
                                                        ...styles.subHeading,
                                                        color: theme.FOREGROUND,
                                                        opacity: 0.5,
                                                    }}
                                                >
                                                    {item?.schedule?.getFirstDate
                                                        ? `${item.schedule.getFirstDate().getDateString()} onwards`
                                                        : 'Schedule details loading...'}
                                                </Text>
                                            </View>
                                            {item.name !== activeScheduleName ? null : (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        backgroundColor: theme.GREEN + '30',
                                                        paddingVertical: 4,
                                                        paddingHorizontal: 8,
                                                        borderRadius: 64,
                                                        borderColor: theme.GREEN,
                                                        borderWidth: 1,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            height: 8,
                                                            width: 8,
                                                            borderRadius: 12,
                                                            backgroundColor: theme.GREEN,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            fontSize: typography.subHeadingSize - 4,
                                                            fontFamily: 'AlbertSans',
                                                            color: theme.FOREGROUND,
                                                            marginBottom: 0,
                                                        }}
                                                    >
                                                        Active
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: '100%',
        paddingVertical: padding.SCREEN_PADDING,
    },
    subContainer: {
        height: '90%',
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
        marginLeft: padding.SCREEN_PADDING,
        marginRight: padding.SCREEN_PADDING,
        marginBottom: 16,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    card: {
        width: '99%',
        height: 202,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginVertical: 12,
        margin: 20,
        alignSelf: 'center',
    },
    bgImage: {
        width: '100%',
        height: 202,
        borderRadius: 12,
    },
    bottomCover: {
        width: '100%',
        height: 90,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: 16,
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heading: {
        fontSize: typography.headingSize,
        fontFamily: 'PinkSunset',
        marginBottom: 8,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 12,
    },
});

export default SavedSchedulesScreen;
