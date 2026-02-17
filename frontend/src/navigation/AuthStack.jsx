import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SignInScreen from '../auth/SignInScreen.jsx';
import SignUpScreen from '../auth/SignUpScreen.jsx';

const Stack = createStackNavigator();

export default function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SignUp">
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
        </Stack.Navigator>
    );
}
