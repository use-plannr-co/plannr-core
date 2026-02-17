import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppState } from '../../context/AppStateContext.js';
import { useActionLogger } from '../../hooks/useActionLogger.js';
import { lightColor, darkColor } from '../../design/colors.js';
import { typography } from '../../design/typography.js';
import { useAuthenticatedAPI } from '../api/index.js';

import ScheduleDate from '../../model/ScheduleDate.js';
import InfoView from '../scheduling-logic-views/InfoView.jsx';
import BreaksView from '../scheduling-logic-views/BreaksView.jsx';
import RigidEventsView from '../scheduling-logic-views/RigidEventsView.jsx';
import FlexibleEventsView from '../scheduling-logic-views/FlexibleEventsView.jsx';
import EventDependenciesView from '../scheduling-logic-views/EventDependenciesView.jsx';
import FinalCheckView from '../scheduling-logic-views/FinalCheckView.jsx';
import convertDateToScheduleDate from '../../utils/dateConversion.js';
import combineScheduleDateAndTime24 from '../../utils/combineScheduleDateAndTime24.js';
import Scheduler from '../../model/Scheduler.js';
import EventDependencies from '../../model/EventDependencies.js';
import GenerationModal from '../../modals/GenerationModal.jsx';
import SchedulingErrorModal from '../../modals/SchedulingErrorModal.jsx';
import Time24 from '../../model/Time24.js';
import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';

const GenerateScheduleScreen = ({ navigation }) => {
    const { appState, setAppState } = useAppState();
    const { logUserAction, logScheduleAction, logError } = useActionLogger('GenerateSchedule');
    const { saveScheduleWithDays, convertScheduleToBackendJSON, convertTimeBlockToBackendJSON } =
        useAuthenticatedAPI();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [genStage, setGenStage] = useState(0);
    const [scheduler, setScheduler] = useState(
        new Scheduler(new ScheduleDate(1, 1, 1970), 'Sunday', 15, 8),
    );
    const [name, setName] = useState('');
    const [breaks, setBreaks] = useState([]);
    const [repeatedBreaks, setRepeatedBreaks] = useState([]);
    const [rigidEvents, setRigidEvents] = useState([]);
    const [flexibleEvents, setFlexibleEvents] = useState([]);
    const [events, setEvents] = useState([]);
    const [deps, setDeps] = useState(new EventDependencies());
    const [firstDate, setFirstDate] = useState(convertDateToScheduleDate(new Date()));
    const [showGenerationModal, setShowGenerationModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [isSavingToBackend, setIsSavingToBackend] = useState(false);

    const titles = [
        'I. Information',
        'II. Breaks',
        'III. Rigid Events',
        'IV. Flexible Events',
        'V. Dependencies',
        'VI. Rounding Up',
    ];

    // Strategy mapping for backend API
    const strategyMap = {
        'Earliest Fit': 'earliest-fit',
        'Balanced Work': 'balanced-work',
        'Deadline Oriented': 'deadline-oriented',
    };

    // Helper function to convert ScheduleDate to YYYY-MM-DD format
    const formatScheduleDateToISO = (scheduleDate) => {
        // If it's already a string in ISO-like format (like "29-12-2024"), convert it to proper ISO format
        if (typeof scheduleDate === 'string') {
            const parts = scheduleDate.split('-');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
        }

        // Handle ScheduleDate objects
        if (
            !scheduleDate ||
            typeof scheduleDate.year === 'undefined' ||
            typeof scheduleDate.month === 'undefined' ||
            typeof scheduleDate.date === 'undefined'
        ) {
            throw new Error(`Invalid scheduleDate: ${scheduleDate}`);
        }

        const year = scheduleDate.year;
        const month = scheduleDate.month.toString().padStart(2, '0');
        const day = scheduleDate.date.toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper function to get day name from ScheduleDate
    const getScheduleDateDayName = (scheduleDate) => {
        const jsDate = new Date(scheduleDate.year, scheduleDate.month - 1, scheduleDate.date);
        return jsDate.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const SchedulerInitialization = (name, numDays, date, gap, workingLimit) => {
        const startDate = combineScheduleDateAndTime24(date, new Time24(0, 0)); // convertDateToScheduleDate(date)
        const dayString = getScheduleDateDayName(date);
        const numDaysInt = parseInt(numDays);
        const minGap = parseInt(gap);
        const maxHours = parseInt(workingLimit);

        setName(name);
        const newScheduler = new Scheduler(numDaysInt, date, dayString, minGap, maxHours);

        // CRITICAL: Always initialize with empty EventDependencies to prevent null reference errors
        newScheduler.setEventDependencies(new EventDependencies());

        setScheduler(newScheduler);
        setGenStage(1);
        setFirstDate(date);

        console.log('SchedulerInitialization completed:', {
            name,
            numDays: numDaysInt,
            startDate,
            dayString,
            minGap,
            maxHours,
            firstDate: date,
        });
    };

    const BreaksSetup = (breakList, repeatedBreakList, changeView = true) => {
        setBreaks([...breakList]);
        setRepeatedBreaks([...repeatedBreakList]);
        scheduler.setBreaks(breakList);
        scheduler.setRepeatedBreaks(repeatedBreakList);
        if (changeView) setGenStage(2);

        console.log('BreaksSetup completed:', {
            breaks: breakList,
            repeatedBreaks: repeatedBreakList,
            breaksCount: breakList.length,
            repeatedBreaksCount: repeatedBreakList.length,
            totalExpectedBreaksInSchedule:
                breakList.length + repeatedBreakList.length * scheduler.numDays,
        });
    };

    const RigidEventsSetup = (eventsList, changeView = true) => {
        setRigidEvents([...eventsList]);
        scheduler.setRigidEvents(eventsList);
        setEvents([...flexibleEvents, ...eventsList]);
        if (changeView) setGenStage(3);

        console.log('RigidEventsSetup completed:', {
            rigidEvents: eventsList,
            rigidEventsCount: eventsList.length,
            totalEventsAfterRigid: [...events, ...eventsList].length,
            allEvents: [...events, ...eventsList],
        });
    };

    const FlexibleEventsSetup = (eventsList, changeView = true) => {
        setFlexibleEvents([...eventsList]);
        scheduler.setFlexibleEvents(eventsList);
        setEvents([...rigidEvents, ...eventsList]);
        if (changeView) setGenStage(4);

        console.log('FlexibleEventsSetup completed:', {
            flexibleEvents: eventsList,
            flexibleEventsCount: eventsList.length,
            currentEvents: events,
            currentEventsCount: events.length,
            totalEventsAfterFlexible: [...events, ...eventsList].length,
            allEventsAfterFlexible: [...events, ...eventsList],
        });
    };

    const EventDepsSetup = (eventDeps) => {
        setDeps(eventDeps);
        scheduler.setEventDependencies(eventDeps);
        setGenStage(5);

        console.log('EventDepsSetup completed:', {
            eventDependencies: eventDeps,
            dependenciesCount: eventDeps ? Object.keys(eventDeps.dependencies || {}).length : 0,
            allEventsSoFar: events,
            totalEventsCount: events.length,
        });
    };

    const Generation = async (startTime, endTime, strategy) => {
        logScheduleAction('generate', {
            strategy,
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            rigidEventsCount: rigidEvents.length,
            flexibleEventsCount: flexibleEvents.length,
            breaksCount: breaks.length,
            repeatedBreaksCount: repeatedBreaks.length,
            scheduleDays: scheduler.numDays,
        });
        strategy == 'earliest-fit'
            ? (strategy = 'Earliest Fit')
            : strategy == 'balanced-work'
              ? (strategy = 'Balanced Work')
              : strategy == 'deadline-oriented'
                ? (strategy = 'Deadline Oriented')
                : null;

        console.log('Generation starting with:', {
            startTime,
            endTime,
            strategy,
            schedulerNumDays: scheduler.numDays,
            breaks: breaks,
            repeatedBreaks: repeatedBreaks,
            rigidEvents: rigidEvents,
            flexibleEvents: flexibleEvents,
            deps: deps,
            totalBreaksExpected: breaks.length + repeatedBreaks.length * scheduler.numDays,
            totalEventsExpected: rigidEvents.length + flexibleEvents.length,
        });

        // Additional debugging: Check if scheduler actually has the events
        console.log('🔍 SCHEDULER STATE CHECK:');
        console.log('Scheduler rigid events:', scheduler.rigidEvents);
        console.log('Scheduler flexible events:', scheduler.flexibleEvents);
        console.log('Scheduler breaks:', scheduler.breaks);
        console.log('Scheduler repeated breaks:', scheduler.repeatedBreaks);

        try {
            console.log('🚀 Starting schedule generation...');
            const schedule = scheduler.createSchedules(strategy, startTime, endTime);
            console.log('✅ Frontend schedule generated:', schedule);

            // Detailed debugging: Log what's actually in the schedule
            const expectedTimeBlocks =
                breaks.length +
                repeatedBreaks.length * scheduler.numDays +
                rigidEvents.length +
                flexibleEvents.length;
            let actualTimeBlocks = 0;

            console.log('📊 DETAILED SCHEDULE DEBUG:');
            console.log('Expected breakdown:', {
                breaks: breaks.length,
                repeatedBreaks: repeatedBreaks.length,
                numDays: scheduler.numDays,
                repeatedBreaksTotal: repeatedBreaks.length * scheduler.numDays,
                rigidEvents: rigidEvents.length,
                flexibleEvents: flexibleEvents.length,
                totalExpected: expectedTimeBlocks,
            });

            // Count time blocks across all days in the schedule
            const datesList = schedule.getAllDatesInOrder();
            console.log(
                '📅 Dates in schedule:',
                datesList.map((d) => d.toString()),
            );

            for (const date of datesList) {
                const dailySchedule = schedule.getScheduleForDate(date);
                const timeBlocks = dailySchedule.getTimeBlocks();
                actualTimeBlocks += timeBlocks.length;

                console.log(`📋 ${date.toString()}: ${timeBlocks.length} blocks`);
                timeBlocks.forEach((block, index) => {
                    console.log(
                        `   ${index + 1}. ${block.title || block.name || 'Unnamed'} (${block.startTime?.toString() || 'No start'} - ${block.endTime?.toString() || 'No end'})`,
                    );
                });
            }

            console.log(
                `📈 FINAL COUNT: Expected ${expectedTimeBlocks}, Actual ${actualTimeBlocks}`,
            );

            // Basic validation: ensure the schedule is not empty
            if (actualTimeBlocks === 0) {
                throw new Error('Schedule generation failed: No time blocks were scheduled');
            }

            // More specific validation to help debug
            if (rigidEvents.length > 0 && actualTimeBlocks < rigidEvents.length) {
                console.error('⚠️ Some rigid events may not have been scheduled!');
                console.error('Rigid events input:', rigidEvents);
            }

            if (
                flexibleEvents.length > 0 &&
                actualTimeBlocks < rigidEvents.length + flexibleEvents.length
            ) {
                console.error('⚠️ Some flexible events may not have been scheduled!');
                console.error('Flexible events input:', flexibleEvents);

                // Additional debugging for flexible events
                console.log('🔍 FLEXIBLE EVENT ANALYSIS:');
                flexibleEvents.forEach((event, index) => {
                    console.log(`Event ${index + 1}:`, {
                        name: event.name || event.getName?.(),
                        duration: event.duration,
                        durationType: typeof event.duration,
                        deadline:
                            event.deadline?.toString?.() || event.getDeadline?.()?.toString?.(),
                        priority: event.priority,
                        type: event.type,
                    });
                });

                // Check if it's a duration parsing issue
                const hasDurationIssue = flexibleEvents.some(
                    (event) =>
                        typeof event.duration === 'string' || isNaN(parseInt(event.duration)),
                );
                if (hasDurationIssue) {
                    console.error(
                        '🚨 DURATION ISSUE DETECTED: Some flexible events have non-numeric durations!',
                    );
                } else {
                    console.log('✅ All flexible events have numeric durations');
                }
            }

            // Save to local state (for offline access)
            const localScheduleEntry = {
                name: name,
                schedule: schedule,
                isActive: false,
                backendId: null, // Will be updated after backend save
            };
            setAppState({
                ...appState,
                savedSchedules: [...appState.savedSchedules, localScheduleEntry],
            });

            // Convert to backend format and save to database using new days-based API
            setIsSavingToBackend(true);
            console.log('💾 Saving schedule with days-based architecture...');

            try {
                // Use the new saveScheduleWithDays function which handles everything
                const startTimeInt =
                    typeof startTime === 'object' && startTime.toInt
                        ? startTime.toInt()
                        : startTime;

                const endTimeInt =
                    typeof endTime === 'object' && endTime.toInt ? endTime.toInt() : endTime;

                console.log('🔍 Saving with times:', {
                    originalStartTime: startTime,
                    originalEndTime: endTime,
                    startTimeInt,
                    endTimeInt,
                    strategy: strategyMap[strategy] || 'earliest-fit',
                });

                const saveResult = await saveScheduleWithDays(
                    schedule,
                    name,
                    strategyMap[strategy] || 'earliest-fit',
                    startTimeInt,
                    endTimeInt,
                );

                console.log('✅ Schedule and days saved to backend:', saveResult);

                // Update local schedule with backend ID
                if (saveResult.success && saveResult.scheduleId) {
                    setAppState((prevState) => ({
                        ...prevState,
                        savedSchedules: prevState.savedSchedules.map((s) =>
                            s.name === name ? { ...s, backendId: saveResult.scheduleId } : s,
                        ),
                    }));
                }
            } catch (backendError) {
                console.error(
                    '⚠️ Failed to save to backend, but continuing with local save:',
                    backendError,
                );
                // Don't fail the entire flow if backend save fails
            } finally {
                setIsSavingToBackend(false);
            }

            // Log successful generation
            logScheduleAction('generate_success', {
                strategy,
                scheduleName: name,
                totalTimeBlocks: actualTimeBlocks, // Use the actualTimeBlocks we already calculated
                scheduleDays: scheduler.numDays,
                savedToBackend: true,
            });

            setShowGenerationModal(true);
        } catch (error) {
            setShowErrorModal(true);
            logError('schedule_generation_failed', error, {
                strategy,
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                rigidEventsCount: rigidEvents.length,
                flexibleEventsCount: flexibleEvents.length,
            });
            console.error('💥 Schedule generation failed:', error);
            return;
        }
    };

    const views = [
        <InfoView onNext={SchedulerInitialization} />,
        <BreaksView
            onNext={BreaksSetup}
            minDate={firstDate}
            numDays={scheduler.numDays}
            onBack={() => {
                logUserAction('generation_step_back', { fromStep: genStage, toStep: genStage - 1 });
                setGenStage(genStage - 1);
            }}
            breaksInput={breaks}
            repeatedBreaksInput={repeatedBreaks}
        />,
        <RigidEventsView
            onNext={RigidEventsSetup}
            minDate={firstDate}
            numDays={scheduler.numDays}
            onBack={() => {
                logUserAction('generation_step_back', { fromStep: genStage, toStep: genStage - 1 });
                setGenStage(genStage - 1);
            }}
            eventsInput={rigidEvents}
        />,
        <FlexibleEventsView
            onNext={FlexibleEventsSetup}
            minDate={firstDate}
            numDays={scheduler.numDays}
            onBack={() => {
                logUserAction('generation_step_back', { fromStep: genStage, toStep: genStage - 1 });
                setGenStage(genStage - 1);
            }}
            eventsInput={flexibleEvents}
        />,
        <EventDependenciesView onNext={EventDepsSetup} events={events} depsInput={deps} />,
        <FinalCheckView onNext={Generation} />,
    ];

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            <View style={styles.titleContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>{titles[genStage]}</Text>
            </View>
            {views[genStage]}
            <SchedulingErrorModal
                isVisible={showErrorModal}
                action1={() => {
                    navigation.replace('MainTabs');
                    setShowErrorModal(false);
                }}
                action2={() => {
                    setShowErrorModal(false);
                    setGenStage(1);
                }}
            />
            <GenerationModal
                isVisible={showGenerationModal}
                onViewSchedule={() => {
                    navigation.replace('View', { schedName: name });
                    setShowGenerationModal(false);
                }}
                isSavingToBackend={isSavingToBackend}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        height: '100%',
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 64,
        marginBottom: 8,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
});

export default GenerateScheduleScreen;
