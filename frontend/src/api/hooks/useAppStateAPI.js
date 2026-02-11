import { useApiCore } from '../core/useApiCore.js';
import * as appStateApi from '../modules/appState.api.js';

export const useAppStateAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        loadCompleteAppStateWithSchedules: () =>
            appStateApi.loadCompleteAppStateWithSchedules(makeAuthenticatedRequest),
        loadScheduleFromDatabase: (scheduleId) =>
            appStateApi.loadScheduleFromDatabase(makeAuthenticatedRequest, scheduleId),
        loadScheduleObjectById: (scheduleId) =>
            appStateApi.loadScheduleObjectById(makeAuthenticatedRequest, scheduleId),
    };
};
