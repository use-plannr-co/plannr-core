import Scheduler from '../Scheduler.js';
import ScheduleDate from '../ScheduleDate.js';
import RigidEvent from '../RigidEvent.js';
import FlexibleEvent from '../FlexibleEvent.js';
import Time24 from '../Time24.js';
import ActivityType from '../ActivityType.js';
import Priority from '../Priority.js';
import EventDependencies from '../EventDependencies.js';

console.log('=== BACKEND CONVERSION TEST ===');
console.log('Testing schedule generation and backend conversion');

// Create scheduler (same as SchedulingTest.js)
const startDate = new ScheduleDate(29, 12, 2024); // December 29, 2024 (Sunday)
const scheduler = new Scheduler(7, startDate, 'Sunday', 15, 8);

// Create events (similar to SchedulingTest.js)
const rigidEvent = new RigidEvent(
    'Team Meeting', // name
    ActivityType.MEETING, // type
    60, // duration in minutes
    new ScheduleDate(29, 12, 2024), // date
    1000, // startTime (10:00 AM)
    1100, // endTime (11:00 AM)
);

const flexibleEvent = new FlexibleEvent(
    'Review Documents', // name
    ActivityType.WORK, // type
    60, // duration in minutes
    Priority.MEDIUM, // priority
    new ScheduleDate(30, 12, 2024), // deadline
);

// Add events to scheduler
scheduler.setRigidEvents([rigidEvent]);
scheduler.setFlexibleEvents([flexibleEvent]);
scheduler.setEventDependencies(new EventDependencies());

console.log('Events added to scheduler:', {
    rigidEvents: scheduler.rigidEvents.length,
    flexibleEvents: scheduler.flexibleEvents.length,
});

// Generate schedule
try {
    console.log('Generating schedule...');
    const schedule = scheduler.createSchedules('Earliest Fit', 800, 1800); // 8 AM to 6 PM
    console.log('✅ Schedule generated successfully!');

    // Count time blocks (verify it works)
    let totalTimeBlocks = 0;
    const datesList = schedule.getAllDatesInOrder();

    for (const date of datesList) {
        const dailySchedule = schedule.getScheduleForDate(date);
        const timeBlocks = dailySchedule.getTimeBlocks();
        totalTimeBlocks += timeBlocks.length;

        if (timeBlocks.length > 0) {
            console.log(`${date.toString()}:`);
            timeBlocks.forEach((block, index) => {
                console.log(
                    `  ${index + 1}. ${block.name || 'Unnamed'} (${block.startTime?.toString()} - ${block.endTime?.toString()})`,
                );
            });
        }
    }

    console.log(`Total time blocks: ${totalTimeBlocks}`);

    // Now test the backend conversion functions
    console.log('\n=== TESTING BACKEND CONVERSION ===');

    // Copy the helper functions from GenerateScheduleScreen.jsx
    const formatScheduleDateToISO = (scheduleDate) => {
        console.log('🔍 DEBUG formatScheduleDateToISO input:', scheduleDate);
        console.log('🔍 DEBUG scheduleDate properties:', {
            date: scheduleDate?.date,
            month: scheduleDate?.month,
            year: scheduleDate?.year,
            toString: scheduleDate?.toString?.(),
            constructor: scheduleDate?.constructor?.name,
        });

        // If it's already a string in ISO format (like "29-12-2024"), convert it to proper ISO format
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
        if (!scheduleDate) {
            throw new Error('scheduleDate is null or undefined');
        }

        if (
            typeof scheduleDate.year === 'undefined' ||
            typeof scheduleDate.month === 'undefined' ||
            typeof scheduleDate.date === 'undefined'
        ) {
            throw new Error(
                `Invalid ScheduleDate object: year=${scheduleDate.year}, month=${scheduleDate.month}, date=${scheduleDate.date}`,
            );
        }

        const year = scheduleDate.year;
        const month = scheduleDate.month.toString().padStart(2, '0');
        const day = scheduleDate.date.toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getScheduleDateDayName = (scheduleDate) => {
        const jsDate = new Date(scheduleDate.year, scheduleDate.month - 1, scheduleDate.date);
        return jsDate.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const mapActivityType = (frontendType) => {
        console.log('🔍 DEBUG mapActivityType input:', frontendType);
        const typeMap = {
            Break: 'BREAK',
            WORK: 'WORK',
            MEETING: 'MEETING',
            PERSONAL: 'PERSONAL',
            EVENT: 'EVENT',
            EDUCATION: 'EDUCATION',
            TRAVEL: 'TRAVEL',
            RECREATIONAL: 'RECREATIONAL',
            ERRAND: 'ERRAND',
            OTHER: 'OTHER',
        };
        const result = typeMap[frontendType] || 'OTHER';
        console.log('🔍 DEBUG mapActivityType output:', result);
        return result;
    };

    const mapPriority = (frontendPriority) => {
        const priorityMap = {
            High: 'HIGH',
            Medium: 'MEDIUM',
            Low: 'LOW',
        };
        return priorityMap[frontendPriority] || 'MEDIUM';
    };

    // Test the conversion function
    const convertScheduleToBackendFormat = (
        frontendSchedule,
        scheduleName,
        strategy,
        startTime,
        endTime,
    ) => {
        try {
            console.log('🔍 DEBUG: Converting schedule to backend format...');
            const scheduleDate = frontendSchedule.getFirstDate();
            console.log('🔍 DEBUG: scheduleDate:', scheduleDate);

            const periodStart = formatScheduleDateToISO(scheduleDate);
            console.log('🔍 DEBUG: periodStart:', periodStart);

            // Calculate period end based on number of days
            const endDate = new Date(periodStart);
            endDate.setDate(endDate.getDate() + scheduler.numDays - 1);
            const periodEnd = endDate.toISOString().split('T')[0];

            // Convert strategy names to match backend format
            const strategyMap = {
                'earliest-fit': 'EarliestFit',
                'balanced-work': 'BalancedWork',
                'deadline-oriented': 'DeadlineOriented',
            };

            console.log('🔍 DEBUG: Creating backendSchedule object...');
            const backendSchedule = {
                title: scheduleName,
                periodStart: periodStart,
                periodEnd: periodEnd,
                day1Date: {
                    date: scheduleDate.date,
                    month: scheduleDate.month,
                    year: scheduleDate.year,
                },
                day1Day: getScheduleDateDayName(scheduleDate),
                isActive: true,
                numDays: scheduler.numDays,
                minGap: scheduler.minGapMinutes,
                workingHoursLimit: scheduler.maxWorkingHours,
                strategy: strategyMap[strategy] || 'EarliestFit',
                startTime: startTime,
                endTime: endTime,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    frontendVersion: '1.0.0',
                },
            };
            console.log('🔍 DEBUG: backendSchedule created successfully');

            // Convert blocks
            console.log('🔍 DEBUG: Converting blocks...');
            const blocks = [];
            const datesList = frontendSchedule.getAllDatesInOrder();
            console.log(
                '🔍 DEBUG: datesList:',
                datesList?.map((d) => d?.toString?.() || 'invalid date'),
            );

            for (const date of datesList) {
                console.log('🔍 DEBUG: Processing date:', date?.toString?.() || 'invalid date');
                const dailySchedule = frontendSchedule.getScheduleForDate(date);
                const timeBlocks = dailySchedule.getTimeBlocks();
                console.log('🔍 DEBUG: timeBlocks for date:', timeBlocks?.length || 0);

                for (const [blockIndex, block] of timeBlocks.entries()) {
                    console.log(`🔍 DEBUG: Processing block ${blockIndex}:`, {
                        title: block.title,
                        name: block.name,
                        type: block.type,
                        activityType: block.activityType,
                        priority: block.priority,
                        startTime: block.startTime,
                        endTime: block.endTime,
                        description: block.description,
                        getDuration: typeof block.getDuration,
                    });

                    const blockData = {
                        title: block.title || block.name || 'Untitled Block',
                        activityType: mapActivityType(block.activityType || block.type),
                        priority: mapPriority(block.priority),
                        estimatedDuration: block.getDuration
                            ? block.getDuration()
                            : block.duration || 60,
                        blockDate: formatScheduleDateToISO(date),
                        startTime: block.startTime?.toInt() || 0,
                        endTime: block.endTime?.toInt() || 0,
                        description: block.description || '',
                        isCompleted: false,
                        metadata: {
                            originalType: block.type,
                            generatedOrder: blocks.length,
                        },
                    };

                    console.log(`🔍 DEBUG: Block ${blockIndex} converted:`, blockData);
                    blocks.push(blockData);
                }
            }
            console.log('🔍 DEBUG: Blocks conversion completed, total blocks:', blocks.length);

            return { schedule: backendSchedule, blocks };
        } catch (error) {
            console.error('🔍 DEBUG: Error in convertScheduleToBackendFormat:', error);
            console.error('🔍 DEBUG: Error stack:', error.stack);
            throw error;
        }
    };

    // Test the conversion
    try {
        const { schedule: backendSchedule, blocks } = convertScheduleToBackendFormat(
            schedule,
            'Test Schedule',
            'earliest-fit',
            800,
            1800,
        );

        console.log('✅ Backend conversion successful!');
        console.log('Backend Schedule:', JSON.stringify(backendSchedule, null, 2));
        console.log('Blocks:', JSON.stringify(blocks, null, 2));

        // Now let's actually try to save to the backend
        console.log('\n=== TESTING ACTUAL BACKEND SAVE ===');

        // We can't import the authenticated API here, so let's make a raw fetch request
        const API_BASE_URL = 'https://plannr-690n.onrender.com'; // Your backend URL

        try {
            console.log('📤 Attempting to save schedule to backend...');

            // Note: This will fail without proper authentication, but it will test the conversion pipeline
            const response = await fetch(`${API_BASE_URL}/api/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: We don't have authentication in this test
                },
                body: JSON.stringify(backendSchedule),
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

            if (response.ok) {
                console.log('✅ Successfully saved to backend!');
            } else {
                console.log('⚠️ Backend save failed (expected without auth):', responseData);
            }
        } catch (fetchError) {
            console.log('⚠️ Network/Backend error (expected without auth):', fetchError.message);
        }
    } catch (conversionError) {
        console.error('❌ Backend conversion failed:', conversionError);
        console.error('Stack:', conversionError.stack);
    }
} catch (error) {
    console.error('❌ Schedule generation failed:', error.message);
    console.error('Stack:', error.stack);
}
