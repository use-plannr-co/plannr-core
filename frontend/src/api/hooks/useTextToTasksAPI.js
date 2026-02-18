import { useApiCore } from '../core/useApiCore.js';
import * as textToTasksApi from '../modules/textToTasks.api.js';

export const useTextToTasksAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        parseTextToFlexibleEvents: (todoListText, defaultDeadline, preferences) =>
            textToTasksApi.parseTextToFlexibleEvents(
                makeAuthenticatedRequest,
                todoListText,
                defaultDeadline,
                preferences,
            ),
    };
};
