import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';

import { useAppState } from '../context/AppStateContext';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { useNavigation } from '@react-navigation/native';
import { useAuthenticatedAPI } from '../api/index.js';

import { typography } from '../design/typography.js';

const DeleteScheduleModal = ({ isVisible, toDelete, onClose }) => {
    const { appState, setAppState } = useAppState();
    const { logAction, logError } = useActionLogger('DeleteSchedule');
    const navigation = useNavigation();
    const { deleteSchedule, getSchedules } = useAuthenticatedAPI();

    const handleDelete = async () => {
        try {
            logAction('delete_schedule_initiated', { scheduleName: toDelete });

            // Capture what we need from state before any async work
            const scheduleToDelete = appState.savedSchedules.find(
                (sched) => sched.name === toDelete,
            );
            let backendIdToDelete = scheduleToDelete?.backendId;
            const updatedSchedules = appState.savedSchedules.filter(
                (sched) => sched.name !== toDelete,
            );
            const newActiveSchedule =
                appState.activeSchedule?.name === toDelete ? null : appState.activeSchedule;

            // Navigate away FIRST — before state update — so ScheduleViewScreen
            // unmounts before it can re-render with an undefined schedule.
            onClose();
            navigation.goBack();

            // Update local state (ScheduleViewScreen is already animating off)
            setAppState({
                ...appState,
                savedSchedules: updatedSchedules,
                activeSchedule: newActiveSchedule,
            });

            // Backend deletion — async, user already navigated away
            if (!backendIdToDelete) {
                const response = await getSchedules();
                const backendSchedule = response.data?.find((s) => s.title === toDelete);
                backendIdToDelete = backendSchedule?.id;
            }
            if (backendIdToDelete) {
                await deleteSchedule(backendIdToDelete);
            }

            logAction('delete_schedule_success', {
                scheduleName: toDelete,
                hadBackendId: !!backendIdToDelete,
            });
        } catch (error) {
            console.error('💥 Error during schedule deletion:', error);
            logError('delete_schedule_failed', error, {
                scheduleName: toDelete,
                errorType: error.name || 'unknown',
                errorMessage: error.message || 'unknown error',
            });
        }
    };

    const handleCancel = () => {
        logAction('delete_schedule_cancelled', { scheduleName: toDelete });
        onClose();
    };

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <View style={styles.card}>
                <View style={{ flexDirection: 'column', gap: 4, alignSelf: 'flex-start' }}>
                    <Text style={styles.heading}>Delete Schedule</Text>
                    <Text style={styles.text}>
                        Are you sure you want to delete the schedule "{toDelete}"?
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end' }}>
                    <TouchableOpacity
                        onPress={handleDelete}
                        style={{
                            backgroundColor: '#F00',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 24,
                        }}
                    >
                        <Text style={{ color: '#FFF', fontFamily: 'AlbertSans' }}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleCancel}
                        style={{
                            backgroundColor: '#E0E0E0',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 24,
                        }}
                    >
                        <Text style={{ color: '#000', fontFamily: 'AlbertSans' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 361,
        borderRadius: 36,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginVertical: 16,
        padding: 24,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    heading: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginBottom: 16,
    },
    text: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 24,
    },
});

export default DeleteScheduleModal;
