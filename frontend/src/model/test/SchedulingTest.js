import Scheduler from '../Scheduler.js';
import ScheduleDate from '../ScheduleDate.js';
import RigidEvent from '../RigidEvent.js';
import FlexibleEvent from '../FlexibleEvent.js';
import Break from '../Break.js';
import EventDependencies from '../EventDependencies.js';
import ActivityType from '../ActivityType.js';
import Priority from '../Priority.js';
import CircularDependencyError from '../exceptions/CircularDependencyError.js';
import EarliestFitStrategy from '../EarliestFitStrategy.js';

function schedulerTest1() {
    const scheduler = new Scheduler(7, new ScheduleDate(6, 4, 2025), 'Sunday', 30, 6);

    // --- Rigid Events ---
    const rigidEvents = [
        new RigidEvent(
            'Church Visit',
            ActivityType.PERSONAL,
            60,
            new ScheduleDate(6, 4, 2025),
            1000,
            1100,
        ),
        new RigidEvent(
            'Math Midterm',
            ActivityType.EDUCATION,
            120,
            new ScheduleDate(7, 4, 2025),
            1000,
            1200,
        ),
        new RigidEvent(
            'Physio Checkup',
            ActivityType.PERSONAL,
            30,
            new ScheduleDate(8, 4, 2025),
            900,
            930,
        ),
        new RigidEvent(
            'Team Workshop',
            ActivityType.WORK,
            120,
            new ScheduleDate(9, 4, 2025),
            1400,
            1600,
        ),
        new RigidEvent(
            'Chemistry Quiz',
            ActivityType.EDUCATION,
            60,
            new ScheduleDate(9, 4, 2025),
            900,
            1000,
        ),
        new RigidEvent(
            'Staff Meeting',
            ActivityType.WORK,
            60,
            new ScheduleDate(10, 4, 2025),
            1100,
            1200,
        ),
        new RigidEvent(
            'Manager Check-In',
            ActivityType.WORK,
            30,
            new ScheduleDate(10, 4, 2025),
            1500,
            1530,
        ),
        new RigidEvent(
            'Final Presentation',
            ActivityType.WORK,
            60,
            new ScheduleDate(11, 4, 2025),
            1500,
            1600,
        ),
        new RigidEvent(
            'Dinner Party',
            ActivityType.PERSONAL,
            120,
            new ScheduleDate(12, 4, 2025),
            1900,
            2100,
        ),
    ];
    rigidEvents.forEach((e) => scheduler.addRigidEvent(e));

    // --- Flexible Events ---
    const flexibleEvents = [
        new FlexibleEvent(
            'Study Math Chapters',
            ActivityType.EDUCATION,
            90,
            Priority.HIGH,
            new ScheduleDate(7, 4, 2025),
        ),
        new FlexibleEvent(
            'Fill Health Journal',
            ActivityType.PERSONAL,
            30,
            Priority.LOW,
            new ScheduleDate(8, 4, 2025),
        ),
        new FlexibleEvent(
            'Slide Draft',
            ActivityType.WORK,
            60,
            Priority.MEDIUM,
            new ScheduleDate(9, 4, 2025),
        ),
        new FlexibleEvent(
            'Write Research Notes',
            ActivityType.EDUCATION,
            45,
            Priority.MEDIUM,
            new ScheduleDate(10, 4, 2025),
        ),
        new FlexibleEvent(
            'Data Cleaning',
            ActivityType.WORK,
            30,
            Priority.LOW,
            new ScheduleDate(10, 4, 2025),
        ),
        new FlexibleEvent(
            'Weekly Planning',
            ActivityType.PERSONAL,
            20,
            Priority.LOW,
            new ScheduleDate(12, 4, 2025),
        ),
        new FlexibleEvent(
            'Report Draft',
            ActivityType.WORK,
            90,
            Priority.HIGH,
            new ScheduleDate(11, 4, 2025),
        ),
        new FlexibleEvent(
            'Design Mockups',
            ActivityType.WORK,
            60,
            Priority.MEDIUM,
            new ScheduleDate(11, 4, 2025),
        ),
        new FlexibleEvent(
            'Proofread Notes',
            ActivityType.EDUCATION,
            30,
            Priority.LOW,
            new ScheduleDate(11, 4, 2025),
        ),
        new FlexibleEvent(
            'Buy Gifts',
            ActivityType.PERSONAL,
            45,
            Priority.LOW,
            new ScheduleDate(12, 4, 2025),
        ),
        new FlexibleEvent(
            'Reflective Essay',
            ActivityType.EDUCATION,
            60,
            Priority.HIGH,
            new ScheduleDate(12, 4, 2025),
        ),
        new FlexibleEvent(
            'Meditation Session',
            ActivityType.PERSONAL,
            30,
            Priority.LOW,
            new ScheduleDate(6, 4, 2025),
        ),
        new FlexibleEvent(
            'Read Case Studies',
            ActivityType.EDUCATION,
            60,
            Priority.MEDIUM,
            new ScheduleDate(9, 4, 2025),
        ),
        new FlexibleEvent(
            'Finalize Budget',
            ActivityType.WORK,
            40,
            Priority.MEDIUM,
            new ScheduleDate(11, 4, 2025),
        ),
        new FlexibleEvent(
            'Email Follow-Ups',
            ActivityType.WORK,
            30,
            Priority.LOW,
            new ScheduleDate(10, 4, 2025),
        ),
        new FlexibleEvent(
            'Packing Checklist',
            ActivityType.PERSONAL,
            20,
            Priority.LOW,
            new ScheduleDate(12, 4, 2025),
        ),
    ];
    flexibleEvents.forEach((e) => scheduler.addFlexibleEvent(e));

    // --- Breaks ---
    scheduler.addBreak(new ScheduleDate(7, 4, 2025), new Break(30, 1300, 1330));
    scheduler.addBreak(new ScheduleDate(9, 4, 2025), new Break(30, 1200, 1230));
    scheduler.addBreak(new ScheduleDate(10, 4, 2025), new Break(30, 1000, 1030));
    scheduler.addBreak(new ScheduleDate(11, 4, 2025), new Break(30, 900, 930));
    scheduler.addRepeatedBreak(new Break(30, 1700, 1730));

    // --- Dependencies ---
    const deps = new EventDependencies();
    const depList = [
        ['Math Midterm', 'Study Math Chapters'],
        ['Fill Health Journal', 'Physio Checkup'],
        ['Write Research Notes', 'Slide Draft'],
        ['Proofread Notes', 'Write Research Notes'],
        ['Reflective Essay', 'Proofread Notes'],
        ['Design Mockups', 'Slide Draft'],
        ['Design Mockups', 'Report Draft'],
        ['Report Draft', 'Staff Meeting'],
        ['Finalize Budget', 'Report Draft'],
        ['Email Follow-Ups', 'Staff Meeting'],
        ['Buy Gifts', 'Weekly Planning'],
        ['Packing Checklist', 'Buy Gifts'],
    ];
    const nameToEvent = {};
    [...rigidEvents, ...flexibleEvents].forEach((e) => {
        nameToEvent[e.getName()] = e;
    });

    try {
        for (const [dependent, prerequisite] of depList) {
            deps.addDependency(nameToEvent[dependent], nameToEvent[prerequisite]);
        }
    } catch (e) {
        if (e instanceof CircularDependencyError) {
            console.error(e.message);
        }
    }
    scheduler.setEventDependencies(deps);

    // --- Schedule Generation ---
    const strategies = ['Earliest Fit', 'Balanced Work', 'Deadline Oriented'];
    const schedules = strategies.map((strategy) => scheduler.createSchedules(strategy, 800, 1700));

    // --- Summary Output ---
    strategies.forEach((strategy, i) => {
        const schedule = schedules[i];
        let totalBlocks = 0;
        for (const daySchedule of schedule) {
            console.log(daySchedule.toString());
            totalBlocks += daySchedule.getTimeBlocks().length;
        }
        console.log(`Total time blocks in ${strategy} schedule: ${totalBlocks}`);
    });

    // --- Optional ICS Output ---
    // const paths = [
    //   'data/earliest-fit-schedule.ics',
    //   'data/balanced-work-schedule.ics',
    //   'data/deadline-oriented-schedule.ics'
    // ];
    // for (let i = 0; i < paths.length; i++) {
    //   ICSHandler.getInstance().generateICS(schedules[i], paths[i]);
    // }
}

function sortByUrgencyTest() {
    // Use a bare EarliestFitStrategy instance just to access sortByUrgency()
    const strat = new EarliestFitStrategy(
        {
            numDays: 7,
            breaks: [],
            repeatedBreaks: [],
            rigidEvents: [],
            flexibleEvents: [],
            eventDependencies: new EventDependencies(),
        },
        new ScheduleDate(6, 4, 2025),
        'Sunday',
        15,
        8,
    );

    const dayA = new ScheduleDate(10, 4, 2025); // Apr 10
    const dayB = new ScheduleDate(7, 4, 2025); // Apr 7 (earlier)
    const dayC = new ScheduleDate(10, 4, 2025); // Apr 10 (same as A)

    const highFarDeadline = new FlexibleEvent(
        'HighFar',
        ActivityType.WORK,
        60,
        Priority.HIGH,
        dayA,
    );
    const lowNearDeadline = new FlexibleEvent('LowNear', ActivityType.WORK, 60, Priority.LOW, dayB);
    const highSameDeadline = new FlexibleEvent(
        'HighSame',
        ActivityType.WORK,
        60,
        Priority.HIGH,
        dayC,
    );
    const lowSameDeadline = new FlexibleEvent('LowSame', ActivityType.WORK, 60, Priority.LOW, dayC);
    const highNoDeadline = new FlexibleEvent(
        'HighNoDL',
        ActivityType.WORK,
        60,
        Priority.HIGH,
        null,
    );
    const lowNoDeadline = new FlexibleEvent('LowNoDL', ActivityType.WORK, 60, Priority.LOW, null);

    let pass = true;

    // --- Test 1: EDF guarantee — near-deadline LOW beats far-deadline HIGH ---
    const sorted1 = strat.sortByUrgency([highFarDeadline, lowNearDeadline]);
    const edfOk = sorted1[0] === lowNearDeadline && sorted1[1] === highFarDeadline;
    console.log(
        `[sortByUrgencyTest] EDF preserved (LOW Apr7 before HIGH Apr10): ${edfOk ? 'PASS' : 'FAIL'}`,
    );
    if (!edfOk) pass = false;

    // --- Test 2: Same-deadline tiebreaker — HIGH before LOW ---
    const sorted2 = strat.sortByUrgency([lowSameDeadline, highSameDeadline]);
    const tiebreakerOk = sorted2[0] === highSameDeadline && sorted2[1] === lowSameDeadline;
    console.log(
        `[sortByUrgencyTest] Same-deadline tiebreaker (HIGH before LOW): ${tiebreakerOk ? 'PASS' : 'FAIL'}`,
    );
    if (!tiebreakerOk) pass = false;

    // --- Test 3: No-deadline events sorted by priority — HIGH before LOW ---
    const sorted3 = strat.sortByUrgency([lowNoDeadline, highNoDeadline]);
    const noDlOk = sorted3[0] === highNoDeadline && sorted3[1] === lowNoDeadline;
    console.log(
        `[sortByUrgencyTest] No-deadline priority order (HIGH before LOW): ${noDlOk ? 'PASS' : 'FAIL'}`,
    );
    if (!noDlOk) pass = false;

    // --- Test 4: Deadline-constrained events always precede no-deadline events ---
    const sorted4 = strat.sortByUrgency([lowNoDeadline, lowNearDeadline]);
    const dlBeforeNoDlOk = sorted4[0] === lowNearDeadline && sorted4[1] === lowNoDeadline;
    console.log(
        `[sortByUrgencyTest] Deadline before no-deadline (LOW Apr7 before LOW no-DL): ${dlBeforeNoDlOk ? 'PASS' : 'FAIL'}`,
    );
    if (!dlBeforeNoDlOk) pass = false;

    console.log(`[sortByUrgencyTest] Overall: ${pass ? 'ALL PASS' : 'SOME FAILED'}`);
}

schedulerTest1();
sortByUrgencyTest();
