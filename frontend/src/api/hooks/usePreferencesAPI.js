import { useApiCore } from '../core/useApiCore.js';
import * as preferencesApi from '../modules/preferences.api.js';

export const usePreferencesAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        getPreferences: () => preferencesApi.getPreferences(makeAuthenticatedRequest),
        updatePreferences: (data) =>
            preferencesApi.updatePreferences(makeAuthenticatedRequest, data),
    };
};
