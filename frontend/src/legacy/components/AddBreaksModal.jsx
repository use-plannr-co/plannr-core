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
import convertTimeToTime24 from '../utils/timeConversion.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import Time24 from '../model/Time24.js';
import combineScheduleDateAndTime24 from '../utils/combineScheduleDateAndTime24.js';

import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

import Checked from '../../assets/system-icons/Checked.svg';
import Unchecked from '../../assets/system-icons/Unchecked.svg';

const AddBreaksModal = ({ isVisible, onClick, onClose, minDate, numDays }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [startTime, setStartTime] = useState(convertTimeToTime24(new Date()));
    const [endTime, setEndTime] = useState(convertTimeToTime24(new Date()));
    const [dateOfBreak, setDateOfBreak] = useState(minDate);
    const [repeated, setRepeated] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
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

    const warning = 'End time must be after start time';

    const setToDefaults = () => {
        setStartTime(convertTimeToTime24(new Date()));
        setEndTime(convertTimeToTime24(new Date()));
        setDateOfBreak(minDate);
        setRepeated(false);
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
                            <View style={{ ...styles.card, backgroundColor: theme.BACKGROUND }}>
                                {/* Time Inputs */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            ...styles.subHeading,
                                            color: theme.FOREGROUND,
                                            width: 60,
                                        }}
                                    >
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
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            ...styles.subHeading,
                                            color: theme.FOREGROUND,
                                            width: 60,
                                        }}
                                    >
                                        End Time
                                    </Text>
                                    <TimePicker
                                        value={endTime}
                                        onChange={(time) => {
                                            setEndTime(time);
                                        }}
                                    />
                                </View>

                                {/* Date input */}
                                {!repeated ? (
                                    <View>
                                        <Text
                                            style={{
                                                ...styles.subHeading,
                                                color: theme.FOREGROUND,
                                            }}
                                        >
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
                                                value={dateOfBreak.getDateString()}
                                                editable={false}
                                            />
                                        </Pressable>
                                        {showDatePicker && (
                                            <View>
                                                <DateTimePicker
                                                    value={combineScheduleDateAndTime24(
                                                        dateOfBreak,
                                                        new Time24(0, 0),
                                                    )}
                                                    mode="date"
                                                    display={
                                                        Platform.OS === 'ios'
                                                            ? 'spinner'
                                                            : 'default'
                                                    }
                                                    onChange={(event, date) => {
                                                        if (date)
                                                            setDateOfBreak(
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
                                ) : null}

                                {/* Checkbox for repeated */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                        marginBottom: 12,
                                    }}
                                >
                                    <TouchableOpacity
                                        style={styles.checkbox}
                                        onPress={() => setRepeated(!repeated)}
                                    >
                                        {repeated ? (
                                            <Checked
                                                width={24}
                                                height={24}
                                                color={theme.FOREGROUND}
                                            />
                                        ) : (
                                            <Unchecked
                                                width={24}
                                                height={24}
                                                color={theme.FOREGROUND}
                                            />
                                        )}
                                    </TouchableOpacity>
                                    <Text
                                        style={{
                                            ...styles.subHeading,
                                            marginBottom: 0,
                                            color: theme.FOREGROUND,
                                            width: 300,
                                        }}
                                    >
                                        Check this box to add this break on all days
                                    </Text>
                                </View>

                                {/* Warning message */}
                                {showWarning && <Text style={styles.warning}>{warning}</Text>}

                                {/* Add Break Button */}
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => {
                                        if (
                                            endTime.isBefore(startTime) ||
                                            endTime.equals(startTime)
                                        ) {
                                            setShowWarning(true);
                                        } else {
                                            setShowWarning(false);
                                            onClick(startTime, endTime, repeated, dateOfBreak);
                                            setToDefaults();
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

export default AddBreaksModal;
