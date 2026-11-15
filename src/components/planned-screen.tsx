import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useSession } from '@/context/session-context';

interface PlannedScreenProps {
  /** Small caps label above the title, e.g. "LECTURER" */
  eyebrow: string;
  title: string;
  description: string;
  /** Screens/features from the product checklist that will live here */
  planned: string[];
  /** Show a sign-out button (used on profile/settings tabs) */
  showSignOut?: boolean;
}

/**
 * Placeholder for screens that are mapped out but not built yet.
 * Gives each role a real, navigable shell while features are built phase by phase.
 */
export function PlannedScreen({ eyebrow, title, description, planned, showSignOut }: PlannedScreenProps) {
  const [fontsLoaded] = useLexiFonts();
  const { signOut } = useSession();

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleSignOut = () => {
    signOut();
    router.replace('/onboarding/welcome' as Href);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>Lexi</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{eyebrow}</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="construct-outline" size={18} color={LexiColors.tertiary} />
            <Text style={styles.cardTitle}>Coming to this screen</Text>
          </View>
          {planned.map((item) => (
            <View key={item} style={styles.itemRow}>
              <View style={styles.dot} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {showSignOut && (
          <Pressable style={styles.signOut} onPress={handleSignOut} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color={LexiColors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LexiColors.background,
  },
  content: {
    paddingHorizontal: LexiSpacing.containerPaddingH,
    paddingTop: LexiSpacing.sm,
    paddingBottom: LexiSpacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LexiSpacing.md,
  },
  brand: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 24,
    color: LexiColors.primary,
  },
  badge: {
    backgroundColor: LexiColors.primaryFixed,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1,
    color: LexiColors.onPrimaryFixedVariant,
  },
  title: {
    fontFamily: LexiFonts.headlineLg,
    fontSize: 30,
    lineHeight: 36,
    color: LexiColors.onSurface,
    marginBottom: LexiSpacing.xs,
  },
  description: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: LexiColors.onSurfaceVariant,
    marginBottom: LexiSpacing.md,
  },
  card: {
    backgroundColor: LexiColors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    padding: LexiSpacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.onSurface,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LexiColors.tertiaryContainer,
    marginRight: 10,
  },
  itemText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: LexiColors.onSurfaceVariant,
    flex: 1,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: LexiSpacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LexiColors.errorContainer,
    backgroundColor: '#fff8f7',
  },
  signOutText: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 14,
    color: LexiColors.error,
  },
});
