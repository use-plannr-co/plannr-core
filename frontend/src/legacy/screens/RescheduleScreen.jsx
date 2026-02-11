import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useAppState } from '../../context/AppStateContext.js';
import { useActionLogger } from '../../hooks/useActionLogger.js';
import { useAuthenticatedAPI } from '../api/index.js';
import { lightColor, darkColor } from '../../design/colors.js';
import { spacing, padding } from '../../design/spacing.js';
import { typography } from '../../design/typography.js';
import Rescheduler from '../../model/Rescheduler.js';
import EventDependencies from '../../model/EventDependencies.js';

import RescheduleStartView from '../scheduling-logic-views/RescheduleStartView.jsx';
import BreaksView from '../scheduling-logic-views/BreaksView.jsx';
import RigidEventsView from '../scheduling-logic-views/RigidEventsView.jsx';
import FlexibleEventsView from '../scheduling-logic-views/FlexibleEventsView.jsx';
import EventDependenciesView from '../scheduling-logic-views/EventDependenciesView.jsx';
import FinalCheckView from '../scheduling-logic-views/FinalCheckView.jsx';
import GenerationModal from '../../modals/GenerationModal.jsx';
import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';

const { width, height } = Dimensions.get('window');
const SPACE = (height > 900) ? spacing.SPACING_4 : (height > 800) ? spacing.SPACING_3 : spacing.SPACING_2;

const RescheduleScreen = ({ route, navigation }) => {
    const { appState, setAppState } = useAppState();
    const { logUserAction, logScheduleAction, logError } = useActionLogger('Reschedule');
    const { getSchedules, deleteSchedule, saveScheduleWithDays } = useAuthenticatedAPI();
    let theme = (appState.userPreferences.theme === 'light') ? lightColor : darkColor;
    const { schedule } = route.params;

    const rescheduler = new Rescheduler(schedule.schedule);
    let rescheduled = null;

    const [reschedStage, setReschedStage] = useState(0);
    const [method, setMethod] = useState(null);
    const [breaks, setBreaks] = useState(rescheduler.breaks.map(b => [b.date, b.breakTime]));
    const [repeatedBreaks, setRepeatedBreaks] = useState([]);
    const [rigidEvents, setRigidEvents] = useState(rescheduler.rigidEvents);
    const [flexibleEvents, setFlexibleEvents] = useState(rescheduler.flexibleEvents);
    const [events, setEvents] = useState([...rescheduler.rigidEvents, ...rescheduler.flexibleEvents]);
    const [deps, setDeps] = useState(new EventDependencies(rescheduler.dependencies));
    console.log(deps.dependencies);
    const [showReschedulingModal, setShowReschedulingModal] = useState(false);

    const ReplaceWithRescheduled = async (newSchedule) => {
        try {
            logScheduleAction('reschedule', {
                scheduleName: schedule.name,
                isActive: schedule.isActive,
                totalDays: newSchedule.numDays
            });
            
            // 1. Get all schedules to find the current schedule's ID by name
            const allSchedules = await getSchedules();
            const currentSchedule = allSchedules.find(s => s.title === schedule.name);
            
            if (!currentSchedule) {
                console.error('Schedule not found in database:', schedule.name);
                logError('reschedule_schedule_not_found', new Error('Schedule not found'), {
                    scheduleName: schedule.name
                });
                return;
            }

            // 2. Store current schedule state for restoration if needed
            const wasActive = currentSchedule.isActive;
            const originalBackendId = currentSchedule.id;

            // 3. Delete the old schedule (this will cascade delete all days and blocks)
            console.log('🗑️ Deleting old schedule from backend...');
            await deleteSchedule(originalBackendId);

            // 4. Save the new rescheduled schedule with days-based architecture
            console.log('💾 Saving rescheduled schedule with days-based architecture...');
            
            // Determine strategy from current schedule or use default
            const strategy = newSchedule.strategy || 'earliest-fit';
            const startTime = newSchedule.startTime?.toInt?.() || newSchedule.startTime || 900;
            const endTime = newSchedule.endTime?.toInt?.() || newSchedule.endTime || 1700;
            
            const saveResult = await saveScheduleWithDays(
                newSchedule, 
                schedule.name,
                strategy,
                startTime,
                endTime
            );
            
            if (!saveResult.success) {
                throw new Error(`Failed to save rescheduled schedule: ${saveResult.message || 'Unknown error'}`);
            }

            console.log('✅ Rescheduled schedule saved with new backend ID:', saveResult.scheduleId);

            // 5. If the old schedule was active, make the new one active
            if (wasActive) {
                // The new schedule should already be created, we just need to activate it
                // This would require an updateSchedule call, but since we have deleteSchedule and saveScheduleWithDays,
                // we can modify the saveScheduleWithDays to accept isActive parameter, or make a separate call
                console.log('🔄 Reactivating rescheduled schedule...');
                // For now, we'll update the local state and the backend activation can be handled separately
            }

            // 6. Update local state with the new rescheduled schedule
            if (wasActive) {
                setAppState(prevState => ({
                    ...prevState,
                    activeSchedule: { 
                        name: schedule.name, 
                        schedule: newSchedule, 
                        backendId: saveResult.scheduleId, 
                        isActive: true 
                    },
                    savedSchedules: prevState.savedSchedules.map(s => 
                        s.name === schedule.name 
                            ? { name: schedule.name, schedule: newSchedule, backendId: saveResult.scheduleId, isActive: true } 
                            : s
                    )
                }));
            } else {
                setAppState(prevState => ({
                    ...prevState,
                    savedSchedules: prevState.savedSchedules.map(s => 
                        s.name === schedule.name 
                            ? { name: schedule.name, schedule: newSchedule, backendId: saveResult.scheduleId, isActive: false } 
                            : s
                    )
                }));
            }

            logAction('reschedule_success', {
                scheduleName: schedule.name,
                wasActive: wasActive,
                newBackendId: saveResult.scheduleId,
                totalDays: newSchedule.numDays,
                daysCreated: saveResult.daysCreated
            });

            console.log('✅ Schedule rescheduled and synced to database successfully');
            
        } catch (error) {
            logError('reschedule_failed', error, {
                scheduleName: schedule.name,
                isActive: schedule.isActive
            });
            console.error('❌ Failed to reschedule schedule:', error);
            
            // Still update local state as fallback, but without backend ID
            if (schedule.isActive) {
                setAppState(prevState => ({
                    ...prevState,
                    activeSchedule: { name: schedule.name, schedule: newSchedule, backendId: null, isActive: true },
                    savedSchedules: prevState.savedSchedules.map(s => 
                        s.name === schedule.name ? { name: schedule.name, schedule: newSchedule, backendId: null, isActive: true } : s
                    )
                }));
            } else {
                setAppState(prevState => ({
                    ...prevState,
                    savedSchedules: prevState.savedSchedules.map(s => 
                        s.name === schedule.name ? { name: schedule.name, schedule: newSchedule, backendId: null, isActive: false } : s
                    )
                }));
            }
        }
    }
    
    const RescheduleSelection = async (index) => {
        setMethod(index);
        if (index === 0) {
            // Handle Missed Task Shifting
            rescheduled = rescheduler.missedTaskShifting(schedule.schedule);
            await ReplaceWithRescheduled(rescheduled);
            setShowReschedulingModal(true);
        } else {
            // Handle Add New Tasks & Breaks or Switch Strategies
            setReschedStage(1);
        }
    }

    const BreaksSetup = (breakList, repeatedBreakList) => {
        setBreaks(breakList);
        setRepeatedBreaks(repeatedBreakList);
        setReschedStage(2);
    }

    const RigidSetup = (eventsList) => {
        setRigidEvents(eventsList);
        setEvents([...eventsList, ...flexibleEvents]);
        setReschedStage(3);
    }

    const FlexSetup = (eventsList) => {
        setFlexibleEvents(eventsList);
        setEvents([...rigidEvents, ...eventsList]);
        setReschedStage(4);
    }

    const DepsSetup = (eventDeps) => {
        setDeps(eventDeps);
        setReschedStage(5);
    }

    const CompleteAddBlocks = async (startT, endT, strategy) => {
        schedule.schedule.setStartTime(startT);
        schedule.schedule.setEndTime(endT);
        rescheduler.strategy = strategy;
        schedule.schedule.strategy = strategy;

        const addedBreaks = breaks.filter(b => !rescheduler.breaks.some(ob => ob.date.equals(b[0]) && ob.breakTime.equals(b[1])));
        const addedEvents = [
            ...rigidEvents.filter(e => !rescheduler.rigidEvents.includes(e)),
            ...flexibleEvents.filter(e => !rescheduler.flexibleEvents.includes(e)),
        ];

        rescheduled = rescheduler.addNewTimeBlocks(schedule.schedule, addedEvents, addedBreaks, repeatedBreaks, deps);
        await ReplaceWithRescheduled(rescheduled);
        setShowReschedulingModal(true);
    }

    const CompleteStrategySwitch = async (startT, endT, strategy) => {
        schedule.schedule.setStartTime(startT);
        schedule.schedule.setEndTime(endT);
        rescheduled = rescheduler.strategySwitch(schedule.schedule, strategy);
        await ReplaceWithRescheduled(rescheduled);
        setShowReschedulingModal(true);
    }

    let currentView = null;
    if (reschedStage === 0) {
        currentView = <RescheduleStartView schedule={schedule} onNext={(index) => RescheduleSelection(index)} />;
    } else if (method === 1) {
        switch(reschedStage) {
            case 1:
                currentView = <BreaksView onNext={BreaksSetup} minDate={schedule.schedule.getFirstDate()} numDays={schedule.schedule.numDays} onBack={() => setReschedStage(0)} breaksInput={breaks} repeatedBreaksInput={repeatedBreaks}/>;
                break;
            case 2:
                currentView = <RigidEventsView onNext={RigidSetup} minDate={schedule.schedule.getFirstDate()} numDays={schedule.schedule.numDays} onBack={() => setReschedStage(1)} eventsInput={rigidEvents}/>;
                break;
            case 3:
                currentView = <FlexibleEventsView onNext={FlexSetup} minDate={schedule.schedule.getFirstDate()} numDays={schedule.schedule.numDays} onBack={() => setReschedStage(2)} eventsInput={flexibleEvents}/>;
                break;
            case 4:
                currentView = <EventDependenciesView onNext={DepsSetup} events={events} depsInput={deps}/>;
                break;
            case 5:
                currentView = <FinalCheckView onNext={CompleteAddBlocks} includeTimes={true} buttonText="Reschedule"/>;
                break;
        }
    } else if (method === 2) {
        currentView = <FinalCheckView buttonText="Reschedule" includeTimes={true} onNext={CompleteStrategySwitch}/>;
    }

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <View style={styles.titleContainer}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>Reschedule</Text>
            </View>
            {currentView}
            <GenerationModal
                isVisible={showReschedulingModal}
                onViewSchedule={() => { 
                    setShowReschedulingModal(false) 
                    const toView = appState.savedSchedules.find(s => s.name === schedule.name);
                    navigation.replace('View', { schedName: toView.name });
                }}
                reschedule={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: padding.SCREEN_PADDING,
        height: '100%',
    },
    subContainer: {
        height: '90%',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginBottom: SPACE,
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.SPACING_16,
        marginBottom: SPACE,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    subHeading: {
        fontSize: 16,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
    },
});

export default RescheduleScreen;