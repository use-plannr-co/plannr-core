import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/context/AppStateContext.js';
import { AppUpdateProvider, useAppUpdate } from './src/context/AppUpdateContext.js';
import { SubscriptionProvider } from './src/context/SubscriptionContext.js';
import { ChatProvider } from './src/context/ChatContext.js';
import TaskCompletionChecker from './src/notifications/TaskCompletionChecker.js';
import NotificationService from './src/notifications/NotificationService.js';
import 'react-native-gesture-handler';
import { Keyboard, TouchableWithoutFeedback, View, Alert, Linking, Platform } from 'react-native';

import RootNavigator from './src/navigation/RootNavigator.jsx';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from './cache.js';

const DismissKeyboardWrapper = ({ children }) => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
);

// Main app content component that has access to update context
const AppContent = () => {
    const { updateState, retryCheck } = useAppUpdate();

    // Show native alert when update is required
    React.useEffect(() => {
        if (updateState.forceUpdate && updateState.updateInfo) {
            const { updateInfo } = updateState;
            const message =
                updateInfo.message ||
                'Please update Plannr to the latest version to continue using the app.';

            const buttons = [
                {
                    text: 'Update Now',
                    style: 'default',
                    onPress: () => {
                        if (updateInfo.updateUrl) {
                            Linking.openURL(updateInfo.updateUrl);
                        } else {
                            // Fallback to app store
                            const appStoreUrl =
                                Platform.OS === 'ios'
                                    ? 'https://apps.apple.com/us/app/plannr-scheduling-made-easy/id6748265401'
                                    : 'https://play.google.com/store/apps/details?id=com.yourcompany.plannr';
                            Linking.openURL(appStoreUrl);
                        }
                    },
                },
            ];

            // Add retry button in development
            if (__DEV__ && retryCheck) {
                buttons.unshift({
                    text: 'Retry Check',
                    style: 'cancel',
                    onPress: retryCheck,
                });
            }

            Alert.alert(
                'Update Required',
                message,
                buttons,
                { cancelable: false }, // Cannot be dismissed
            );
        }
    }, [updateState.forceUpdate, updateState.updateInfo, retryCheck]);

    return (
        <View style={{ flex: 1 }}>
            <SubscriptionProvider>
                <AppStateProvider>
                    <ChatProvider>
                        <TaskCompletionChecker />
                        <SafeAreaProvider>
                            <RootNavigator />
                        </SafeAreaProvider>
                    </ChatProvider>
                </AppStateProvider>
            </SubscriptionProvider>
        </View>
    );
};

export default function App() {
    NotificationService.requestPermissions();

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ClerkProvider
                tokenCache={tokenCache}
                publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
            >
                <AppUpdateProvider>
                    <AppContent />
                </AppUpdateProvider>
            </ClerkProvider>
        </TouchableWithoutFeedback>
    );
}
