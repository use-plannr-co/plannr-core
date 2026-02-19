import { useApiCore } from '../core/useApiCore.js';
import * as analyticsApi from '../modules/analytics.api.js';

export const useAnalyticsAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        getAnalytics: () => analyticsApi.getAnalytics(makeAuthenticatedRequest),
        submitMoodCheckin: (date, rating) =>
            analyticsApi.submitMoodCheckin(makeAuthenticatedRequest, date, rating),
    };
};
