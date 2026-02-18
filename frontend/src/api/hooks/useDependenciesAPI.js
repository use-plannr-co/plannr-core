import { useApiCore } from '../core/useApiCore.js';
import * as dependenciesApi from '../modules/dependencies.api.js';

export const useDependenciesAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        saveEventDependencies: (scheduleId, dependenciesMap) =>
            dependenciesApi.saveEventDependencies(
                makeAuthenticatedRequest,
                scheduleId,
                dependenciesMap,
            ),
        updateEventDependencies: (scheduleId, dependenciesId, dependenciesMap) =>
            dependenciesApi.updateEventDependencies(
                makeAuthenticatedRequest,
                scheduleId,
                dependenciesId,
                dependenciesMap,
            ),
        getEventDependencies: (scheduleId) =>
            dependenciesApi.getEventDependencies(makeAuthenticatedRequest, scheduleId),
    };
};
