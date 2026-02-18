import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Pressable,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
} from 'react-native';
import Modal from 'react-native-modal';

import DateTimePicker from '@react-native-community/datetimepicker';
import TimePicker from '../components/TimePicker.jsx';
import { Picker } from '@react-native-picker/picker';
import ActivityType from '../model/ActivityType.js';
import convertTimeToTime24 from '../utils/timeConversion.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import combineScheduleDateAndTime24 from '../utils/combineScheduleDateAndTime24.js';
import Time24 from '../model/Time24.js';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

const AddRigidEventsModal = ({ isVisible, onClick, onClose, minDate, numDays }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [name, setName] = useState('');
    const [type, setType] = useState(ActivityType.PERSONAL);
    const [startTime, setStartTime] = useState(convertTimeToTime24(new Date()));
    const [endTime, setEndTime] = useState(convertTimeToTime24(new Date()));
    const [dateOfEvent, setDateOfEvent] = useState(minDate);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [warning, setWarning] = useState('');
    const [showWarning, setShowWarning] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Keyboard visibility listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () =>
            setKeyboardVisible(true),
        );
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () =>
            setKeyboardVisible(false),
        );

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, []);

    let maxDate = minDate;
    for (let i = 0; i < numDays - 1; i++) {
        maxDate = maxDate.getNextDate();
    }

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

    {
        /* Name & Activity Type inputs */
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
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Name</Text>
                    <TextInput
                        style={{
                            ...styles.input,
                            width: '90%',
                            backgroundColor: theme.INPUT,
                            color: theme.FOREGROUND,
                        }}
                        value={name}
                        autoCorrect={false}
                        autoCapitalize="words"
                        onChange={({ nativeEvent }) => {
                            setName(nativeEvent.text);
                        }}
                    />
                </View>
                <View style={{ width: '50%' }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Type</Text>
                    <Pressable onPress={() => setShowTypePicker(true)}>
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

    {
        /* Start Time & End Time inputs + their respective time pickers */
    }
    const Panel2 = () => {
        return (
            <View style={{ gap: 12, marginBottom: 16 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, width: 60 }}>
                        Start Time
                    </Text>
                    <TimePicker
                        value={startTime}
                        onChange={(time) => {
                            setStartTime(time);
                        }}
                    />
                </View>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND, width: 60 }}>
                        End Time
                    </Text>
                    <TimePicker
                        value={endTime}
                        onChange={(time) => {
                            setEndTime(time);
                        }}
                    />
                </View>
            </View>
        );
    };

    const setToDefaults = () => {
        setName('');
        setType(ActivityType.PERSONAL);
        setStartTime(convertTimeToTime24(new Date()));
        setEndTime(convertTimeToTime24(new Date()));
        setDateOfEvent(minDate);
        setShowTypePicker(false);
        setWarning('');
        setShowWarning(false);
    };

    const handleOutsidePress = () => {
        if (keyboardVisible) {
            Keyboard.dismiss(); // Just dismiss keyboard, keep modal open
        } else {
            // Keyboard is already dismissed, close modal
            setToDefaults();
            onClose && onClose();
        }
    };

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <TouchableWithoutFeedback onPress={handleOutsidePress} accessible={false}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={20}
                    >
                        <TouchableWithoutFeedback
                            onPress={(e) => e.stopPropagation()}
                            accessible={false}
                        >
                            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                                {/* Panel 1 - Name + Activity Type */}
                                {Panel1()}

                                {/* Activity Type Picker */}
                                {showTypePicker && (
                                    <View>
                                        <Picker
                                            selectedValue={type}
                                            onValueChange={(itemValue) => setType(itemValue)}
                                            themeVariant={appState.userPreferences.theme}
                                        >
                                            <Picker.Item
                                                label="Personal"
                                                value={ActivityType.PERSONAL}
                                            />
                                            <Picker.Item
                                                label="Meeting"
                                                value={ActivityType.MEETING}
                                            />
                                            <Picker.Item label="Work" value={ActivityType.WORK} />
                                            <Picker.Item label="Event" value={ActivityType.EVENT} />
                                            <Picker.Item
                                                label="Education"
                                                value={ActivityType.EDUCATION}
                                            />
                                            <Picker.Item
                                                label="Travel"
                                                value={ActivityType.TRAVEL}
                                            />
                                            <Picker.Item
                                                label="Recreational"
                                                value={ActivityType.RECREATIONAL}
                                            />
                                            <Picker.Item
                                                label="Errand"
                                                value={ActivityType.ERRAND}
                                            />
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

                                {/* Panel 2 - Time Inputs */}
                                {Panel2()}

                                {/* Panel 3 - Date Picker */}
                                <View>
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
                                            value={dateOfEvent.getDateString()}
                                            editable={false}
                                        />
                                    </Pressable>
                                    {showDatePicker && (
                                        <View>
                                            <DateTimePicker
                                                value={combineScheduleDateAndTime24(
                                                    dateOfEvent,
                                                    new Time24(0, 0),
                                                )}
                                                mode="date"
                                                display={
                                                    Platform.OS === 'ios' ? 'spinner' : 'default'
                                                }
                                                onChange={(event, date) => {
                                                    if (date)
                                                        setDateOfEvent(
                                                            convertDateToScheduleDate(date),
                                                        );
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

                                {showWarning && <Text style={styles.warning}>{warning}</Text>}

                                {/* Add Rigid Event Button */}
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => {
                                        if (name.length == 0) {
                                            setWarning('Name of event cannot be empty');
                                            setShowWarning(true);
                                        } else if (
                                            endTime.isBefore(startTime) ||
                                            endTime.equals(startTime)
                                        ) {
                                            setWarning('End time must be after start time');
                                            setShowWarning(true);
                                        } else {
                                            try {
                                                setShowWarning(false);
                                                onClick(
                                                    eventName,
                                                    type,
                                                    dateOfEvent,
                                                    startTime,
                                                    endTime,
                                                );
                                                setToDefaults();
                                                // Success - modal closes automatically via onClick
                                            } catch (error) {
                                                if (error.message === 'DUPLICATE_EVENT_NAME') {
                                                    setWarning(
                                                        'An event already exists with this name. Please try another name.',
                                                    );
                                                } else {
                                                    setWarning(
                                                        'Failed to add event. Please try again.',
                                                    );
                                                }
                                                // Modal stays open so user can fix the name
                                            }
                                        }
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#FFF',
                                            fontFamily: 'AlbertSans',
                                            alignSelf: 'center',
                                        }}
                                    >
                                        Add
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    card: {
        width: '99%',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        padding: 16,
        marginTop: 4,
        marginBottom: 16,
        alignSelf: 'center',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 8,
    },
    input: {
        height: 40,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F0F0F0',
        marginBottom: 16,
    },
    checkbox: {
        width: 24,
        height: 24,
    },
    button: {
        width: '92%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
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

export default AddRigidEventsModal;
