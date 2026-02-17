import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createStackNavigator();

export default function OnboardingStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Onboarding">
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
    );
}
