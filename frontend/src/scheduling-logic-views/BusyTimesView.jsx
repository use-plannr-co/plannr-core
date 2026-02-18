import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
} from 'react-native';
import { useAppState } from '../context/AppStateContext';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { LinearGradient } from 'expo-linear-gradient';
import AIIcon from '../../assets/system-icons/AIIcon.svg';
import CollapsibleTimeBlockCard from '../components/CollapsibleTimeBlockCard';
import AddBusyTimeModal from '../modals/AddBusyTimeModal';
import RigidEvent from '../model/RigidEvent';
import ActivityType from '../model/ActivityType';
import Time24 from '../model/Time24';

const BusyTimesView = ({ timeBlocks, onNext, minDate, numDays }) => {
    const { appState } = useAppState();
    const [timeBlockList, setTimeBlockList] = useState(timeBlocks || []);
    const [showModal, setShowModal] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [warningIndices, setWarningIndices] = useState([]); // Array of indices that should show warnings

    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const addBusyTime = (name) => {
        // Create a default RigidEvent with the provided name
        const newTimeBlock = new RigidEvent(
            name,
            ActivityType.PERSONAL,
            60, // 1 hour duration
            minDate,
            900, // 9:00 AM
            1000, // 10:00 AM
        );

        setTimeBlockList([...timeBlockList, newTimeBlock]);
        setShowModal(false);
        // Clear warnings when adding new time block
        setWarningIndices([]);
        setShowWarning(false);
    };

    // Validate all time blocks before proceeding
    const handleNext = () => {
        const invalidIndices = [];

        // Check each time block for validation errors
        timeBlockList.forEach((timeBlock, index) => {
            const startTime = timeBlock.startTime;
            const endTime = timeBlock.endTime;

            if (startTime && endTime) {
                const startTotalMinutes = startTime.hour * 60 + startTime.minute;
                const endTotalMinutes = endTime.hour * 60 + endTime.minute;

                if (startTotalMinutes >= endTotalMinutes) {
                    invalidIndices.push(index);
                }
            }
            console.log(
                `Time Block ${index}: Start - ${startTime.toString()}, End - ${endTime.toString()}`,
            );
        });

        if (invalidIndices.length > 0) {
            setWarningIndices(invalidIndices);
            setShowWarning(true);
            return;
        }

        // All time blocks are valid
        setWarningIndices([]);
        setShowWarning(false);
        onNext(timeBlockList);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={styles.subContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View>
                    {/* Subheading */}
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                        Add times you're not available: classes, work, meals, gym, family time.
                    </Text>

                    {/* Add Busy Time Button */}
                    <TouchableOpacity
                        style={{ ...styles.button, backgroundColor: '#000', marginBottom: 16 }}
                        onPress={() => setShowModal(true)}
                    >
                        <Text
                            style={{
                                color: '#FFF',
                                fontFamily: 'AlbertSans',
                                alignSelf: 'center',
                                fontSize: 16,
                            }}
                        >
                            Add Busy Time
                        </Text>
                    </TouchableOpacity>
                </View>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1, marginBottom: 16 }}
                >
                    {timeBlockList.map((item, index) => (
                        <CollapsibleTimeBlockCard
                            timeBlock={item}
                            key={index}
                            index={index}
                            minDate={minDate}
                            numDays={numDays}
                            showWarningForIndex={warningIndices}
                            onUpdate={(updatedTimeBlock) => {
                                const newTimeBlockList = [...timeBlockList];
                                newTimeBlockList[index] = updatedTimeBlock;
                                setTimeBlockList(newTimeBlockList);
                                // Clear warnings when user makes changes
                                if (warningIndices.includes(index)) {
                                    setWarningIndices(warningIndices.filter((i) => i !== index));
                                    if (warningIndices.length === 1) {
                                        setShowWarning(false);
                                    }
                                }
                            }}
                        />
                    ))}
                </ScrollView>
                {/* Warning message for invalid time blocks */}
                {showWarning && (
                    <Text style={{ ...styles.warning, color: '#FF0000' }}>
                        Please fix all time blocks. Start time must be before end time.
                    </Text>
                )}

                <TouchableOpacity onPress={handleNext}>
                    <LinearGradient
                        colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                        style={styles.nextButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <AIIcon height={20} width={20} />
                        <Text
                            style={{
                                color: '#FFF',
                                fontFamily: 'AlbertSans',
                                alignSelf: 'center',
                                fontSize: 16,
                            }}
                        >
                            Next
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <AddBusyTimeModal
                    isVisible={showModal}
                    onAdd={addBusyTime}
                    onClose={() => setShowModal(false)}
                />
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    subContainer: {
        flex: 1,
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginVertical: 8,
        marginBottom: 16,
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
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    nextButton: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginTop: 8,
        color: '#FF0000',
        alignSelf: 'center',
    },
});

export default BusyTimesView;
