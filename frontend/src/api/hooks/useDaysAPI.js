import { useApiCore } from '../core/useApiCore.js';
import * as daysApi from '../modules/days.api.js';

export const useDaysAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        getDaysByScheduleId: (scheduleId) => daysApi.getDaysByScheduleId(makeAuthenticatedRequest, scheduleId),
        createDay: (scheduleId, dayData) => daysApi.createDay(makeAuthenticatedRequest, scheduleId, dayData),
        getDayById: (scheduleId, dayId, includeBlocks) => daysApi.getDayById(makeAuthenticatedRequest, scheduleId, dayId, includeBlocks),
        updateDay: (scheduleId, dayId, data) => daysApi.updateDay(makeAuthenticatedRequest, scheduleId, dayId, data),
        deleteDay: (scheduleId, dayId) => daysApi.deleteDay(makeAuthenticatedRequest, scheduleId, dayId),
    };
};
