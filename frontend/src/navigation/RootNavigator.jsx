import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';

import { useAppState } from '../context/AppStateContext';
import LoadingScreen from '../screens/LoadingScreen.jsx';

import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import AppStack from './AppStack';

export default function RootNavigator() {
    const { isLoaded, isSignedIn } = useAuth();
    const { appState, storageLoaded } = useAppState();

    // Monitor authentication and storage state changes
    useEffect(() => {
        console.log('🔐 Auth State:', {
            isLoaded,
            isSignedIn,
            storageLoaded,
            onboarded: appState?.onboarded,
        });
    }, [isLoaded, isSignedIn, storageLoaded, appState?.onboarded]);

    return (
        <NavigationContainer>
            {!isLoaded || !storageLoaded ? (
                <LoadingScreen />
            ) : !isSignedIn ? (
                <AuthStack />
            ) : !appState?.onboarded ? (
                <OnboardingStack />
            ) : (
                <AppStack />
            )}
        </NavigationContainer>
    );
}
