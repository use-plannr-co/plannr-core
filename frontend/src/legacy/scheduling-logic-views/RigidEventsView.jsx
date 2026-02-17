import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAppState } from '../../context/AppStateContext.js';
import { lightColor, darkColor } from '../../design/colors.js';
import { typography } from '../../design/typography.js';

import RigidEvent from '../../model/RigidEvent.js';
import AddRigidEventsModal from '../../modals/AddRigidEventsModal.jsx';
import AddIcon from '../../../assets/system-icons/AddIcon.svg';
import CrossIcon from '../../../assets/system-icons/CrossIcon.svg';

const RigidEventsView = ({ onNext, minDate, numDays, onBack, eventsInput }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [rigidEvents, setRigidEvents] = useState(eventsInput);
    const [showModal, setShowModal] = useState(false);

    const addRigidEvent = (name, type, date, startTime, endTime) => {
        // Check for duplicate event names in eventsInput
        const existingEvent = eventsInput.find(
            (event) => event.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (existingEvent) {
            throw new Error('DUPLICATE_EVENT_NAME');
        }

        // Check for duplicates in current rigidEvents as well
        const duplicateInCurrent = rigidEvents.find(
            (event) => event.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (duplicateInCurrent) {
            throw new Error('DUPLICATE_EVENT_NAME');
        }

        const duration =
            endTime.hour * 60 + endTime.minute - (startTime.hour * 60 + startTime.minute);
        const newEvent = new RigidEvent(
            name,
            type,
            duration,
            date,
            startTime.toInt(),
            endTime.toInt(),
        );

        setRigidEvents([...rigidEvents, newEvent]);
        onNext([...rigidEvents, newEvent], false);
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
                        {eventObj.name} | {eventObj.date.getDateString()} |{' '}
                        {eventObj.startTime.to12HourString()} - {eventObj.endTime.to12HourString()}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        setRigidEvents((prev) => prev.filter((_, i) => i !== indexToRemove));
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
                    Rigid events are ones that have fixed timings - such as meetings, classes, etc.
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
                        data={rigidEvents}
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
                    onPress={() => onNext(rigidEvents)}
                >
                    <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                        Next
                    </Text>
                </TouchableOpacity>
            </View>
            <AddRigidEventsModal
                isVisible={showModal}
                onClick={addRigidEvent}
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
        backgroundColor: '#FFFFFF',
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

export default RigidEventsView;
