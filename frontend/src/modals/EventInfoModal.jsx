import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ActivityTypeIcons from '../model/ActivityTypeIcons.js';
import Other from '../../assets/type-icons/Other.svg';
import CrossIcon from '../../assets/system-icons/CrossIcon.svg';
import { useAppState } from '../context/AppStateContext.js';
import Modal from 'react-native-modal';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing } from '../design/spacing.js';
import ActivityType from '../model/ActivityType.js';
import { typography } from '../design/typography.js';

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const ActivityTypeColors = {
    [ActivityType.PERSONAL]: '#2E86DE', // Blue
    [ActivityType.MEETING]: '#48C9B0', // Teal
    [ActivityType.WORK]: '#27AE60', // Green
    [ActivityType.EVENT]: '#E67E22', // Orange
    [ActivityType.EDUCATION]: '#F39C12', // Amber
    [ActivityType.TRAVEL]: '#8E44AD', // Purple
    [ActivityType.RECREATIONAL]: '#D35400', // Dark Orange
    [ActivityType.ERRAND]: '#C0392B', // Crimson
    [ActivityType.OTHER]: '#7F8C8D', // Slate Gray
    [ActivityType.BREAK]: '#95A5A6', // Light Gray
};

const EventInfoModal = ({ isVisible, tb, onClose }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    if (!tb) return;

    const ICON = ActivityTypeIcons[tb.activityType] || Other;

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <View style={{ ...styles.card, backgroundColor: theme.BACKGROUND }}>
                <View
                    style={{
                        flexDirection: 'row',
                        gap: 8,
                        width: '70%',
                        alignItems: 'center',
                        marginBottom: SPACE,
                    }}
                >
                    <ICON width={40} height={40} color={theme.FOREGROUND} />
                    <Text style={{ ...styles.heading, color: theme.FOREGROUND }}>{tb.name}</Text>
                </View>
                <View style={{ marginLeft: 8 }}>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND }}>
                        {tb.getDate().getDateString()}
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND }}>
                        {tb.getStartTime().to12HourString()} - {tb.getEndTime().to12HourString()}
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND }}>
                        Duration: {tb.duration} minutes
                    </Text>
                </View>
                <CrossIcon
                    width={40}
                    height={40}
                    color={theme.FOREGROUND}
                    onPress={() => onClose()}
                    style={{ position: 'absolute', top: 16, right: 16, opacity: 0.6 }}
                />
                <View
                    style={{
                        backgroundColor: ActivityTypeColors[tb.activityType],
                        width: 12,
                        borderTopLeftRadius: 12,
                        borderBottomLeftRadius: 12,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                    }}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginVertical: 16,
        padding: 24,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    heading: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
    },
    text: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginTop: 16,
    },
});

export default EventInfoModal;
