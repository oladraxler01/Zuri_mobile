import React from 'react';
import { Tabs } from 'expo-router';
import { ZuriBottomTabBar } from '@/components/zuri-bottom-tab-bar';
import { RoleGate } from '@/components/role-gate';

export default function TabsLayout() {
  return (
    <RoleGate role="student">
    <Tabs
      tabBar={(props) => <ZuriBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Courses',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
        }}
      />
      <Tabs.Screen
        name="research"
        options={{
          title: 'Research',
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
        }}
      />
    </Tabs>
    </RoleGate>
  );
}
