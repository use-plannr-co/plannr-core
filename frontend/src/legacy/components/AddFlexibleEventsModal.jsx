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
import { Picker } from '@react-native-picker/picker';

import ActivityType from '../model/ActivityType.js';
import Priority from '../model/Priority.js';
import DateTimePicker from '@react-native-community/datetimepicker';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import Time24 from '../model/Time24.js';
import combineScheduleDateAndTime24 from '../utils/combineScheduleDateAndTime24.js';

import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

const AddFlexibleEventsModal = ({ isVisible, onClick, onClose, minDate, numDays }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    let maxDate = minDate;
    for (let i = 0; i < numDays - 1; i++) {
        maxDate = maxDate.getNextDate();
    }

    const [name, setName] = useState('');
    const [type, setType] = useState(ActivityType.PERSONAL);
    const [duration, setDuration] = useState('0');
    const [priority, setPriority] = useState(Priority.MEDIUM);
    const [deadline, setDeadline] = useState(minDate);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
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

    const getPriorityLabel = (priority) => {
        const labelMap = {
            [Priority.LOW]: 'Low',
            [Priority.MEDIUM]: 'Medium',
            [Priority.HIGH]: 'High',
        };

        return labelMap[priority] || 'Unknown';
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
                        onChangeText={(text) => setName(text)}
                    />
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

    {
        /* Event Duration & Priorty inputs */
    }
    const Panel2 = () => {
        return (
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
                        onChangeText={(text) => setDuration(text)}
                        keyboardType="numeric"
                    />
                </View>
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
            </View>
        );
    };

    const setToDefaults = () => {
        setName('');
        setType(ActivityType.PERSONAL);
        setDuration('0');
        setPriority(Priority.MEDIUM);
        setDeadline(maxDate);
        setShowTypePicker(false);
        setShowPriorityPicker(false);
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

                                {/* Panel 2 - Duration + Priority */}
                                {Panel2()}

                                {/* Priority Picker */}
                                {showPriorityPicker && (
                                    <View>
                                        <Picker
                                            selectedValue={priority}
                                            onValueChange={(itemValue) => setPriority(itemValue)}
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

                                {/* Panel 3 - Deadline Picker */}
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
                                            value={deadline.getDateString()}
                                            editable={false}
                                        />
                                    </Pressable>
                                    {showDatePicker && (
                                        <View>
                                            <DateTimePicker
                                                value={combineScheduleDateAndTime24(
                                                    deadline,
                                                    new Time24(0, 0),
                                                )}
                                                mode="date"
                                                display={
                                                    Platform.OS === 'ios' ? 'spinner' : 'default'
                                                }
                                                onChange={(event, date) => {
                                                    if (date)
                                                        setDeadline(
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

                                {/* Add Flexible Event Button */}
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => {
                                        if (name.length == 0) {
                                            setWarning('Name of event cannot be empty');
                                            setShowWarning(true);
                                        } else if (parseInt(duration) == 0) {
                                            setWarning('Duration of event cannot be 0');
                                            setShowWarning(true);
                                        } else {
                                            try {
                                                setShowWarning(false);
                                                onClick(
                                                    name,
                                                    type,
                                                    parseInt(duration),
                                                    priority,
                                                    deadline,
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
        paddingVertical: 24,
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

export default AddFlexibleEventsModal;
