import React from 'react';
import { Tabs } from 'expo-router';
import { ZuriBottomTabBar, type ZuriTabIcon } from '@/components/zuri-bottom-tab-bar';
import { RoleGate } from '@/components/role-gate';

const ICONS: Record<string, ZuriTabIcon> = {
  index: { outline: 'today-outline', filled: 'today' },
  courses: { outline: 'library-outline', filled: 'library' },
  insights: { outline: 'analytics-outline', filled: 'analytics' },
  tools: { outline: 'create-outline', filled: 'create' },
  profile: { outline: 'person-outline', filled: 'person' },
};

export default function LecturerTabsLayout() {
  return (
    <RoleGate role="lecturer">
      <Tabs
        tabBar={(props) => <ZuriBottomTabBar {...props} icons={ICONS} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
        <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </RoleGate>
  );
}
