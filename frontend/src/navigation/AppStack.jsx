import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import NavigationBar from '../components/NavigationBar.jsx';
import FABChatButton from '../components/chat/FABChatButton.jsx';

import HomeScreen from '../screens/HomeScreen';
import TodaysTasksScreen from '../screens/TodaysTasksScreen';
import UserProfileStack from './UserProfileStack.jsx';
import SchedulingCenterScreen from '../screens/SchedulingCenterScreen.jsx';
import GenerateScheduleScreen from '../screens/GenerateScheduleScreen.jsx';
import ScheduleViewScreen from '../screens/ScheduleViewScreen.jsx';
import ChatScreen from '../screens/ChatScreen.jsx';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const navigation = useNavigation();
    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                screenOptions={{ headerShown: false }}
                tabBar={(props) => <NavigationBar {...props} />}
            >
                <Tab.Screen name="Home" component={HomeScreen} />
                <Tab.Screen name="Tasks" component={TodaysTasksScreen} />
                <Tab.Screen name="Center" component={SchedulingCenterScreen} />
                <Tab.Screen name="Profile" component={UserProfileStack} />
            </Tab.Navigator>
            <FABChatButton onPress={() => navigation.navigate('Chat')} />
        </View>
    );
};

export default function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="View" component={ScheduleViewScreen} />
            <Stack.Screen name="Generate" component={GenerateScheduleScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    );
}
