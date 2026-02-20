import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore, useCallStore } from '../store';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import LiveCallScreen from '../screens/LiveCallScreen';
import CallDetailScreen from '../screens/CallDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#0D0D1A', borderBottomWidth: 1, borderBottomColor: '#1E1E35' },
                headerTintColor: '#FFF',
                tabBarStyle: { backgroundColor: '#0D0D1A', borderTopWidth: 1, borderTopColor: '#1E1E35' },
                tabBarActiveTintColor: '#6C5CE7',
                tabBarInactiveTintColor: '#555',
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Call History', tabBarLabel: 'Calls' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Preferences' }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { isAuthenticated } = useAuthStore();

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                // Auth Stack
                <Stack.Group>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </Stack.Group>
            ) : (
                // Main Stack
                <Stack.Group>
                    <Stack.Screen name="Main" component={MainTabs} />
                    <Stack.Screen
                        name="LiveCall"
                        component={LiveCallScreen}
                        options={{ presentation: 'fullScreenModal' }}
                    />
                    <Stack.Screen
                        name="CallDetail"
                        component={CallDetailScreen}
                        options={{ headerShown: true, headerTitle: 'Call Details', headerStyle: { backgroundColor: '#0D0D1A' }, headerTintColor: '#FFF' }}
                    />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
}
