import { useApiCore } from '../core/useApiCore.js';
import * as integrationsApi from '../modules/integrations.api.js';

export const useIntegrationsAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        checkGoogleCalendarStatus: () =>
            integrationsApi.checkGoogleCalendarStatus(makeAuthenticatedRequest),
        exportScheduleToGoogleCalendar: (
            schedule,
            userTimezone,
            accessToken,
            scheduleName,
            userName,
        ) =>
            integrationsApi.exportScheduleToGoogleCalendar(
                makeAuthenticatedRequest,
                schedule,
                userTimezone,
                accessToken,
                scheduleName,
                userName,
            ),
    };
};
