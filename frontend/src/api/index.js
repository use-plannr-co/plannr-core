import { useApiCore } from './core/useApiCore.js';
import { setGlobalUpdateHandler } from './core/apiCore.js';
import * as usersApi from './modules/users.api.js';
import * as schedulesApi from './modules/schedules.api.js';
import * as daysApi from './modules/days.api.js';
import * as blocksApi from './modules/blocks.api.js';
import * as dependenciesApi from './modules/dependencies.api.js';
import * as preferencesApi from './modules/preferences.api.js';
import * as integrationsApi from './modules/integrations.api.js';
import * as textToTasksApi from './modules/textToTasks.api.js';
import * as appStateApi from './modules/appState.api.js';

export { setGlobalUpdateHandler };

/**
 * useAuthenticatedAPI
 *
 * Backward-compatible hook that exposes all API functions under one object.
 * Existing code using `useAuthenticatedAPI` continues to work without changes.
 *
 * New code should prefer the domain-specific hooks in `api/hooks/` or import
 * plain functions from `api/modules/` directly.
 */
export const useAuthenticatedAPI = () => {
    const { makeAuthenticatedRequest, getToken, user } = useApiCore();

    return {
        // Core
        makeAuthenticatedRequest,

        // Users
        syncUserToBackend: () => usersApi.syncUserToBackend(makeAuthenticatedRequest, getToken, user),
        getUserProfile: () => usersApi.getUserProfile(makeAuthenticatedRequest),
        updateUserProfile: (data) => usersApi.updateUserProfile(makeAuthenticatedRequest, data),
        updateUserEmail: (data) => usersApi.updateUserEmail(makeAuthenticatedRequest, data),
        updateAvatar: (avatarName) => usersApi.updateAvatar(makeAuthenticatedRequest, avatarName),
        markOnboardingComplete: () => usersApi.markOnboardingComplete(makeAuthenticatedRequest),
        deleteUserAccount: () => usersApi.deleteUserAccount(makeAuthenticatedRequest),

        // Schedules
        getSchedules: () => schedulesApi.getSchedules(makeAuthenticatedRequest),
        createSchedule: (data) => schedulesApi.createSchedule(makeAuthenticatedRequest, data),
        getScheduleById: (id, includeBlocks) => schedulesApi.getScheduleById(makeAuthenticatedRequest, id, includeBlocks),
        updateSchedule: (id, data) => schedulesApi.updateSchedule(makeAuthenticatedRequest, id, data),
        deleteSchedule: (id) => schedulesApi.deleteSchedule(makeAuthenticatedRequest, id),
        saveScheduleWithDays: (scheduleObject, name, strategy, startTime, endTime) =>
            schedulesApi.saveScheduleWithDays(makeAuthenticatedRequest, scheduleObject, name, strategy, startTime, endTime),
        convertScheduleToAPIFormat: (scheduleObject) =>
            schedulesApi.convertScheduleToAPIFormat(scheduleObject),

        // Days
        getDaysByScheduleId: (scheduleId) => daysApi.getDaysByScheduleId(makeAuthenticatedRequest, scheduleId),
        createDay: (scheduleId, dayData) => daysApi.createDay(makeAuthenticatedRequest, scheduleId, dayData),
        getDayById: (scheduleId, dayId, includeBlocks) => daysApi.getDayById(makeAuthenticatedRequest, scheduleId, dayId, includeBlocks),
        updateDay: (scheduleId, dayId, data) => daysApi.updateDay(makeAuthenticatedRequest, scheduleId, dayId, data),
        deleteDay: (scheduleId, dayId) => daysApi.deleteDay(makeAuthenticatedRequest, scheduleId, dayId),

        // Blocks
        getBlocksByDayId: (scheduleId, dayId) => blocksApi.getBlocksByDayId(makeAuthenticatedRequest, scheduleId, dayId),
        addBlocksToDay: (scheduleId, dayId, blocks) => blocksApi.addBlocksToDay(makeAuthenticatedRequest, scheduleId, dayId, blocks),
        updateBlockInDay: (scheduleId, dayId, blockId, data) => blocksApi.updateBlockInDay(makeAuthenticatedRequest, scheduleId, dayId, blockId, data),
        deleteBlockFromDay: (scheduleId, dayId, blockId) => blocksApi.deleteBlockFromDay(makeAuthenticatedRequest, scheduleId, dayId, blockId),
        markBlockCompleteInDay: (scheduleId, dayId, blockId, completed) => blocksApi.markBlockCompleteInDay(makeAuthenticatedRequest, scheduleId, dayId, blockId, completed),

        // Dependencies
        saveEventDependencies: (scheduleId, dependenciesMap) =>
            dependenciesApi.saveEventDependencies(makeAuthenticatedRequest, scheduleId, dependenciesMap),
        updateEventDependencies: (scheduleId, dependenciesId, dependenciesMap) =>
            dependenciesApi.updateEventDependencies(makeAuthenticatedRequest, scheduleId, dependenciesId, dependenciesMap),
        getEventDependencies: (scheduleId) =>
            dependenciesApi.getEventDependencies(makeAuthenticatedRequest, scheduleId),

        // Preferences
        getPreferences: () => preferencesApi.getPreferences(makeAuthenticatedRequest),
        updatePreferences: (data) => preferencesApi.updatePreferences(makeAuthenticatedRequest, data),

        // Integrations
        checkGoogleCalendarStatus: () => integrationsApi.checkGoogleCalendarStatus(makeAuthenticatedRequest),
        exportScheduleToGoogleCalendar: (schedule, userTimezone, accessToken, scheduleName, userName) =>
            integrationsApi.exportScheduleToGoogleCalendar(makeAuthenticatedRequest, schedule, userTimezone, accessToken, scheduleName, userName),

        // Text-to-Tasks
        parseTextToFlexibleEvents: (todoListText, defaultDeadline, preferences) =>
            textToTasksApi.parseTextToFlexibleEvents(makeAuthenticatedRequest, todoListText, defaultDeadline, preferences),

        // App State (orchestration)
        loadCompleteAppStateWithSchedules: () =>
            appStateApi.loadCompleteAppStateWithSchedules(makeAuthenticatedRequest),
        loadScheduleFromDatabase: (scheduleId) =>
            appStateApi.loadScheduleFromDatabase(makeAuthenticatedRequest, scheduleId),
        loadScheduleObjectById: (scheduleId) =>
            appStateApi.loadScheduleObjectById(makeAuthenticatedRequest, scheduleId),
    };
};
