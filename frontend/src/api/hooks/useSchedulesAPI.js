import { useApiCore } from '../core/useApiCore.js';
import * as schedulesApi from '../modules/schedules.api.js';

export const useSchedulesAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        getSchedules: () => schedulesApi.getSchedules(makeAuthenticatedRequest),
        createSchedule: (data) => schedulesApi.createSchedule(makeAuthenticatedRequest, data),
        getScheduleById: (id, includeBlocks) =>
            schedulesApi.getScheduleById(makeAuthenticatedRequest, id, includeBlocks),
        updateSchedule: (id, data) =>
            schedulesApi.updateSchedule(makeAuthenticatedRequest, id, data),
        deleteSchedule: (id) => schedulesApi.deleteSchedule(makeAuthenticatedRequest, id),
        saveScheduleWithDays: (scheduleObject, name, strategy, startTime, endTime) =>
            schedulesApi.saveScheduleWithDays(
                makeAuthenticatedRequest,
                scheduleObject,
                name,
                strategy,
                startTime,
                endTime,
            ),
        convertScheduleToAPIFormat: (scheduleObject) =>
            schedulesApi.convertScheduleToAPIFormat(scheduleObject),
    };
};
