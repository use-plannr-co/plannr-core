import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import convertDateToScheduleDate from '../../utils/dateConversion.js';
import FlexibleEvent from '../../model/FlexibleEvent.js';
import AddFlexibleEventsModal from '../../modals/AddFlexibleEventsModal.jsx';
import AddIcon from '../../../assets/system-icons/AddIcon.svg';
import CrossIcon from '../../../assets/system-icons/CrossIcon.svg';
import { useAppState } from '../../context/AppStateContext.js';
import { lightColor, darkColor } from '../../design/colors.js';
import { typography } from '../../design/typography.js';

const FlexibleEventsView = ({ onNext, minDate, numDays, onBack, eventsInput }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [flexibleEvents, setFlexibleEvents] = useState(eventsInput);
    const [showModal, setShowModal] = useState(false);

    const addFlexibleEvent = (name, type, duration, priority, deadline) => {
        // Check for duplicate event names in eventsInput
        const existingEvent = eventsInput.find(
            (event) => event.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (existingEvent) {
            throw new Error('DUPLICATE_EVENT_NAME');
        }

        // Check for duplicates in current flexibleEvents as well
        const duplicateInCurrent = flexibleEvents.find(
            (event) => event.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (duplicateInCurrent) {
            throw new Error('DUPLICATE_EVENT_NAME');
        }

        const newEvent = new FlexibleEvent(name, type, duration, priority, deadline);

        setFlexibleEvents([...flexibleEvents, newEvent]);
        onNext([...flexibleEvents, newEvent], false);
        setShowModal(false);
    };

    const eventRender = (eventObj, indexToRemove) => {
        return (
            <View style={{ ...styles.eventCard, backgroundColor: theme.INPUT }}>
                <View style={{ flexDirection: 'row' }}>
                    <Text
                        style={{
                            ...styles.subHeading,
                            fontSize: typography.bodySize,
                            color: theme.FOREGROUND,
                            width: 250,
                        }}
                    >
                        {eventObj.name} | {eventObj.duration} mins | Before{' '}
                        {eventObj.deadline.getDateString()}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        setFlexibleEvents((prev) => prev.filter((_, i) => i !== indexToRemove));
                    }}
                >
                    <CrossIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.subContainer}>
            <View>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                    Flexible events are ones that have deadlines - such as assignments,
                    pre-requisites, etc.
                </Text>
                <TouchableOpacity style={styles.button} onPress={() => setShowModal(true)}>
                    <AddIcon width={18} height={18} />
                    <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                        Add Event
                    </Text>
                </TouchableOpacity>
                <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>Events</Text>
                <View style={{ ...styles.card, height: '60%', backgroundColor: theme.COMP_COLOR }}>
                    <FlatList
                        data={flexibleEvents}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={({ item, index }) => index}
                        renderItem={({ item, index }) => eventRender(item, index)}
                    />
                </View>
            </View>
            <View style={styles.horizontalGrid}>
                <TouchableOpacity
                    style={{ ...styles.button, marginVertical: 0, width: '48%' }}
                    onPress={() => onBack()}
                >
                    <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                        Back
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ ...styles.button, marginVertical: 0, width: '48%' }}
                    onPress={() => onNext(flexibleEvents)}
                >
                    <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                        Next
                    </Text>
                </TouchableOpacity>
            </View>
            <AddFlexibleEventsModal
                isVisible={showModal}
                onClick={addFlexibleEvent}
                onClose={() => setShowModal(false)}
                minDate={minDate}
                numDays={numDays}
            />
        </View>
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
        shadowRadius: 24,
        marginVertical: 16,
        padding: 16,
        alignSelf: 'center',
    },
    eventCard: {
        height: 40,
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    horizontalGrid: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 16,
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
        marginVertical: 16,
        gap: 12,
    },
});

export default FlexibleEventsView;
