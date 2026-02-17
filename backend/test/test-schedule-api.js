#!/usr/bin/env node

/**
 * Comprehensive API Test for Days Table Architecture
 * Using actual Schedule/Day/TimeBlock structure from frontend SchedulingTest.js
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import frontend models
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendPath = join(__dirname, '../frontend/src/model');

// Import all required frontend classes
let Scheduler,
    ScheduleDate,
    RigidEvent,
    FlexibleEvent,
    Break,
    EventDependencies,
    ActivityType,
    Priority,
    CircularDependencyError;

// Load all frontend model classes
async function loadFrontendModels() {
    try {
        const [
            schedulerModule,
            scheduleDateModule,
            rigidEventModule,
            flexibleEventModule,
            breakModule,
            eventDependenciesModule,
            activityTypeModule,
            priorityModule,
            circularDependencyErrorModule,
        ] = await Promise.all([
            import(`${frontendPath}/Scheduler.js`),
            import(`${frontendPath}/ScheduleDate.js`),
            import(`${frontendPath}/RigidEvent.js`),
            import(`${frontendPath}/FlexibleEvent.js`),
            import(`${frontendPath}/Break.js`),
            import(`${frontendPath}/EventDependencies.js`),
            import(`${frontendPath}/ActivityType.js`),
            import(`${frontendPath}/Priority.js`),
            import(`${frontendPath}/exceptions/CircularDependencyError.js`),
        ]);

        Scheduler = schedulerModule.default;
        ScheduleDate = scheduleDateModule.default;
        RigidEvent = rigidEventModule.default;
        FlexibleEvent = flexibleEventModule.default;
        Break = breakModule.default;
        EventDependencies = eventDependenciesModule.default;
        ActivityType = activityTypeModule.default;
        Priority = priorityModule.default;
        CircularDependencyError = circularDependencyErrorModule.default;

        console.log('✅ Frontend models loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to load frontend models:', error.message);
        return false;
    }
}

const BASE_URL = 'http://localhost:5001/api';
const TEST_USER_ID = 'user_37m6QCP5Gx0wCdUi6XeSYUPXnuR';

// Get the actual schedule data from the frontend test using proper class constructors
async function getScheduleObject() {
    const scheduler = new Scheduler(7, new ScheduleDate(4, 1, 2026), 'Sunday', 30, 6);

    // --- Rigid Events ---
    const rigidEvents = [
        new RigidEvent(
            'Church Visit',
            ActivityType.PERSONAL,
            60,
            new ScheduleDate(4, 1, 2026),
            1000,
            1100
        ),
        new RigidEvent(
            'Math Midterm',
            ActivityType.EDUCATION,
            120,
            new ScheduleDate(5, 1, 2026),
            1000,
            1200
        ),
        new RigidEvent(
            'Physio Checkup',
            ActivityType.PERSONAL,
            30,
            new ScheduleDate(6, 1, 2026),
            900,
            930
        ),
        new RigidEvent(
            'Team Workshop',
            ActivityType.WORK,
            120,
            new ScheduleDate(7, 1, 2026),
            1400,
            1600
        ),
        new RigidEvent(
            'Chemistry Quiz',
            ActivityType.EDUCATION,
            60,
            new ScheduleDate(7, 1, 2026),
            900,
            1000
        ),
        new RigidEvent(
            'Staff Meeting',
            ActivityType.WORK,
            60,
            new ScheduleDate(8, 1, 2026),
            1100,
            1200
        ),
        new RigidEvent(
            'Manager Check-In',
            ActivityType.WORK,
            30,
            new ScheduleDate(8, 1, 2026),
            1500,
            1530
        ),
        new RigidEvent(
            'Final Presentation',
            ActivityType.WORK,
            60,
            new ScheduleDate(9, 1, 2026),
            1500,
            1600
        ),
        new RigidEvent(
            'Dinner Party',
            ActivityType.PERSONAL,
            120,
            new ScheduleDate(10, 1, 2026),
            1900,
            2100
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
            new ScheduleDate(5, 1, 2026)
        ),
        new FlexibleEvent(
            'Fill Health Journal',
            ActivityType.PERSONAL,
            30,
            Priority.LOW,
            new ScheduleDate(6, 1, 2026)
        ),
        new FlexibleEvent(
            'Slide Draft',
            ActivityType.WORK,
            60,
            Priority.MEDIUM,
            new ScheduleDate(7, 1, 2026)
        ),
        new FlexibleEvent(
            'Write Research Notes',
            ActivityType.EDUCATION,
            45,
            Priority.MEDIUM,
            new ScheduleDate(8, 1, 2026)
        ),
        new FlexibleEvent(
            'Data Cleaning',
            ActivityType.WORK,
            30,
            Priority.LOW,
            new ScheduleDate(8, 1, 2026)
        ),
        new FlexibleEvent(
            'Weekly Planning',
            ActivityType.PERSONAL,
            20,
            Priority.LOW,
            new ScheduleDate(10, 1, 2026)
        ),
        new FlexibleEvent(
            'Report Draft',
            ActivityType.WORK,
            90,
            Priority.HIGH,
            new ScheduleDate(9, 1, 2026)
        ),
        new FlexibleEvent(
            'Design Mockups',
            ActivityType.WORK,
            60,
            Priority.MEDIUM,
            new ScheduleDate(9, 1, 2026)
        ),
        new FlexibleEvent(
            'Proofread Notes',
            ActivityType.EDUCATION,
            30,
            Priority.LOW,
            new ScheduleDate(9, 1, 2026)
        ),
        new FlexibleEvent(
            'Buy Gifts',
            ActivityType.PERSONAL,
            45,
            Priority.LOW,
            new ScheduleDate(10, 1, 2026)
        ),
        new FlexibleEvent(
            'Reflective Essay',
            ActivityType.EDUCATION,
            60,
            Priority.HIGH,
            new ScheduleDate(10, 1, 2026)
        ),
        new FlexibleEvent(
            'Meditation Session',
            ActivityType.PERSONAL,
            30,
            Priority.LOW,
            new ScheduleDate(4, 1, 2026)
        ),
        new FlexibleEvent(
            'Read Case Studies',
            ActivityType.EDUCATION,
            60,
            Priority.MEDIUM,
            new ScheduleDate(7, 1, 2026)
        ),
        new FlexibleEvent(
            'Finalize Budget',
            ActivityType.WORK,
            40,
            Priority.MEDIUM,
            new ScheduleDate(9, 1, 2026)
        ),
        new FlexibleEvent(
            'Email Follow-Ups',
            ActivityType.WORK,
            30,
            Priority.LOW,
            new ScheduleDate(8, 1, 2026)
        ),
        new FlexibleEvent(
            'Packing Checklist',
            ActivityType.PERSONAL,
            20,
            Priority.LOW,
            new ScheduleDate(10, 1, 2026)
        ),
    ];
    flexibleEvents.forEach((e) => scheduler.addFlexibleEvent(e));

    // --- Breaks ---
    scheduler.addBreak(new ScheduleDate(5, 1, 2026), new Break(30, 1300, 1330));
    scheduler.addBreak(new ScheduleDate(7, 1, 2026), new Break(30, 1200, 1230));
    scheduler.addBreak(new ScheduleDate(8, 1, 2026), new Break(30, 1000, 1030));
    scheduler.addBreak(new ScheduleDate(9, 1, 2026), new Break(30, 900, 930));
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

    // Generate the "Earliest Fit" schedule
    const schedule = scheduler.createSchedules('Earliest Fit', 800, 1700);

    console.log(`📊 Generated Schedule object:`, schedule.constructor.name);

    // Get the days array from the Schedule object's internal schedule Map
    const daysArray = [];
    const scheduleMap = schedule.getSchedule();
    const allDates = schedule.getAllDatesInOrder();

    for (const dateId of allDates) {
        const daySchedule = scheduleMap.get(dateId);
        daysArray.push(daySchedule);
    }

    console.log(`📈 Extracted ${daysArray.length} day schedules`);
    console.log(
        `📈 Total blocks across all days: ${daysArray.reduce((total, day) => total + day.getTimeBlocks().length, 0)}`
    );

    return daysArray;
}

// Convert Schedule object to API format
function convertScheduleToAPIFormat(daysArray) {
    const scheduleData = {
        title: 'Comprehensive Test Schedule - Earliest Fit',
        ownerId: TEST_USER_ID,
        isActive: true,
        numDays: daysArray.length,
        minGap: 30,
        workingHoursLimit: 6,
        strategy: 'earliest-fit',
        startTime: 800,
        endTime: 1700,
        day1Date: daysArray[0].getDate(),
        day1Day: daysArray[0].getDay(),
        metadata: {
            testGenerated: true,
            strategy: 'Earliest Fit',
            totalBlocks: daysArray.reduce((total, day) => total + day.getTimeBlocks().length, 0),
            sourceTest: 'SchedulingTest.js',
        },
    };

    const daysData = daysArray.map((daySchedule, index) => {
        const timeBlocks = daySchedule.getTimeBlocks();
        const dayData = {
            dayNumber: index + 1,
            dayName: daySchedule.getDay(),
            date: formatDateToISO(daySchedule.getDate()),
            dateObject: daySchedule.getDate(),
            isWeekend: daySchedule.getDay() === 'Saturday' || daySchedule.getDay() === 'Sunday',
            minGap: daySchedule.getMinGap(),
            workingHoursLimit: daySchedule.getWorkingHoursLimit(),
            metadata: {
                dayType:
                    daySchedule.getDay() === 'Saturday' || daySchedule.getDay() === 'Sunday'
                        ? 'weekend'
                        : 'weekday',
                totalBlocks: timeBlocks.length,
                events: daySchedule.getEvents().length,
                breaks: daySchedule.getBreaks().length,
            },
            timeBlocks: timeBlocks.map((block) => ({
                type: block.type,
                title: block.getName(), // Map 'name' to 'title' for API
                startAt: block.getStartTime().toInt(),
                endAt: block.getEndTime().toInt(),
                blockDate: formatDateToISO(block.getDate()),
                category: block.getActivityType(),
                priority: block.priority,
                deadline: block.deadline
                    ? typeof block.deadline === 'object'
                        ? formatDateToISO(block.deadline)
                        : block.deadline
                    : undefined,
                duration: block.duration,
                completed: block.completed || false,
                metadata: {
                    activityType: block.getActivityType(),
                    priority: block.priority,
                    deadline: block.deadline
                        ? typeof block.deadline === 'object'
                            ? formatDateToISO(block.deadline)
                            : block.deadline
                        : undefined,
                    duration: block.duration,
                    frontendId: `${block.type}-${block.getName().toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
                    originalBlock: true,
                },
            })),
        };
        return dayData;
    });

    return { schedule: scheduleData, days: daysData };
}

// Helper function to format ScheduleDate to ISO string
function formatDateToISO(scheduleDate) {
    const year = scheduleDate.year;
    const month = scheduleDate.month.toString().padStart(2, '0');
    const day = scheduleDate.date.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper functions
const makeRequest = async (method, url, data = null, headers = {}) => {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': TEST_USER_ID,
            ...headers,
        },
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${url}`, config);
    const result = await response.json();

    return {
        status: response.status,
        success: response.ok,
        data: result,
    };
};

const logTest = (testName, success, details = '') => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
};

// Main test function
async function runComprehensiveAPITest() {
    console.log('🚀 Starting Comprehensive API Test for Days Table Architecture');
    console.log('📊 Using "Earliest Fit" schedule data from SchedulingTest.js');
    console.log('='.repeat(60));

    let scheduleId,
        dayIds = [],
        blockIds = [];
    let passedTests = 0,
        totalTests = 0;

    try {
        // Load frontend models first
        console.log('\n🔧 Loading frontend models...');
        const modelsLoaded = await loadFrontendModels();
        if (!modelsLoaded) {
            console.error('❌ Cannot proceed without frontend models');
            return;
        }

        // Generate actual schedule using frontend models
        console.log('\n📊 Generating schedule using frontend models...');
        const frontendDaysArray = await getScheduleObject();
        const { schedule: testScheduleData, days: testDaysData } =
            convertScheduleToAPIFormat(frontendDaysArray);

        console.log(`✅ Generated schedule with ${testDaysData.length} days`);
        console.log(
            `📈 Total blocks: ${testDaysData.reduce((total, day) => total + day.timeBlocks.length, 0)}`
        );

        // 1. Create Schedule
        totalTests++;
        console.log('\n📝 TEST 1: Creating schedule...');
        const scheduleResponse = await makeRequest('POST', '/schedules', testScheduleData, {
            'X-App-Version': '1.1.1',
        });

        if (scheduleResponse.success) {
            scheduleId = scheduleResponse.data.data.id;
            logTest('Schedule Creation', true, `ID: ${scheduleId}`);
            passedTests++;
        } else {
            logTest('Schedule Creation', false, scheduleResponse.data.message);
            return;
        }

        // 2. Create Days for Schedule
        totalTests++;
        console.log('\n📅 TEST 2: Creating days for schedule...');

        for (const dayData of testDaysData) {
            const response = await makeRequest('POST', `/schedules/${scheduleId}/days`, dayData, {
                'X-App-Version': '1.1.1',
            });

            if (response.success) {
                dayIds.push({
                    id: response.data.data.id,
                    dayName: dayData.dayName,
                    blocks: dayData.timeBlocks,
                });
            } else {
                logTest(`Day Creation (${dayData.dayName})`, false, response.data.message);
                return;
            }
        }

        logTest('All Days Creation', true, `Created ${dayIds.length} days`);
        passedTests++;

        // 3. Get All Days for Schedule
        totalTests++;
        console.log('\n📋 TEST 3: Retrieving all days...');
        const daysResponse = await makeRequest('GET', `/schedules/${scheduleId}/days`, null, {
            'X-App-Version': '1.1.1',
        });

        if (daysResponse.success && daysResponse.data.data.length === 7) {
            logTest('Get All Days', true, `Retrieved ${daysResponse.data.data.length} days`);
            passedTests++;
        } else {
            logTest(
                'Get All Days',
                false,
                `Expected 7 days, got ${daysResponse.data.data?.length || 0}`
            );
        }

        // 4. Create Blocks for Each Day
        totalTests++;
        console.log('\n🧱 TEST 4: Creating blocks for each day...');
        let totalBlocksCreated = 0;

        for (const day of dayIds) {
            const blocksData = { blocks: day.blocks };
            console.log(`📦 Creating blocks for ${day.dayName}: ${day.blocks.length} blocks`);
            console.log(`📝 First block sample:`, JSON.stringify(day.blocks[0], null, 2));

            const response = await makeRequest(
                'POST',
                `/schedules/${scheduleId}/days/${day.id}/blocks`,
                blocksData,
                {
                    'X-App-Version': '1.1.1',
                }
            );

            if (response.success) {
                const createdBlocks = response.data.data;
                totalBlocksCreated += createdBlocks.length;
                blockIds.push(...createdBlocks.map((b) => b.id));
                console.log(`✅ Created ${createdBlocks.length} blocks for ${day.dayName}`);
            } else {
                console.error(
                    `❌ Error creating blocks for ${day.dayName}:`,
                    JSON.stringify(response.data, null, 2)
                );
                logTest(`Blocks Creation (${day.dayName})`, false, response.data.message);
                return;
            }
        }

        if (totalBlocksCreated === 36) {
            logTest(
                'All Blocks Creation',
                true,
                `Created ${totalBlocksCreated} blocks across all days`
            );
            passedTests++;
        } else {
            logTest(
                'All Blocks Creation',
                false,
                `Expected 36 blocks, created ${totalBlocksCreated}`
            );
        }

        // 5. Test Day-Specific Block Retrieval
        totalTests++;
        console.log('\n🔍 TEST 5: Testing day-specific block retrieval...');

        const firstDay = dayIds[0];
        const dayBlocksResponse = await makeRequest(
            'GET',
            `/schedules/${scheduleId}/days/${firstDay.id}/blocks`,
            null,
            {
                'X-App-Version': '1.1.1',
            }
        );

        if (dayBlocksResponse.success) {
            const blocksCount = dayBlocksResponse.data.data.length;
            const expectedCount = firstDay.blocks.length;

            if (blocksCount === expectedCount) {
                logTest(
                    'Day-Specific Blocks Retrieval',
                    true,
                    `Retrieved ${blocksCount} blocks for ${firstDay.dayName}`
                );
                passedTests++;
            } else {
                logTest(
                    'Day-Specific Blocks Retrieval',
                    false,
                    `Expected ${expectedCount}, got ${blocksCount}`
                );
            }
        } else {
            logTest('Day-Specific Blocks Retrieval', false, dayBlocksResponse.data.message);
        }

        // 6. Test Individual Day Retrieval
        totalTests++;
        console.log('\n📊 TEST 6: Testing individual day retrieval...');

        const dayResponse = await makeRequest(
            'GET',
            `/schedules/${scheduleId}/days/${firstDay.id}?includeBlocks=true`,
            null,
            {
                'X-App-Version': '1.1.1',
            }
        );

        if (dayResponse.success && dayResponse.data.data.blocks) {
            logTest(
                'Individual Day Retrieval with Blocks',
                true,
                `Retrieved day with ${dayResponse.data.data.blocks.length} blocks`
            );
            passedTests++;
        } else {
            logTest('Individual Day Retrieval with Blocks', false, dayResponse.data.message);
        }

        // 7. Test Schedule with Days/Blocks Retrieval
        totalTests++;
        console.log('\n🗂️ TEST 7: Testing complete schedule retrieval...');

        const completeScheduleResponse = await makeRequest(
            'GET',
            `/schedules/${scheduleId}?includeBlocks=true`,
            null,
            {
                'X-App-Version': '1.1.1',
            }
        );

        if (completeScheduleResponse.success) {
            logTest('Complete Schedule Retrieval', true, `Retrieved schedule with blocks`);
            passedTests++;
        } else {
            logTest('Complete Schedule Retrieval', false, completeScheduleResponse.data.message);
        }

        // 8. Test Block Updates
        totalTests++;
        console.log('\n✏️ TEST 8: Testing block updates...');

        if (blockIds.length > 0 && dayIds.length > 0) {
            const firstBlockId = blockIds[0];
            const firstDayId = dayIds[0].id;
            const updateData = {
                title: 'Updated Test Block',
                completed: true,
                metadata: { updated: true },
            };

            const updateResponse = await makeRequest(
                'PUT',
                `/schedules/${scheduleId}/days/${firstDayId}/blocks/${firstBlockId}`,
                updateData,
                {
                    'X-App-Version': '1.1.1',
                }
            );

            if (updateResponse.success) {
                logTest('Block Update', true, 'Successfully updated block');
                passedTests++;
            } else {
                logTest('Block Update', false, updateResponse.data.message);
            }
        }

        // 9. Test Day Updates
        totalTests++;
        console.log('\n📝 TEST 9: Testing day updates...');

        if (dayIds.length > 0) {
            const firstDayId = dayIds[0].id;
            const updateData = {
                metadata: { updated: true, testPassed: true },
                minGap: 45,
            };

            const updateResponse = await makeRequest(
                'PUT',
                `/schedules/${scheduleId}/days/${firstDayId}`,
                updateData,
                {
                    'X-App-Version': '1.1.1',
                }
            );

            if (updateResponse.success) {
                logTest('Day Update', true, 'Successfully updated day');
                passedTests++;
            } else {
                logTest('Day Update', false, updateResponse.data.message);
            }
        }

        // 10. Test Event Dependencies Integration
        totalTests++;
        console.log('\n🔗 TEST 10: Testing event dependencies integration...');

        // Create test dependencies map based on the events we have
        const testDependenciesMap = {
            'Study Math Chapters': ['Math Midterm'],
            'Fill Health Journal': ['Physio Checkup'],
            'Slide Draft': ['Write Research Notes'],
            'Report Draft': ['Slide Draft', 'Staff Meeting'],
            'Design Mockups': ['Slide Draft', 'Report Draft'],
            'Finalize Budget': ['Report Draft'],
            'Email Follow-Ups': ['Staff Meeting'],
            'Proofread Notes': ['Write Research Notes'],
            'Reflective Essay': ['Proofread Notes'],
            'Buy Gifts': ['Weekly Planning'],
            'Packing Checklist': ['Buy Gifts'],
        };

        // Test saving dependencies
        const dependenciesResponse = await makeRequest(
            'POST',
            `/schedules/${scheduleId}/dependencies`,
            {
                dependenciesMap: testDependenciesMap,
            },
            {
                'X-App-Version': '1.1.1',
            }
        );

        if (dependenciesResponse.success) {
            const dependenciesId = dependenciesResponse.data.data.id;
            logTest('Dependencies Creation', true, `ID: ${dependenciesId}`);

            // Test retrieving dependencies
            const getDepsResponse = await makeRequest(
                'GET',
                `/schedules/${scheduleId}/dependencies`,
                null,
                {
                    'X-App-Version': '1.1.1',
                }
            );

            if (getDepsResponse.success) {
                const retrievedDeps = getDepsResponse.data.data.dependenciesMap;
                const originalKeys = Object.keys(testDependenciesMap).length;
                const retrievedKeys = Object.keys(retrievedDeps).length;

                if (retrievedKeys === originalKeys) {
                    logTest(
                        'Dependencies Retrieval',
                        true,
                        `Retrieved ${retrievedKeys} dependency mappings`
                    );

                    // Test updating dependencies
                    const updatedDepsMap = {
                        ...testDependenciesMap,
                        'New Test Task': ['Study Math Chapters', 'Fill Health Journal'],
                    };

                    const updateDepsResponse = await makeRequest(
                        'PUT',
                        `/schedules/${scheduleId}/dependencies/${dependenciesId}`,
                        {
                            dependenciesMap: updatedDepsMap,
                        },
                        {
                            'X-App-Version': '1.1.1',
                        }
                    );

                    if (updateDepsResponse.success) {
                        logTest('Dependencies Update', true, 'Successfully updated dependencies');
                        passedTests++;
                    } else {
                        logTest('Dependencies Update', false, updateDepsResponse.data.message);
                    }
                } else {
                    logTest(
                        'Dependencies Retrieval',
                        false,
                        `Expected ${originalKeys}, got ${retrievedKeys}`
                    );
                }
            } else {
                logTest('Dependencies Retrieval', false, getDepsResponse.data.message);
            }
        } else {
            logTest('Dependencies Creation', false, dependenciesResponse.data.message);
        }

        // 11. Test Legacy Compatibility (scheduleId-based block creation)
        totalTests++;
        console.log('\n🔄 TEST 11: Testing legacy compatibility...');

        const legacyBlockData = {
            type: 'flexible',
            title: 'Legacy Test Block',
            startAt: 800,
            endAt: 900,
            category: 'WORK',
            blockDate: '2025-04-06',
            metadata: { legacy: true },
        };

        const legacyResponse = await makeRequest(
            'POST',
            `/schedules/${scheduleId}/blocks`,
            legacyBlockData,
            {
                'X-App-Version': '1.1.1',
            }
        );

        if (legacyResponse.success) {
            logTest('Legacy Block Creation', true, 'Auto-migrated to day-based structure');
            passedTests++;
        } else {
            logTest('Legacy Block Creation', false, legacyResponse.data.message);
        }
    } catch (error) {
        console.error('\n💥 Test suite encountered an error:', error.message);
    }

    // Final Results
    console.log('\n' + '=' * 60);
    console.log('📊 TEST SUMMARY');
    console.log('=' * 60);
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Days table architecture is working perfectly!');
    } else {
        console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }

    console.log('\n💾 Test Data Created:');
    console.log(`   Schedule ID: ${scheduleId}`);
    console.log(`   Days Created: ${dayIds.length}`);
    console.log(`   Blocks Created: ${blockIds.length}`);
}

// Check if server is running first
async function checkServer() {
    try {
        const response = await fetch(`${BASE_URL}/health`, { timeout: 5000 });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Run the test
(async () => {
    const serverRunning = await checkServer();

    if (!serverRunning) {
        console.error('❌ Server is not running on http://localhost:5001');
        console.log('Please start the backend server first:');
        console.log('cd backend && npm run dev');
        process.exit(1);
    }

    await runComprehensiveAPITest();
})();
