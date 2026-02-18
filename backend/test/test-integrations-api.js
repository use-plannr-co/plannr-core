import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/integrations`;

// You'll need to replace this with a valid session token for testing
const TEST_SESSION_TOKEN = 'your_test_session_token_here';

const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TEST_SESSION_TOKEN}`,
    'x-clerk-user-id': 'your_test_clerk_user_id_here', // Add this header to match existing pattern
};

/**
 * Test Google Calendar integration endpoints
 */
const testIntegrations = async () => {
    console.log('🧪 Testing Integrations API...\n');

    try {
        // Test 1: Get Google Calendar status
        console.log('1. Testing GET /integrations/google-calendar/status');
        try {
            const statusResponse = await axios.get(`${API_BASE}/google-calendar/status`, {
                headers,
            });
            console.log('✅ Status check successful:', statusResponse.data);
        } catch (error) {
            console.log('❌ Status check error:', error.response?.data || error.message);
        }

        console.log('');

        // Test 2: Export sample events to Google Calendar
        console.log('2. Testing POST /integrations/google-calendar/export');

        const sampleEvents = {
            events: [
                {
                    uid: 'test-event-1',
                    title: 'Test Meeting from Plannr',
                    description: 'This is a test event created by Plannr integration',
                    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                    end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
                    timeZone: 'America/Vancouver',
                },
                {
                    uid: 'test-event-2',
                    title: 'Another Test Event',
                    description: 'Second test event',
                    start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
                    end: new Date(Date.now() + 48 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Day after tomorrow + 30 mins
                    timeZone: 'America/Vancouver',
                },
            ],
        };

        try {
            const exportResponse = await axios.post(
                `${API_BASE}/google-calendar/export`,
                sampleEvents,
                { headers }
            );
            console.log('✅ Export successful:', exportResponse.data);
        } catch (error) {
            console.log('❌ Export error:', error.response?.data || error.message);
        }
    } catch (error) {
        console.error('❌ Test setup error:', error.message);
    }
};

/**
 * Test validation errors
 */
const testValidation = async () => {
    console.log('\n🧪 Testing Validation...\n');

    try {
        // Test invalid event data
        console.log('3. Testing validation with invalid data');

        const invalidEvents = {
            events: [
                {
                    // Missing uid
                    title: 'Invalid Event',
                    start: 'invalid-date',
                    end: 'invalid-date',
                },
            ],
        };

        try {
            await axios.post(`${API_BASE}/google-calendar/export`, invalidEvents, { headers });
            console.log('❌ Should have failed validation');
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('✅ Validation error caught correctly:', error.response.data);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }
    } catch (error) {
        console.error('❌ Validation test error:', error.message);
    }
};

// Run tests
const runTests = async () => {
    console.log('🚀 Starting Google Calendar Integration Tests\n');
    console.log('⚠️  Make sure to replace TEST_SESSION_TOKEN with a valid Clerk session token\n');

    if (TEST_SESSION_TOKEN === 'your_test_session_token_here') {
        console.log(
            '❌ Please update TEST_SESSION_TOKEN in the test file with a valid session token'
        );
        return;
    }

    await testIntegrations();
    await testValidation();

    console.log('\n✨ Tests completed!');
};

runTests().catch(console.error);
