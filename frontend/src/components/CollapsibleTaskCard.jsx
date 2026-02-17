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
import Priority from '../model/Priority.js';
import DateTimePicker from '@react-native-community/datetimepicker';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import Time24 from '../model/Time24.js';
import FlexibleEvent from '../model/FlexibleEvent';
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

const CollapsibleTaskCard = ({ task, minDate, numDays, onUpdate }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    // Collapsible state
    const [isExpanded, setIsExpanded] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    let maxDate = minDate;
    for (let i = 0; i < numDays - 1; i++) {
        maxDate = maxDate.getNextDate();
    }

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
        };

        return typeMap[label];
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
        };

        return labelMap[activityType] || 'Unknown';
    };

    const getPriorityFromLabel = (label) => {
        const priorityMap = {
            LOW: Priority.LOW,
            MEDIUM: Priority.MEDIUM,
            HIGH: Priority.HIGH,
        };

        return priorityMap[label];
    };

    const getPriorityLabel = (priority) => {
        const labelMap = {
            [Priority.LOW]: 'Low',
            [Priority.MEDIUM]: 'Medium',
            [Priority.HIGH]: 'High',
        };

        return labelMap[priority] || 'Unknown';
    };

    const [name, setName] = useState(task.name || '');
    const [type, setType] = useState(getActivityTypeFromLabel(task.type) || ActivityType.OTHER);
    const [duration, setDuration] = useState(task.duration.toString() || '60');
    const [priority, setPriority] = useState(
        getPriorityFromLabel(task.priority) || Priority.MEDIUM,
    );
    const [deadline, setDeadline] = useState(minDate);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [warning, setWarning] = useState('');
    const [showWarning, setShowWarning] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Update parent when task data changes
    const updateTask = (updatedTask) => {
        if (onUpdate) {
            const updatedFlexibleEvent = new FlexibleEvent(
                updatedTask.name,
                updatedTask.type,
                updatedTask.duration,
                updatedTask.priority,
                updatedTask.deadline,
            );
            onUpdate(updatedFlexibleEvent);
        }
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

    {
        /* Priority & Activity Type inputs */
    }
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
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Priority</Text>
                    <Pressable
                        onPress={() => {
                            setShowTypePicker(false);
                            setShowPriorityPicker(true);
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
                            value={getPriorityLabel(priority)}
                            editable={false}
                        />
                    </Pressable>
                </View>
                <View style={{ width: '50%' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Type</Text>
                    <Pressable
                        onPress={() => {
                            setShowTypePicker(true);
                            setShowPriorityPicker(false);
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
                    <Text style={{ ...styles.taskTitle, color: theme.FOREGROUND }}>
                        {name || task.name}
                    </Text>
                    <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
                        <DropDownIcon width={24} height={24} color={theme.FOREGROUND} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            {/* Expandable content */}
            {isExpanded && (
                <View style={styles.expandedContent}>
                    <Panel1 />
                    {/* Activity Type Picker */}
                    {showTypePicker && (
                        <View>
                            <Picker
                                selectedValue={type}
                                onValueChange={(itemValue) => {
                                    setType(itemValue);
                                    updateTask({
                                        ...task,
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
                    {/* Priority Picker */}
                    {showPriorityPicker && (
                        <View>
                            <Picker
                                selectedValue={priority}
                                onValueChange={(itemValue) => {
                                    setPriority(itemValue);
                                    updateTask({
                                        ...task,
                                        priority: itemValue,
                                    });
                                }}
                                themeVariant={appState.userPreferences.theme}
                            >
                                <Picker.Item label="High" value={Priority.HIGH} />
                                <Picker.Item label="Medium" value={Priority.MEDIUM} />
                                <Picker.Item label="Low" value={Priority.LOW} />
                            </Picker>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => setShowPriorityPicker(false)}
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
                                Duration (est. mins)
                            </Text>
                            <TextInput
                                style={{
                                    ...styles.input,
                                    width: '90%',
                                    backgroundColor: theme.INPUT,
                                    color: theme.FOREGROUND,
                                }}
                                value={duration}
                                autoCorrect={false}
                                autoCapitalize="words"
                                onChangeText={(text) => {
                                    setDuration(text);
                                    updateTask({
                                        ...task,
                                        duration: parseInt(text),
                                    });
                                }}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: '50%' }}>
                            <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                                Date
                            </Text>
                            <Pressable
                                onPress={() => {
                                    setShowDatePicker(true);
                                }}
                            >
                                <TextInput
                                    style={{
                                        ...styles.input,
                                        backgroundColor: theme.INPUT,
                                        color: theme.FOREGROUND,
                                    }}
                                    pointerEvents="none"
                                    value={deadline.getDateString()}
                                    editable={false}
                                />
                            </Pressable>
                        </View>
                    </View>
                    {/** Deadline Picker */}
                    {showDatePicker && (
                        <View>
                            <DateTimePicker
                                value={combineScheduleDateAndTime24(deadline, new Time24(0, 0))}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    if (date) {
                                        setDeadline(convertDateToScheduleDate(date));
                                        updateTask({
                                            ...task,
                                            deadline: convertDateToScheduleDate(date),
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
        fontFamily: 'PinkSunset-Regular',
        flex: 1,
        marginRight: 12,
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
        marginBottom: 12,
        color: '#FF0000',
        alignSelf: 'center',
    },
});

export default CollapsibleTaskCard;
