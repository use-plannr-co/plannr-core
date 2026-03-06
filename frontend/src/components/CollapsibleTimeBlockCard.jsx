import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Pressable,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Animated,
} from 'react-native';
import { useAppState } from '../context/AppStateContext';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { Picker } from '@react-native-picker/picker';
import ActivityType from '../model/ActivityType.js';
import DateTimePicker from '@react-native-community/datetimepicker';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import convertTimeToTime24 from '../utils/timeConversion';
import Time24 from '../model/Time24.js';
import RigidEvent from '../model/RigidEvent';
import ScheduleDate from '../model/ScheduleDate.js';
import combineScheduleDateAndTime24 from '../utils/combineScheduleDateAndTime24.js';
import DropDownIcon from '../../assets/system-icons/DropDownIcon.svg';

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

const CollapsibleTimeBlockCard = ({
    timeBlock,
    minDate,
    numDays,
    onUpdate,
    index,
    showWarningForIndex,
}) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    // Collapsible state
    const [isExpanded, setIsExpanded] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    let maxDate = minDate;
    for (let i = 0; i < numDays - 1; i++) {
        maxDate = maxDate.getNextDate();
    }

    // Initialize states from timeBlock data - handling both RigidEvent and TimeBlock objects
    const [name, setName] = useState(timeBlock.name || timeBlock.getName?.() || '');
    const [type, setType] = useState(
        timeBlock.activityType ||
            timeBlock.getActivityType?.() ||
            timeBlock.type ||
            timeBlock.getType?.() ||
            ActivityType.PERSONAL,
    );
    const [date, setDate] = useState(timeBlock.date || timeBlock.getDate?.() || minDate);
    const [startTime, setStartTime] = useState(
        timeBlock.startTime || timeBlock.getStartTime?.() || new Time24(900),
    ); // 9:00 AM
    const [endTime, setEndTime] = useState(
        timeBlock.endTime || timeBlock.getEndTime?.() || new Time24(1000),
    ); // 10:00 AM

    // Picker visibility states
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // Check if this card should show a warning
    const shouldShowWarning = showWarningForIndex && showWarningForIndex.includes(index);

    // Update parent when state changes
    const updateTimeBlock = (updatedTimeBlock) => {
        if (onUpdate) {
            const updatedRigidEvent = new RigidEvent(
                updatedTimeBlock.name,
                updatedTimeBlock.type,
                (updatedTimeBlock.endTime.hour - updatedTimeBlock.startTime.hour) * 60 +
                    (updatedTimeBlock.endTime.minute - updatedTimeBlock.startTime.minute),
                updatedTimeBlock.date,
                updatedTimeBlock.startTime.toInt(),
                updatedTimeBlock.endTime.toInt(),
            );
            onUpdate(updatedRigidEvent);
        }
    };

    const getActivityTypeFromLabel = (label) => {
        const typeMap = {
            PERSONAL: ActivityType.PERSONAL,
            MEETING: ActivityType.MEETING,
            WORK: ActivityType.WORK,
            EVENT: ActivityType.EVENT,
            EDUCATION: ActivityType.EDUCATION,
            TRAVEL: ActivityType.TRAVEL,
            RECREATIONAL: ActivityType.RECREATIONAL,
            ERRAND: ActivityType.ERRAND,
            OTHER: ActivityType.OTHER,
            BREAK: ActivityType.BREAK,
        };
        return typeMap[label] || ActivityType.OTHER;
    };

    const getActivityLabel = (activityType) => {
        const labelMap = {
            [ActivityType.PERSONAL]: 'Personal',
            [ActivityType.MEETING]: 'Meeting',
            [ActivityType.WORK]: 'Work',
            [ActivityType.EVENT]: 'Event',
            [ActivityType.EDUCATION]: 'Education',
            [ActivityType.TRAVEL]: 'Travel',
            [ActivityType.RECREATIONAL]: 'Recreational',
            [ActivityType.ERRAND]: 'Errand',
            [ActivityType.OTHER]: 'Other',
            [ActivityType.BREAK]: 'Break',
        };
        return labelMap[activityType] || 'Unknown';
    };

    // Toggle expand/collapse with animation
    const toggleExpanded = () => {
        const toValue = isExpanded ? 0 : 1;

        Animated.timing(rotateAnim, {
            toValue,
            duration: 200,
            useNativeDriver: true,
        }).start();

        setIsExpanded(!isExpanded);
    };

    const rotateIcon = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // Date & Activity Type inputs
    const Panel1 = () => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <View style={{ width: '50%' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Date</Text>
                    <Pressable
                        onPress={() => {
                            setShowTypePicker(false);
                            setShowDatePicker(true);
                        }}
                    >
                        <TextInput
                            style={{
                                ...styles.input,
                                width: '90%',
                                backgroundColor: theme.INPUT,
                                color: theme.FOREGROUND,
                            }}
                            pointerEvents="none"
                            value={date.getDateString()}
                            editable={false}
                        />
                    </Pressable>
                </View>
                <View style={{ width: '50%' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                        Activity Type
                    </Text>
                    <Pressable
                        onPress={() => {
                            setShowTypePicker(true);
                            setShowDatePicker(false);
                        }}
                    >
                        <TextInput
                            style={{
                                ...styles.input,
                                width: '90%',
                                backgroundColor: theme.INPUT,
                                color: theme.FOREGROUND,
                            }}
                            pointerEvents="none"
                            value={getActivityLabel(type)}
                            editable={false}
                        />
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
            {/* Colored left edge */}
            <View
                style={{
                    ...styles.coloredEdge,
                    backgroundColor:
                        ActivityTypeColors[type] || ActivityTypeColors[ActivityType.OTHER],
                }}
            />

            {/* Card Header - Always visible */}
            <TouchableOpacity onPress={toggleExpanded} style={styles.cardHeader}>
                <View style={styles.headerContent}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <TextInput
                            style={{ ...styles.taskTitle, color: theme.FOREGROUND }}
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                updateTimeBlock({
                                    ...timeBlock,
                                    name: text,
                                });
                            }}
                            placeholder="Enter time block name"
                            placeholderTextColor={theme.PLACEHOLDER}
                            multiline
                        />
                        <Text style={{ ...styles.timeInfo, color: theme.FOREGROUND }}>
                            {date.getDateString()} • {startTime.to12HourString()} -{' '}
                            {endTime.to12HourString()}
                        </Text>
                    </View>
                    <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
                        <DropDownIcon width={24} height={24} color={theme.FOREGROUND} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            {/* Expandable content */}
            {isExpanded && (
                <View style={styles.expandedContent}>
                    <Panel1 />
                    {/* Date Picker - appears after Panel1 */}
                    {showDatePicker && (
                        <View>
                            <DateTimePicker
                                value={combineScheduleDateAndTime24(date, new Time24(0, 0))}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    if (date) {
                                        const newDate = convertDateToScheduleDate(date);
                                        setDate(newDate);
                                        updateTimeBlock({
                                            ...timeBlock,
                                            date: newDate,
                                        });
                                    }
                                }}
                                minimumDate={combineScheduleDateAndTime24(
                                    minDate,
                                    new Time24(0, 0),
                                )}
                                maximumDate={combineScheduleDateAndTime24(
                                    maxDate,
                                    new Time24(23, 59),
                                )}
                                themeVariant={appState.userPreferences.theme}
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text
                                    style={{
                                        color: '#FFF',
                                        fontFamily: 'AlbertSans',
                                        alignSelf: 'center',
                                    }}
                                >
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {/* Activity Type Picker - appears after Panel1 */}
                    {showTypePicker && (
                        <View>
                            <Picker
                                selectedValue={type}
                                onValueChange={(itemValue) => {
                                    setType(itemValue);
                                    updateTimeBlock({
                                        ...timeBlock,
                                        type: itemValue,
                                    });
                                }}
                                themeVariant={appState.userPreferences.theme}
                            >
                                <Picker.Item label="Personal" value={ActivityType.PERSONAL} />
                                <Picker.Item label="Meeting" value={ActivityType.MEETING} />
                                <Picker.Item label="Work" value={ActivityType.WORK} />
                                <Picker.Item label="Event" value={ActivityType.EVENT} />
                                <Picker.Item label="Education" value={ActivityType.EDUCATION} />
                                <Picker.Item label="Travel" value={ActivityType.TRAVEL} />
                                <Picker.Item
                                    label="Recreational"
                                    value={ActivityType.RECREATIONAL}
                                />
                                <Picker.Item label="Errand" value={ActivityType.ERRAND} />
                                <Picker.Item label="Other" value={ActivityType.OTHER} />
                                <Picker.Item label="Break" value={ActivityType.BREAK} />
                            </Picker>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => setShowTypePicker(false)}
                            >
                                <Text
                                    style={{
                                        color: '#FFF',
                                        fontFamily: 'AlbertSans',
                                        alignSelf: 'center',
                                    }}
                                >
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ width: '50%' }}>
                            <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                                Start Time
                            </Text>
                            <Pressable
                                onPress={() => {
                                    setShowStartTimePicker(true);
                                    setShowEndTimePicker(false);
                                    setShowTypePicker(false);
                                    setShowDatePicker(false);
                                }}
                            >
                                <TextInput
                                    style={{
                                        ...styles.input,
                                        width: '90%',
                                        backgroundColor: theme.INPUT,
                                        color: theme.FOREGROUND,
                                    }}
                                    pointerEvents="none"
                                    value={startTime.to12HourString()}
                                    editable={false}
                                />
                            </Pressable>
                        </View>
                        <View style={{ width: '50%' }}>
                            <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                                End Time
                            </Text>
                            <Pressable
                                onPress={() => {
                                    setShowEndTimePicker(true);
                                    setShowStartTimePicker(false);
                                    setShowTypePicker(false);
                                    setShowDatePicker(false);
                                }}
                            >
                                <TextInput
                                    style={{
                                        ...styles.input,
                                        width: '90%',
                                        backgroundColor: theme.INPUT,
                                        color: theme.FOREGROUND,
                                    }}
                                    pointerEvents="none"
                                    value={endTime.to12HourString()}
                                    editable={false}
                                />
                            </Pressable>
                        </View>
                    </View>
                    <View>
                        {/* Start Time Picker */}
                        {showStartTimePicker && (
                            <View>
                                <DateTimePicker
                                    value={combineScheduleDateAndTime24(date, startTime)}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={combineScheduleDateAndTime24(date, new Time24(0))}
                                    maximumDate={combineScheduleDateAndTime24(
                                        date,
                                        new Time24(2359),
                                    )}
                                    onChange={(event, selectedTime) => {
                                        if (selectedTime) {
                                            const newStartTime = convertTimeToTime24(selectedTime);
                                            setStartTime(newStartTime);
                                            updateTimeBlock({
                                                ...timeBlock,
                                                startTime: newStartTime,
                                            });
                                            console.log(
                                                'Selected Start Time:',
                                                newStartTime.to12HourString(),
                                            );
                                        }
                                    }}
                                    themeVariant={appState.userPreferences.theme}
                                />
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => setShowStartTimePicker(false)}
                                >
                                    <Text
                                        style={{
                                            color: '#FFF',
                                            fontFamily: 'AlbertSans',
                                            alignSelf: 'center',
                                        }}
                                    >
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {/* End Time Picker */}
                        {showEndTimePicker && (
                            <View>
                                <DateTimePicker
                                    value={combineScheduleDateAndTime24(date, endTime)}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={combineScheduleDateAndTime24(date, new Time24(0))}
                                    maximumDate={combineScheduleDateAndTime24(
                                        date,
                                        new Time24(2359),
                                    )}
                                    onChange={(event, selectedTime) => {
                                        if (selectedTime) {
                                            const newEndTime = convertTimeToTime24(selectedTime);
                                            setEndTime(newEndTime);
                                            updateTimeBlock({
                                                ...timeBlock,
                                                endTime: newEndTime,
                                            });
                                            console.log(
                                                'Selected End Time:',
                                                newEndTime.to12HourString(),
                                            );
                                        }
                                    }}
                                    themeVariant={appState.userPreferences.theme}
                                />
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => setShowEndTimePicker(false)}
                                >
                                    <Text
                                        style={{
                                            color: '#FFF',
                                            fontFamily: 'AlbertSans',
                                            alignSelf: 'center',
                                        }}
                                    >
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {/* Warning message - only show if index is in warning list */}
                        {shouldShowWarning && (
                            <Text style={{ ...styles.warning, color: '#FF0000' }}>
                                Start time must be before end time
                            </Text>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '99%',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10,
        marginVertical: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        position: 'relative',
    },
    coloredEdge: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    cardHeader: {
        marginBottom: 0,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskTitle: {
        fontSize: 20,
        fontFamily: 'PinkSunset',
        marginBottom: 4,
    },
    timeInfo: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
    },
    expandedContent: {
        marginTop: 16,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F0F0F0',
        marginBottom: 16,
    },
    button: {
        width: '100%',
        borderRadius: 16,
        backgroundColor: '#000',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        alignSelf: 'center',
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginTop: 12,
        marginBottom: 8,
        color: '#FF0000',
        alignSelf: 'center',
    },
});

export default CollapsibleTimeBlockCard;
