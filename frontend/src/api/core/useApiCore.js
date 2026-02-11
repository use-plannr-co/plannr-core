import { useAuth, useUser } from '@clerk/clerk-expo';
import { makeAuthenticatedRequest as _makeAuthenticatedRequest, setGlobalUpdateHandler } from './apiCore.js';

/**
 * useApiCore
 *
 * React hook that binds Clerk auth context to the core makeAuthenticatedRequest
 * function. All domain hooks build on top of this.
 *
 * @returns {{ makeAuthenticatedRequest, userId, user, setGlobalUpdateHandler }}
 */
export const useApiCore = () => {
    const { getToken, userId } = useAuth();
    const { user } = useUser();

    const makeAuthenticatedRequest = (endpoint, options = {}) =>
        _makeAuthenticatedRequest(getToken, userId, endpoint, options);

    return {
        makeAuthenticatedRequest,
        getToken,
        userId,
        user,
        setGlobalUpdateHandler,
    };
};
