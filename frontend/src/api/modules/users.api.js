/**
 * Users API module
 * Plain functions — receive makeAuthenticatedRequest (and optionally auth context) as arguments.
 */

export const getUserProfile = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/users/profile');

export const updateUserProfile = (makeAuthenticatedRequest, data) =>
    makeAuthenticatedRequest('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const updateUserEmail = (makeAuthenticatedRequest, data) =>
    makeAuthenticatedRequest('/api/users/email', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const updateAvatar = (makeAuthenticatedRequest, avatarName) =>
    makeAuthenticatedRequest('/api/users/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatarName }),
    });

export const markOnboardingComplete = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/users/onboarding/complete', {
        method: 'POST',
    });

export const deleteUserAccount = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/users/account', {
        method: 'DELETE',
    });

/**
 * Sync user to backend from Clerk token/user data.
 * Requires getToken and user in addition to makeAuthenticatedRequest.
 */
export const syncUserToBackend = async (makeAuthenticatedRequest, getToken, user) => {
    console.log('=== Starting syncUserToBackend ===');

    const token = await getToken();

    if (!token) {
        throw new Error('No authentication token available');
    }

    let userIdFromToken = null;
    let userEmail = null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
        );

        const payload = JSON.parse(jsonPayload);
        userIdFromToken = payload.sub || payload.user_id || payload.id;
        userEmail = payload.email;
    } catch (decodeError) {
        console.error('Failed to decode token:', decodeError);
    }

    const currentUserId = userIdFromToken;
    if (!currentUserId) {
        throw new Error('No user ID available after authentication');
    }

    const userData = { clerkUserId: currentUserId };

    if (userEmail) {
        userData.email = userEmail;
    }

    if (user) {
        if (user.emailAddresses?.[0]?.emailAddress) {
            userData.email = user.emailAddresses[0].emailAddress;
        }
        if (user.firstName || user.lastName) {
            userData.displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
    }

    return makeAuthenticatedRequest('/api/users/sync', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};
