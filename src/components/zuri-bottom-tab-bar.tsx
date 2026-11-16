import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ZuriColors, ZuriFonts } from '@/constants/zuri-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ZuriTabIcon {
  outline: IoniconName;
  filled: IoniconName;
}

interface ZuriBottomTabBarProps extends BottomTabBarProps {
  /** Optional per-route icons. Labels come from each screen's `title` option. */
  icons?: Record<string, ZuriTabIcon>;
}

export function ZuriBottomTabBar({ state, descriptors, emitter, navigateToTab, icons }: ZuriBottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const getTabConfig = (routeName: string, title?: string) => {
    const custom = icons?.[routeName];
    if (custom) {
      return { label: title ?? routeName, iconOutline: custom.outline, iconFilled: custom.filled };
    }
    switch (routeName) {
      case 'index':
        return {
          label: 'Home',
          iconOutline: 'home-outline' as const,
          iconFilled: 'home' as const,
        };
      case 'explore':
      case 'courses':
        return {
          label: 'Courses',
          iconOutline: 'school-outline' as const,
          iconFilled: 'school' as const,
        };
      case 'plan':
        return {
          label: 'Plan',
          iconOutline: 'calendar-outline' as const,
          iconFilled: 'calendar' as const,
        };
      case 'research':
        return {
          label: 'Research',
          iconOutline: 'book-outline' as const,
          iconFilled: 'book' as const,
        };
      case 'you':
      case 'profile':
        return {
          label: 'You',
          iconOutline: 'person-outline' as const,
          iconFilled: 'person' as const,
        };
      default:
        return {
          label: routeName,
          iconOutline: 'ellipse-outline' as const,
          iconFilled: 'ellipse' as const,
        };
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = getTabConfig(route.name, descriptors[route.key]?.options.title);

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={config.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
            >
              {isFocused ? (
                <View style={styles.activePill}>
                  <Ionicons
                    name={config.iconFilled}
                    size={20}
                    color="#5c3400"
                  />
                  <Text style={styles.activeLabel}>{config.label}</Text>
                </View>
              ) : (
                <View style={styles.inactiveItem}>
                  <Ionicons
                    name={config.iconOutline}
                    size={21}
                    color="#46483d"
                  />
                  <Text style={styles.inactiveLabel}>{config.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0eee9', // surface-container from Stitch design
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 199, 185, 0.35)', // ghost-border
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  activePill: {
    backgroundColor: '#ffb559', // secondary-container warm amber pill
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  activeLabel: {
    fontFamily: ZuriFonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    color: '#5c3400', // on-secondary-container
    marginTop: 1,
  },
  inactiveItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  inactiveLabel: {
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 11,
    fontWeight: '500',
    color: '#46483d', // on-surface-variant
    marginTop: 2,
  },
});
