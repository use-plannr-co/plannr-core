import { useAuth, useUser } from '@clerk/clerk-expo';
import {
    makeAuthenticatedRequest as _makeAuthenticatedRequest,
    makeStreamingRequest as _makeStreamingRequest,
    setGlobalUpdateHandler,
} from './apiCore.js';

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

    const makeStreamingRequest = (endpoint, options, onEvent, onDone, onError) =>
        _makeStreamingRequest(getToken, userId, endpoint, options, onEvent, onDone, onError);

    return {
        makeAuthenticatedRequest,
        makeStreamingRequest,
        getToken,
        userId,
        user,
        setGlobalUpdateHandler,
    };
};
