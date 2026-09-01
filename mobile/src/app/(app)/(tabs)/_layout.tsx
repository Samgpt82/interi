import { Tabs } from 'expo-router';
import { Bookmark, CircleUserRound, WandSparkles } from 'lucide-react-native';
import React from 'react';

import { COLORS } from '@/lib/interi';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: COLORS.chalk },
        tabBarActiveTintColor: COLORS.coral,
        tabBarInactiveTintColor: COLORS.olive,
        tabBarStyle: {
          backgroundColor: COLORS.paper,
          borderTopColor: COLORS.line,
          height: 82,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create',
          tabBarButtonTestID: 'create-tab',
          tabBarIcon: ({ color, focused }) => <WandSparkles size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Projects',
          tabBarButtonTestID: 'projects-tab',
          tabBarIcon: ({ color, focused }) => <Bookmark size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButtonTestID: 'profile-tab',
          tabBarIcon: ({ color, focused }) => <CircleUserRound size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
        }}
      />
    </Tabs>
  );
}
