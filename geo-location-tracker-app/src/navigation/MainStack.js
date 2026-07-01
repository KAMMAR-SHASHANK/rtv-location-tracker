import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import TrackerDashboard from '../screens/TrackerDashboard';
import LoginScreen from '../screens/LoginScreen';
import CitizenTrackerScreen from '../screens/CitizenTrackerScreen';

const Stack = createStackNavigator();

const MainStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Registration" component={RegistrationScreen} />
            <Stack.Screen name="TrackerDashboard" component={TrackerDashboard} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="CitizenTracker" component={CitizenTrackerScreen} />
        </Stack.Navigator>
    );
};

export default MainStack;
