import React from 'react';
import { Tabs } from 'expo-router';
import { LexiBottomTabBar } from '@/components/lexi-bottom-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LexiBottomTabBar {...props} />}
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
  );
}
