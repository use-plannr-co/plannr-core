import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Platform,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppState } from '../../context/AppStateContext';
import { lightColor, darkColor } from '../../design/colors.js';
import { typography } from '../../design/typography.js';
import convertDateToScheduleDate from '../../utils/dateConversion.js';
import combineScheduleDateAndTime24 from '../../utils/combineScheduleDateAndTime24.js';
import Time24 from '../../model/Time24.js';

const InfoView = ({ onNext }) => {
    const { appState } = useAppState();
    const [showPicker, setShowPicker] = useState(false);
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState(convertDateToScheduleDate(new Date()));
    const [numDays, setNumDays] = useState('1');
    const [minGap, setMinGap] = useState(appState.userPreferences.defaultMinGap);
    const [maxHours, setMaxHours] = useState(appState.userPreferences.defaultMaxWorkingHours);
    const [showNameWarning, setShowNameWarning] = useState(false);
    const [showNumDaysWarning, setShowNumDaysWarning] = useState(false);
    const [showMinGapWarning, setShowMinGapWarning] = useState(false);
    const [showMaxHoursWarning, setShowMaxHoursWarning] = useState(false);
    const [nameWarningType, setNameWarningType] = useState(1); // 1 for empty name, 2 for duplicate name

    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    return (
        <KeyboardAvoidingView
            style={styles.subContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    First, enter some information about what you'd like from the schedule.
                </Text>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    What's the name of this schedule
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TextInput
                        style={{
                            ...styles.input,
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
                    {showNameWarning && (
                        <Text style={styles.warning}>
                            {nameWarningType === 1
                                ? 'Please enter a schedule name'
                                : 'Schedule name already exists'}
                        </Text>
                    )}
                </View>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    What date would you like to schedule from?
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <Pressable onPress={() => setShowPicker(true)}>
                        <TextInput
                            style={{
                                ...styles.input,
                                backgroundColor: theme.INPUT,
                                color: theme.FOREGROUND,
                            }}
                            pointerEvents="none"
                            value={startDate.getDateString()}
                            editable={false}
                        />
                    </Pressable>
                    {showPicker && (
                        <View>
                            <DateTimePicker
                                value={combineScheduleDateAndTime24(startDate, new Time24(0, 0))}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    setShowPicker(Platform.OS === 'ios'); // keep open for iOS
                                    if (date) setStartDate(convertDateToScheduleDate(date));
                                }}
                                minimumDate={new Date()}
                                themeVariant={appState.userPreferences.theme}
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => setShowPicker(false)}
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
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    How many days would you like to schedule for?
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TextInput
                        style={{
                            ...styles.input,
                            backgroundColor: theme.INPUT,
                            color: theme.FOREGROUND,
                        }}
                        value={numDays}
                        keyboardType="numeric"
                        autoCorrect={false}
                        autoCapitalize="words"
                        onChange={({ nativeEvent }) => {
                            setNumDays(nativeEvent.text);
                        }}
                    />
                    {showNumDaysWarning && (
                        <Text style={styles.warning}>Number of days must be a positive number</Text>
                    )}
                </View>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Minimum gap between scheduled events (in mins)
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TextInput
                        style={{
                            ...styles.input,
                            backgroundColor: theme.INPUT,
                            color: theme.FOREGROUND,
                        }}
                        value={minGap}
                        keyboardType="numeric"
                        autoCorrect={false}
                        autoCapitalize="words"
                        onChange={({ nativeEvent }) => {
                            setMinGap(nativeEvent.text);
                        }}
                    />
                    {showMinGapWarning && (
                        <Text style={styles.warning}>
                            Minimum gap must be a non-negative number
                        </Text>
                    )}
                </View>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Maximum working hours per day
                </Text>
                <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                    <TextInput
                        style={{
                            ...styles.input,
                            backgroundColor: theme.INPUT,
                            color: theme.FOREGROUND,
                        }}
                        value={maxHours}
                        keyboardType="numeric"
                        autoCorrect={false}
                        autoCapitalize="words"
                        onChange={({ nativeEvent }) => {
                            setMaxHours(nativeEvent.text);
                        }}
                    />
                    {showMaxHoursWarning && (
                        <Text style={styles.warning}>
                            Maximum working hours must be between 0 and 24
                        </Text>
                    )}
                </View>
            </ScrollView>
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    // Reset all warnings first
                    setShowNameWarning(false);
                    setShowNumDaysWarning(false);
                    setShowMinGapWarning(false);
                    setShowMaxHoursWarning(false);

                    let hasError = false;

                    // Validation logic
                    if (!name.trim()) {
                        setShowNameWarning(true);
                        hasError = true;
                    }

                    if (appState.savedSchedules.some((schedule) => schedule.name === name)) {
                        setNameWarningType(2);
                        setShowNameWarning(true);
                        hasError = true;
                    } else {
                        setNameWarningType(1); // Reset to empty name warning type
                    }

                    const numDaysInt = parseInt(numDays);
                    if (isNaN(numDaysInt) || numDaysInt <= 0) {
                        setShowNumDaysWarning(true);
                        hasError = true;
                    }

                    const minGapInt = parseInt(minGap);
                    if (isNaN(minGapInt) || minGapInt < 0) {
                        setShowMinGapWarning(true);
                        hasError = true;
                    }

                    const maxHoursFloat = parseFloat(maxHours);
                    if (isNaN(maxHoursFloat) || maxHoursFloat <= 0 || maxHoursFloat > 24) {
                        setShowMaxHoursWarning(true);
                        hasError = true;
                    }

                    // If all validations pass
                    if (!hasError) {
                        onNext(name, numDays, startDate, minGap, maxHours);
                    }
                }}
            >
                <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                    Next
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    subContainer: {
        height: '87.5%',
        justifyContent: 'space-between',
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginVertical: 8,
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
    input: {
        height: 40,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginVertical: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginTop: 8,
        color: '#FF0000',
        alignSelf: 'center',
    },
});

export default InfoView;
