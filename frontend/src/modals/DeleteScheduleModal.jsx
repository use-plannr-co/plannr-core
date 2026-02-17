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

            console.log('🗑️ Deleting schedule:', toDelete);

            // Find the schedule to get its backend ID
            const scheduleToDelete = appState.savedSchedules.find(
                (sched) => sched.name === toDelete,
            );

            // Get backend ID - either from local state or by fetching from backend
            let backendIdToDelete = scheduleToDelete?.backendId;

            if (!backendIdToDelete) {
                console.log('📡 No backend ID in local state, fetching from backend...');
                // Get all schedules from backend to find the correct ID
                const allSchedules = await getSchedules();
                const backendSchedule = allSchedules.find((s) => s.title === toDelete);
                backendIdToDelete = backendSchedule?.id;
            }

            // Delete from backend if we have a backend ID
            if (backendIdToDelete) {
                console.log('🗑️ Deleting from backend with ID:', backendIdToDelete);
                await deleteSchedule(backendIdToDelete);
                console.log('✅ Schedule deleted from backend');
            } else {
                console.log('⚠️ No backend ID found, only deleting from local state');
            }

            // Delete from local state
            const updatedSchedules = appState.savedSchedules.filter(
                (sched) => sched.name !== toDelete,
            );

            // Clear active schedule if it's the one being deleted
            let newActiveSchedule = appState.activeSchedule;
            if (appState.activeSchedule && appState.activeSchedule.name === toDelete) {
                newActiveSchedule = null;
            }

            setAppState({
                ...appState,
                savedSchedules: updatedSchedules,
                activeSchedule: newActiveSchedule,
            });

            console.log('✅ Schedule deleted successfully');

            logAction('delete_schedule_success', {
                scheduleName: toDelete,
                hadBackendId: !!backendIdToDelete,
            });

            // Close modal and navigate to home
            onClose();
            navigation.navigate('MainTabs');
        } catch (error) {
            console.error('💥 Error during schedule deletion:', error);

            logError('delete_schedule_failed', error, {
                scheduleName: toDelete,
                errorType: error.name || 'unknown',
                errorMessage: error.message || 'unknown error',
            });

            // ✅ Always navigate to home on any error - this handles hooks errors gracefully
            onClose();
            navigation.navigate('MainTabs');

            // Still try to delete from local state if possible
            try {
                const updatedSchedules = appState.savedSchedules.filter(
                    (sched) => sched.name !== toDelete,
                );
                let newActiveSchedule = appState.activeSchedule;
                if (appState.activeSchedule && appState.activeSchedule.name === toDelete) {
                    newActiveSchedule = null;
                }
                setAppState({
                    ...appState,
                    savedSchedules: updatedSchedules,
                    activeSchedule: newActiveSchedule,
                });
            } catch (stateError) {
                console.error(
                    '💥 Failed to update local state, navigating to home anyway:',
                    stateError,
                );
                // Even if state update fails, we've already navigated to home
            }
        }
    };

    const handleCancel = () => {
        try {
            logAction('delete_schedule_cancelled', { scheduleName: toDelete });
            onClose();
        } catch (error) {
            console.error('💥 Error during cancel:', error);
            // Still close modal and navigate to home even if logging fails
            onClose();
            navigation.navigate('MainTabs');
        }
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
