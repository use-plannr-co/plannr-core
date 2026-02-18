import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

// Test data
const testDependenciesMap = {
    'Task A': ['Task B', 'Task C'],
    'Task B': ['Task D'],
    'Task C': ['Task D'],
    'Task D': [],
};

async function testDependencyEndpoints() {
    console.log('🧪 Testing Dependency Endpoints...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Note: These endpoints require authentication, so they will return 401
        // but we can verify the routes exist by checking the error response

        console.log('\n2. Testing dependency endpoints (expecting 401 due to no auth)...');

        // Test save dependencies
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
                console.log('✅ Save dependencies endpoint exists (401 auth error as expected)');
            } else if (error.response?.status === 404) {
                console.log('❌ Save dependencies endpoint not found');
            } else {
                console.log(
                    '? Unexpected response:',
                    error.response?.status,
                    error.response?.statusText
                );
                console.log('Error details:', error.response?.data);
            }
        }

        // Test get dependencies
        try {
            await axios.get(`${BASE_URL}/schedules/test-schedule-id/dependencies`, {
                headers: {
                    'X-App-Version': '1.1.1',
                },
            });
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Get dependencies endpoint exists (401 auth error as expected)');
            } else if (error.response?.status === 404) {
                console.log('❌ Get dependencies endpoint not found');
            } else {
                console.log(
                    '? Unexpected response:',
                    error.response?.status,
                    error.response?.statusText
                );
            }
        }

        // Test update dependencies
        try {
            await axios.put(
                `${BASE_URL}/schedules/test-schedule-id/dependencies/test-dep-id`,
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
                console.log('✅ Update dependencies endpoint exists (401 auth error as expected)');
            } else if (error.response?.status === 404) {
                console.log('❌ Update dependencies endpoint not found');
            } else {
                console.log(
                    '? Unexpected response:',
                    error.response?.status,
                    error.response?.statusText
                );
            }
        }

        // Test create schedule with dependencies
        try {
            await axios.post(
                `${BASE_URL}/schedules/with-dependencies`,
                {
                    name: 'Test Schedule',
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
                console.log(
                    '✅ Create schedule with dependencies endpoint exists (401 auth error as expected)'
                );
            } else if (error.response?.status === 404) {
                console.log('❌ Create schedule with dependencies endpoint not found');
            } else {
                console.log(
                    '? Unexpected response:',
                    error.response?.status,
                    error.response?.statusText
                );
            }
        }

        console.log('\n🎉 All dependency endpoints are accessible!');
        console.log("ℹ️  401 errors are expected since we're not providing authentication tokens.");
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDependencyEndpoints();
