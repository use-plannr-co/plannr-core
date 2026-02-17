import axios from 'axios';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // Base delay in ms

class GraphClient {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.client = axios.create({
            baseURL: GRAPH_BASE_URL,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 30000, // 30 seconds timeout
        });

        // Setup response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => this.handleError(error)
        );
    }

    /**
     * Handle API errors with proper error messages
     */
    handleError(error) {
        if (!error.response) {
            throw new Error(`Network error: ${error.message}`);
        }

        const { status, data } = error.response;
        const errorMessage = data?.error?.message || `HTTP ${status}`;

        switch (status) {
            case 401:
                throw new Error('Access token expired or invalid');
            case 403:
                throw new Error('Insufficient permissions to access Microsoft Graph');
            case 404:
                throw new Error('Resource not found');
            case 429:
                throw new Error('Rate limit exceeded');
            case 500:
            case 502:
            case 503:
            case 504:
                throw new Error(`Microsoft Graph server error: ${errorMessage}`);
            default:
                throw new Error(`Microsoft Graph API error: ${errorMessage}`);
        }
    }

    /**
     * Retry wrapper for API calls with exponential backoff
     */
    async retryRequest(requestFn, retries = MAX_RETRIES) {
        try {
            return await requestFn();
        } catch (error) {
            if (retries > 0 && this.isRetryableError(error)) {
                const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.retryRequest(requestFn, retries - 1);
            }
            throw error;
        }
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        if (!error.response) return true; // Network errors are retryable
        const status = error.response.status;
        return status >= 500 || status === 429; // Server errors and rate limiting
    }

    /**
     * Get user profile
     */
    async getUserProfile() {
        return this.retryRequest(async () => {
            const response = await this.client.get('/me');
            return response.data;
        });
    }

    /**
     * Get all task lists with pagination support
     */
    async getTaskLists() {
        const taskLists = [];
        let nextLink = '/me/todo/lists';

        while (nextLink) {
            const response = await this.retryRequest(async () => {
                const url = nextLink.startsWith('http') ? nextLink : nextLink;
                return this.client.get(url);
            });

            const data = response.data;
            taskLists.push(...data.value);
            nextLink = data['@odata.nextLink'];
        }

        return taskLists;
    }

    /**
     * Get tasks from a specific list with pagination support
     */
    async getTasks(listId, includeCompleted = true) {
        const tasks = [];
        let nextLink = `/me/todo/lists/${listId}/tasks`;

        // Add filter for incomplete tasks if needed
        if (!includeCompleted) {
            nextLink += "?$filter=status ne 'completed'";
        }

        // Always expand linkedResources for attachments/links
        const separator = nextLink.includes('?') ? '&' : '?';
        nextLink += `${separator}$expand=linkedResources`;

        while (nextLink) {
            const response = await this.retryRequest(async () => {
                const url = nextLink.startsWith('http') ? nextLink : nextLink;
                return this.client.get(url);
            });

            const data = response.data;
            tasks.push(...data.value);
            nextLink = data['@odata.nextLink'];
        }

        return tasks;
    }

    /**
     * Get calendar events for schedule conflict detection
     */
    async getCalendarEvents(startDate, endDate) {
        const events = [];
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        let nextLink = `/me/calendar/calendarView?startDateTime=${startISO}&endDateTime=${endISO}`;

        while (nextLink) {
            const response = await this.retryRequest(async () => {
                const url = nextLink.startsWith('http') ? nextLink : nextLink;
                return this.client.get(url);
            });

            const data = response.data;
            events.push(...data.value);
            nextLink = data['@odata.nextLink'];
        }

        return events;
    }

    /**
     * Get multiple calendars if needed
     */
    async getCalendars() {
        return this.retryRequest(async () => {
            const response = await this.client.get('/me/calendars');
            return response.data.value;
        });
    }

    /**
     * Test connection and permissions
     */
    async testConnection() {
        try {
            // Test basic profile access
            const profile = await this.getUserProfile();

            // Test task list access
            const taskLists = await this.getTaskLists();

            // Test calendar access
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const events = await this.getCalendarEvents(now, tomorrow);

            return {
                success: true,
                profile: {
                    id: profile.id,
                    displayName: profile.displayName,
                    email: profile.mail || profile.userPrincipalName,
                },
                permissions: {
                    tasksRead: taskLists.length >= 0,
                    calendarsRead: events.length >= 0,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

export default GraphClient;
