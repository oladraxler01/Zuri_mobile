import React, { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { ZuriBottomTabBar } from '@/components/zuri-bottom-tab-bar';
import { RoleGate } from '@/components/role-gate';
import { AssistantFab } from '@/components/assistant/assistant-fab';

export default function TabsLayout() {
  const [barHeight, setBarHeight] = useState(76);
  return (
    <RoleGate role="student">
    <View style={{ flex: 1 }}>
    <Tabs
      tabBar={(props) => <ZuriBottomTabBar {...props} onHeight={setBarHeight} />}
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
    <AssistantFab bottom={barHeight + 14} />
    </View>
    </RoleGate>
  );
}
