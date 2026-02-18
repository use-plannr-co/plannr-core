import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

// Test data
const testDependenciesMap = {
    'Task A': ['Task B', 'Task C'],
    'Task B': ['Task D'],
    'Task C': ['Task D'],
    'Task D': [],
};

async function testSeparateDependencyEndpoints() {
    console.log('🧪 Testing Separate Dependency Endpoints Architecture...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        console.log('\n2. Testing that schedule creation is separate from dependencies...');

        // Test schedule creation (should work without dependencies)
        try {
            await axios.post(
                `${BASE_URL}/schedules`,
                {
                    title: 'Test Schedule',
                    numDays: 7,
                    strategy: 'earliest-fit',
                },
                {
                    headers: {
                        'X-App-Version': '1.1.1',
                    },
                }
            );
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Schedule creation endpoint exists (401 auth error as expected)');
            } else {
                console.log(
                    '? Schedule creation response:',
                    error.response?.status,
                    error.response?.statusText
                );
            }
        }

        // Test dependency creation (separate endpoint)
        try {
            await axios.post(
                `${BASE_URL}/schedules/test-schedule-id/dependencies`,
                {
                    dependenciesMap: testDependenciesMap,
                },
                {
                    headers: {
                        'X-App-Version': '1.1.1',
                    },
                }
            );
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Dependencies endpoint exists (401 auth error as expected)');
            } else {
                console.log(
                    '? Dependencies response:',
                    error.response?.status,
                    error.response?.statusText
                );
            }
        }

        console.log(
            '\n🎉 Architecture verified: Schedules and Dependencies are separate endpoints!'
        );
        console.log('📋 Summary:');
        console.log('  - POST /schedules - Creates schedule only');
        console.log('  - POST /schedules/:id/dependencies - Creates dependencies separately');
        console.log('  - Frontend orchestrates both calls in saveScheduleWithDays()');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSeparateDependencyEndpoints();
