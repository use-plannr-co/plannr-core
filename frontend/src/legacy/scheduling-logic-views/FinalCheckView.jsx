import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    TextInput,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import { useAppState } from '../../context/AppStateContext';
import TimePicker from '../components/TimePicker.jsx';
import convertTimeToTime24 from '../../utils/timeConversion';
import { lightColor, darkColor } from '../../design/colors';
import { typography } from '../../design/typography.js';

import EarliestFitIcon from '../../../assets/strategy-icons/EarliestFitIcon.svg';
import BalancedWorkIcon from '../../../assets/strategy-icons/BalancedWorkIcon.svg';
import DeadlineOrientedIcon from '../../../assets/strategy-icons/DeadlineOrientedIcon.svg';
import RescheduleIcon from '../../../assets/system-icons/RescheduleIcon.svg';

const FinalCheckView = ({ onNext, buttonText = 'Generate Schedule' }) => {
    const { appState } = useAppState();
    const [startTime, setStartTime] = useState(convertTimeToTime24(new Date()));
    const [endTime, setEndTime] = useState(convertTimeToTime24(new Date()));
    const [strategy, setStrategy] = useState(appState.userPreferences.defaultStrategy);
    const [showWarning, setShowWarning] = useState(false);
    const warning = 'End time must be after start time';

    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    return (
        <KeyboardAvoidingView
            style={styles.subContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            One more thing - some final preferences
                        </Text>
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            Daily Timings
                        </Text>
                        <View
                            style={{ ...styles.card, backgroundColor: theme.COMP_COLOR, gap: 12 }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
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
                            {showWarning && <Text style={styles.warning}>{warning}</Text>}
                        </View>
                        <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                            Scheduling Strategy
                        </Text>
                        <View
                            style={{ ...styles.card, gap: 12, backgroundColor: theme.COMP_COLOR }}
                        >
                            <View
                                style={{
                                    width: '100%',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: 8,
                                }}
                            >
                                <EarliestFitIcon width={20} height={20} />
                                <TouchableOpacity
                                    style={{
                                        ...styles.choiceButton,
                                        backgroundColor:
                                            strategy == 'earliest-fit'
                                                ? theme.SELECTION
                                                : theme.INPUT,
                                    }}
                                    onPress={() => {
                                        setStrategy('earliest-fit');
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: typography.subHeadingSize,
                                            fontFamily: 'AlbertSans',
                                            color:
                                                strategy == 'earliest-fit'
                                                    ? theme.SELECTED_TEXT
                                                    : theme.FOREGROUND,
                                        }}
                                    >
                                        Earliest Fit
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    width: '100%',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: 8,
                                }}
                            >
                                <BalancedWorkIcon width={20} height={20} />
                                <TouchableOpacity
                                    style={{
                                        ...styles.choiceButton,
                                        backgroundColor:
                                            strategy == 'balanced-work'
                                                ? theme.SELECTION
                                                : theme.INPUT,
                                    }}
                                    onPress={() => {
                                        setStrategy('balanced-work');
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: typography.subHeadingSize,
                                            fontFamily: 'AlbertSans',
                                            color:
                                                strategy == 'balanced-work'
                                                    ? theme.SELECTED_TEXT
                                                    : theme.FOREGROUND,
                                        }}
                                    >
                                        Balanced Work
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    width: '100%',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: 8,
                                }}
                            >
                                <DeadlineOrientedIcon width={20} height={20} />
                                <TouchableOpacity
                                    style={{
                                        ...styles.choiceButton,
                                        backgroundColor:
                                            strategy == 'deadline-oriented'
                                                ? theme.SELECTION
                                                : theme.INPUT,
                                    }}
                                    onPress={() => {
                                        setStrategy('deadline-oriented');
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: typography.subHeadingSize,
                                            fontFamily: 'AlbertSans',
                                            color:
                                                strategy == 'deadline-oriented'
                                                    ? theme.SELECTED_TEXT
                                                    : theme.FOREGROUND,
                                        }}
                                    >
                                        Deadline Oriented
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            if (endTime.isBefore(startTime) || endTime.equals(startTime)) {
                                setShowWarning(true);
                            } else {
                                setShowWarning(false);
                                onNext(startTime.toInt(), endTime.toInt(), strategy);
                            }
                        }}
                    >
                        {buttonText === 'Generate Schedule' ? (
                            <Text
                                style={{
                                    color: '#FFF',
                                    fontFamily: 'AlbertSans',
                                    alignSelf: 'center',
                                }}
                            >
                                {buttonText}
                            </Text>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Text
                                    style={{
                                        color: '#FFF',
                                        fontFamily: 'AlbertSans',
                                        alignSelf: 'center',
                                        fontSize: typography.subHeadingSize,
                                    }}
                                >
                                    Reschedule
                                </Text>
                                <RescheduleIcon width={16} height={16} color={'#FFFFFF'} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
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
        backgroundColor: '#F0F0F0',
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
    choiceButton: {
        width: '92%',
        borderRadius: 12,
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginBottom: 4,
        color: '#FF0000',
        alignSelf: 'center',
    },
});

export default FinalCheckView;
