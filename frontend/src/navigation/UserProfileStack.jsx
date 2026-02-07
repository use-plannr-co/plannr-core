import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import UserProfileScreen from '../screens/UserProfileScreen.jsx';
import SavedSchedulesScreen from '../screens/SavedSchedulesScreen.jsx';
import ManageAccountScreen from '../screens/ManageAccountScreen.jsx';
import ProductivityAnalyticsScreen from '../screens/ProductivityAnalyticsScreen.jsx';
import ProPaywallScreen from '../screens/ProPaywallScreen.jsx';

const Stack = createStackNavigator();

export default function UserProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="UserProfile"
    >
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="SavedSchedules" component={SavedSchedulesScreen} />
      <Stack.Screen name="ManageAccount" component={ManageAccountScreen} />
      <Stack.Screen name="ProductivityAnalytics" component={ProductivityAnalyticsScreen} />
      <Stack.Screen name="ProPaywall" component={ProPaywallScreen} />
    </Stack.Navigator>
  );
}
