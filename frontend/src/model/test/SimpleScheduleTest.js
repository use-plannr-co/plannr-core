import Scheduler from '../Scheduler.js';
import ScheduleDate from '../ScheduleDate.js';
import RigidEvent from '../RigidEvent.js';
import FlexibleEvent from '../FlexibleEvent.js';
import Time24 from '../Time24.js';
import ActivityType from '../ActivityType.js';
import Priority from '../Priority.js';
import EventDependencies from '../EventDependencies.js';

console.log('=== SIMPLE SCHEDULE TEST ===');
console.log('Testing with just 1 rigid event + 1 flexible event');

// Create scheduler
const startDate = new ScheduleDate(29, 12, 2024); // December 29, 2024 (Sunday)
const scheduler = new Scheduler(7, startDate, 'Sunday', 15, 8);

console.log('Scheduler created:', {
    numDays: scheduler.numDays,
    firstDate: scheduler.firstDate.toString(),
    firstDay: scheduler.firstDay,
});

// Create one rigid event
const rigidEvent = new RigidEvent(
    'Team Meeting', // name
    ActivityType.MEETING, // type
    60, // duration in minutes
    new ScheduleDate(29, 12, 2024), // date
    1000, // startTime (10:00 AM)
    1100, // endTime (11:00 AM)
);

console.log('Created rigid event:', {
    name: rigidEvent.getName(),
    type: rigidEvent.getType(),
    date: rigidEvent.getDate().toString(),
    startTime: rigidEvent.getStartTime().toString(),
    endTime: rigidEvent.getEndTime().toString(),
    duration: rigidEvent.getDuration(),
});

// Create one flexible event
const flexibleEvent = new FlexibleEvent(
    'Review Documents', // name
    ActivityType.WORK, // type
    60, // duration in minutes
    Priority.MEDIUM, // priority
    new ScheduleDate(30, 12, 2024), // deadline
);

console.log('Created flexible event:', {
    name: flexibleEvent.getName(),
    type: flexibleEvent.getType(),
    deadline: flexibleEvent.getDeadline().toString(),
    duration: flexibleEvent.getDuration(),
});

// Add events to scheduler
scheduler.setRigidEvents([rigidEvent]);
scheduler.setFlexibleEvents([flexibleEvent]);

// Create empty event dependencies (this is likely the missing piece!)
const eventDependencies = new EventDependencies();
scheduler.setEventDependencies(eventDependencies);

console.log('Events added to scheduler:', {
    rigidEvents: scheduler.rigidEvents.length,
    flexibleEvents: scheduler.flexibleEvents.length,
    eventDependencies: scheduler.eventDependencies !== null,
});

// Generate schedule
try {
    console.log('Generating schedule...');
    const schedule = scheduler.createSchedules('Earliest Fit', 800, 1800); // 8 AM to 6 PM

    console.log('Schedule generated successfully!');

    // Count time blocks
    let totalTimeBlocks = 0;
    const datesList = schedule.getAllDatesInOrder();

    console.log('Schedule details:');
    for (const date of datesList) {
        const dailySchedule = schedule.getScheduleForDate(date);
        const timeBlocks = dailySchedule.getTimeBlocks();
        totalTimeBlocks += timeBlocks.length;

        if (timeBlocks.length > 0) {
            console.log(`${date.toString()}:`);
            timeBlocks.forEach((block, index) => {
                console.log(
                    `  ${index + 1}. ${block.name || block.title || 'Unnamed'} (${block.startTime?.toString()} - ${block.endTime?.toString()})`,
                );
            });
        }
    }

    console.log(`Total time blocks: ${totalTimeBlocks}`);
    console.log(`Expected: 2 (1 rigid + 1 flexible), Actual: ${totalTimeBlocks}`);

    if (totalTimeBlocks === 2) {
        console.log('✅ SUCCESS: Both events were scheduled!');
    } else {
        console.log('❌ ISSUE: Expected 2 time blocks, got', totalTimeBlocks);
    }
} catch (error) {
    console.error('❌ Schedule generation failed:', error.message);
    console.error('Stack:', error.stack);
}
