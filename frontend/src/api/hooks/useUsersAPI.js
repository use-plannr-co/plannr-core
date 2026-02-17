import { useApiCore } from '../core/useApiCore.js';
import * as usersApi from '../modules/users.api.js';

export const useUsersAPI = () => {
    const { makeAuthenticatedRequest, getToken, user } = useApiCore();
    return {
        getUserProfile: () => usersApi.getUserProfile(makeAuthenticatedRequest),
        updateUserProfile: (data) => usersApi.updateUserProfile(makeAuthenticatedRequest, data),
        updateUserEmail: (data) => usersApi.updateUserEmail(makeAuthenticatedRequest, data),
        updateAvatar: (avatarName) => usersApi.updateAvatar(makeAuthenticatedRequest, avatarName),
        markOnboardingComplete: () => usersApi.markOnboardingComplete(makeAuthenticatedRequest),
        deleteUserAccount: () => usersApi.deleteUserAccount(makeAuthenticatedRequest),
        syncUserToBackend: () =>
            usersApi.syncUserToBackend(makeAuthenticatedRequest, getToken, user),
    };
};
