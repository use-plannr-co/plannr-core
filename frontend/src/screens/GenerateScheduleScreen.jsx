import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { useAuthenticatedAPI } from '../api/index.js';

import Time24 from '../model/Time24.js';
import ScheduleDate from '../model/ScheduleDate.js';
import RigidEvent from '../model/RigidEvent.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import combineScheduleDateAndTime24 from '../utils/combineScheduleDateAndTime24.js';
import Scheduler from '../model/Scheduler.js';
import EventDependencies from '../model/EventDependencies.js';

import GenerationModal from '../modals/GenerationModal.jsx';
import SchedulingErrorModal from '../modals/SchedulingErrorModal.jsx';
import AbandonSchedulingModal from '../modals/AbandonSchedulingModal.jsx';
import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';
import LoadingScreen from './LoadingScreen.jsx';
import SettingUpView from '../scheduling-logic-views/SettingUpView.jsx';
import AddTasksView from '../scheduling-logic-views/AddTasksView.jsx';
import ReviewTasksView from '../scheduling-logic-views/ReviewTasksView.jsx';
import BusyTimesView from '../scheduling-logic-views/BusyTimesView.jsx';
import FinishingUpView from '../scheduling-logic-views/FinishingUpView.jsx';

const GenerateScheduleScreen = ({ navigation }) => {
    const { appState, setAppState } = useAppState();
    const { logUserAction, logScheduleAction, logError } = useActionLogger('GenerateSchedule');
    const {
        saveScheduleWithDays,
        convertScheduleToBackendJSON,
        convertTimeBlockToBackendJSON,
        parseTextToFlexibleEvents,
    } = useAuthenticatedAPI();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    // State Variables
    const [genStage, setGenStage] = useState(0); // 0: Set Up, 1: Add Tasks, 2: Review Tasks, 3: Busy Times, 4: Finishing Up
    const [showGenerationModal, setShowGenerationModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showAbandonModal, setShowAbandonModal] = useState(false);
    const [isSavingToBackend, setIsSavingToBackend] = useState(false);
    const [scheduler, setScheduler] = useState(
        new Scheduler(1, new ScheduleDate(1, 1, 1970), 'Sunday', 15, 8),
    );
    const [name, setName] = useState('');
    const [numDays, setNumDays] = useState(1);
    const [breaks, setBreaks] = useState([]);
    const [repeatedBreaks, setRepeatedBreaks] = useState([]);
    const [rigidEvents, setRigidEvents] = useState([]);
    const [flexibleEvents, setFlexibleEvents] = useState([]);
    const [events, setEvents] = useState([]);
    const [deps, setDeps] = useState(new EventDependencies());
    const [firstDate, setFirstDate] = useState(convertDateToScheduleDate(new Date()));
    const [isLoading, setIsLoading] = useState(false);

    // Strategy mapping for backend API
    const strategyMap = {
        'Earliest Fit': 'earliest-fit',
        'Balanced Work': 'balanced-work',
        'Deadline Oriented': 'deadline-oriented',
    };

    const progressAnim = useRef(new Animated.Value(20)).current;
    const progressPercentage = ((genStage + 1) / 5) * 100;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPercentage,
            duration: 800, // 800ms smooth animation
            useNativeDriver: false, // Width animations need to use JS driver
        }).start();
    }, [genStage, progressPercentage]);

    // Handlers
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
        setNumDays(numDaysInt);

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

    const getScheduleDateDayName = (scheduleDate) => {
        const jsDate = new Date(scheduleDate.year, scheduleDate.month - 1, scheduleDate.date);
        return jsDate.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const AddTasksHandler = async (todoListInput) => {
        try {
            console.log('📝 Processing todo list input:', todoListInput);

            // Show loading state
            setIsLoading(true);

            // Call the text-to-tasks API to parse the input
            let maxDate = firstDate;
            for (let i = 0; i < numDays - 1; i++) {
                maxDate = maxDate.getNextDate();
            }
            console.log('Determined maxDate for parsing:', maxDate);
            const result = await parseTextToFlexibleEvents(todoListInput, maxDate, {
                defaultDuration: 60,
                workingHours: {
                    start: 9,
                    end: 17,
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });

            if (result.success) {
                console.log('✅ Successfully parsed tasks:', result);

                // Update state with the parsed FlexibleEvents
                setFlexibleEvents(result.flexibleEvents);

                // Update events array with current rigid + flexible events
                setEvents([...rigidEvents, ...result.flexibleEvents]);

                // Log success metrics
                logUserAction('text_to_tasks_parse_success', {
                    totalTasks: result.stats.totalTasks,
                    validTasks: result.stats.validTasks,
                    warnings: result.stats.warnings,
                });

                // Show warnings to user if any (you might want to display these in UI)
                if (result.warnings && result.warnings.length > 0) {
                    console.warn('⚠️ Parse warnings:', result.warnings);
                }

                // Move to the next stage
                setGenStage(2);
            } else {
                throw new Error('Parse failed: No success flag returned');
            }
        } catch (error) {
            console.error('❌ Text-to-tasks parsing failed:', error);

            // Log error
            logError('text_to_tasks_parse_failed', {
                error: error.message,
                inputLength: todoListInput?.length || 0,
            });

            // Show user-friendly error message without exposing internal details
            let userMessage =
                "We couldn't get your tasks. Please try again or enter them manually.";

            // Provide more specific guidance based on error type
            if (error.message?.includes('Authentication')) {
                userMessage = 'Authentication failed. Please sign out and back in, then try again.';
            } else if (error.message?.includes('TOO_MANY_REQUESTS') || error.status === 429) {
                userMessage =
                    "You've reached the hourly limit for text-to-tasks parsing. Please try again in a bit or enter your tasks manually.";
            } else if (error.message?.includes('Network') || error.message?.includes('Server')) {
                userMessage = 'Connection error. Please check your internet and try again.';
            } else if (error.message?.includes('APP_UPDATE_REQUIRED')) {
                userMessage = 'Please update the app to continue using this feature.';
            }

            alert(userMessage);

            // Reset to the add tasks stage
            setGenStage(1);
        } finally {
            setIsLoading(false);
        }
    };

    const ReviewTasksHandler = (reviewedTasks) => {
        // Process the reviewedTasks and update flexibleEvents
        console.log('Reviewed tasks:', reviewedTasks);
        setFlexibleEvents(reviewedTasks);

        // CRITICAL: Add flexible events to the scheduler
        scheduler.setFlexibleEvents(reviewedTasks);

        // Update the combined events array
        setEvents([...rigidEvents, ...reviewedTasks]);

        setGenStage(3);
    };

    const BusyTimesHandler = (busyTimes) => {
        // Process the busy times and update rigid events
        console.log('Busy times:', busyTimes);

        // Convert plain objects to RigidEvent instances
        const rigidEventInstances = busyTimes.map((busyTime) => {
            // Convert date object to ScheduleDate instance
            const scheduleDate = new ScheduleDate(
                busyTime.date.date,
                busyTime.date.month,
                busyTime.date.year,
            );

            // Convert time objects to integer format (e.g., {hour: 14, minute: 30} -> 1430)
            const startTimeInt = busyTime.startTime.hour * 100 + busyTime.startTime.minute;
            const endTimeInt = busyTime.endTime.hour * 100 + busyTime.endTime.minute;

            // Create RigidEvent instance
            return new RigidEvent(
                busyTime.name,
                busyTime.activityType || busyTime.type, // Handle both property names
                busyTime.duration,
                scheduleDate,
                startTimeInt,
                endTimeInt,
                busyTime.id,
            );
        });

        console.log('🔧 Converted rigid events:', rigidEventInstances);
        setRigidEvents(rigidEventInstances);

        // CRITICAL: Add rigid events to the scheduler
        scheduler.setRigidEvents(rigidEventInstances);

        // Also set any breaks (currently empty in this workflow)
        scheduler.setBreaks(breaks);
        scheduler.setRepeatedBreaks(repeatedBreaks);

        // Update the combined events array
        setEvents([...busyTimes, ...flexibleEvents]);

        setGenStage(4);
    };

    const Generation = async (startTime, endTime, strategy) => {
        setIsLoading(true);
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

                // Update local schedule with backend ID and updated time blocks
                if (saveResult.success && saveResult.scheduleId) {
                    const updatedScheduleWithBackendId = saveResult.updatedScheduleObject;

                    setAppState((prevState) => ({
                        ...prevState,
                        savedSchedules: prevState.savedSchedules.map((s) =>
                            s.name === name
                                ? {
                                      ...s,
                                      backendId: saveResult.scheduleId,
                                      schedule: updatedScheduleWithBackendId, // Use the updated schedule with backend IDs
                                  }
                                : s,
                        ),
                        // Also update active schedule if this is the active one
                        activeSchedule:
                            prevState.activeSchedule && prevState.activeSchedule.name === name
                                ? {
                                      ...prevState.activeSchedule,
                                      backendId: saveResult.scheduleId,
                                      schedule: updatedScheduleWithBackendId,
                                  }
                                : prevState.activeSchedule,
                    }));

                    console.log('🔗 Updated frontend schedule with backend IDs for time blocks');
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

            setIsLoading(false);
            setShowGenerationModal(true);
        } catch (error) {
            setIsLoading(false);
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

    // Titles and Views for each stage
    const titles = [
        'Setting Up',
        'Add Your Tasks',
        'Review Your Tasks',
        'Set Your Busy Times',
        'Finishing Up',
    ];

    const views = [
        <SettingUpView
            onNext={(name, numDays, startDate, minGap, maxHours) =>
                SchedulerInitialization(name, numDays, startDate, minGap, maxHours)
            }
        />,
        <AddTasksView onNext={AddTasksHandler} />,
        <ReviewTasksView
            onNext={ReviewTasksHandler}
            tasks={flexibleEvents}
            minDate={firstDate}
            numDays={numDays}
        />,
        <BusyTimesView
            onNext={BusyTimesHandler}
            timeBlocks={rigidEvents}
            minDate={firstDate}
            numDays={numDays}
        />,
        <FinishingUpView onNext={Generation} />,
    ];

    return (
        <View style={{ ...styles.container, backgroundColor: theme.BACKGROUND }}>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <Animated.View
                        style={[
                            { ...styles.progressBarForeground, backgroundColor: theme.FOREGROUND },
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                    extrapolate: 'clamp',
                                }),
                            },
                        ]}
                    />
                </View>
            </View>
            <View style={styles.titleContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowAbandonModal(true)}
                >
                    <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>{titles[genStage]}</Text>
            </View>
            {isLoading ? (
                genStage === 1 ? (
                    <LoadingScreen message="Understanding your tasks..." />
                ) : (
                    <LoadingScreen message="Just a moment..." />
                )
            ) : (
                views[genStage]
            )}
            <SchedulingErrorModal
                isVisible={showErrorModal}
                action1={() => {
                    navigation.replace('MainTabs');
                    setShowErrorModal(false);
                }}
                action2={() => {
                    setShowErrorModal(false);
                    setGenStage(2);
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
            <AbandonSchedulingModal
                isVisible={showAbandonModal}
                goTo={() => navigation.goBack()}
                onClose={() => setShowAbandonModal(false)}
                goToName="previous"
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
        marginTop: 24,
        marginBottom: 8,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    progressBarContainer: {
        width: '100%',
        marginTop: 64,
    },
    progressBarBackground: {
        height: 4,
        borderRadius: 16,
        backgroundColor: 'rgba(204, 204, 204, 0.5)', // Grey with 50% opacity
    },
    progressBarForeground: {
        height: 4,
        borderRadius: 16,
        backgroundColor: 'rgb(0, 0, 0)', // Black with 100% opacity
    },
});

export default GenerateScheduleScreen;
