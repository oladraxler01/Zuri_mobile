import React from 'react';
import { Tabs } from 'expo-router';
import { LexiBottomTabBar, type LexiTabIcon } from '@/components/lexi-bottom-tab-bar';
import { RoleGate } from '@/components/role-gate';

const ICONS: Record<string, LexiTabIcon> = {
  index: { outline: 'grid-outline', filled: 'grid' },
  academics: { outline: 'business-outline', filled: 'business' },
  analytics: { outline: 'bar-chart-outline', filled: 'bar-chart' },
  settings: { outline: 'settings-outline', filled: 'settings' },
};

export default function InstitutionTabsLayout() {
  return (
    <RoleGate role="institution">
      <Tabs
        tabBar={(props) => <LexiBottomTabBar {...props} icons={ICONS} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Overview' }} />
        <Tabs.Screen name="academics" options={{ title: 'Academics' }} />
        <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </RoleGate>
  );
}
