import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { useSession, ROLE_HOME } from '@/context/session-context';

type RoleType = 'student' | 'lecturer' | 'school-board';

interface RoleOption {
  id: RoleType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons extends never ? string : any;
}

const ROLES: RoleOption[] = [
  {
    id: 'student',
    title: 'Student',
    description: 'Track courses, get smart study insights, and ace your exams.',
    icon: 'school',
  },
  {
    id: 'lecturer',
    title: 'Lecturer',
    description: 'Manage courses, record lectures, and monitor student engagement.',
    icon: 'book',
  },
  {
    id: 'school-board',
    title: 'School Board',
    description: 'Oversee academic performance and institutional analytics.',
    icon: 'business',
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ universityName?: string; universityId?: string }>();
  const [fontsLoaded] = useLexiFonts();
  const { setRole } = useSession();

  const [selectedRole, setSelectedRole] = useState<RoleType>('student');

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/institution' as Href);
    }
  };

  const handleGetStarted = () => {
    if (selectedRole === 'student') {
      setRole('student');
      router.push({
        pathname: '/onboarding/student-courses',
        params: {
          university: params.universityName || 'Veritas University',
        },
      } as any);
      return;
    }

    // Lecturer and School Board each open their own app.
    const role = selectedRole === 'lecturer' ? 'lecturer' : 'institution';
    setRole(role);
    router.replace(ROLE_HOME[role]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={LexiColors.background} />

      {/* Top App Bar */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={LexiColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Lexi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Group */}
        <View style={styles.headerGroup}>
          <Text style={styles.headline}>How will you use Lexi?</Text>
          <Text style={styles.subtitle}>This helps us personalize your experience.</Text>
        </View>

        {/* Role Selection Cards */}
        <View style={styles.rolesGroup}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <Pressable
                key={role.id}
                style={({ pressed }) => [
                  styles.roleCard,
                  isSelected ? styles.roleCardActive : styles.roleCardDefault,
                  pressed && styles.roleCardPressed,
                ]}
                onPress={() => setSelectedRole(role.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={role.title}
              >
                {/* Role Icon */}
                <View style={styles.roleIconWrapper}>
                  <Ionicons name={role.icon} size={22} color={LexiColors.primary} />
                </View>

                {/* Role Description */}
                <View style={styles.roleTextBox}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDesc}>{role.description}</Text>
                </View>

                {/* Checkmark Circle */}
                <View
                  style={[
                    styles.checkCircle,
                    isSelected && styles.checkCircleVisible,
                  ]}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={LexiColors.primaryContainer}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.getStartedButtonPressed,
            ]}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LexiColors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LexiSpacing.containerPaddingH,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 8,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 24,
    color: LexiColors.primary,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: LexiSpacing.containerPaddingH,
    paddingTop: 24,
    paddingBottom: 36,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  headerGroup: {
    gap: 8,
    marginBottom: 28,
  },
  headline: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: LexiColors.primary,
  },
  subtitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    lineHeight: 24,
    color: LexiColors.onSurfaceVariant,
  },
  rolesGroup: {
    gap: 16,
    width: '100%',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  roleCardDefault: {
    backgroundColor: '#F5F3EF',
    borderColor: '#E5E3DF',
  },
  roleCardActive: {
    backgroundColor: '#ffffff',
    borderColor: LexiColors.primaryContainer,
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  roleCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  roleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LexiColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
  },
  roleTextBox: {
    flex: 1,
    paddingRight: 8,
  },
  roleTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    fontWeight: '600',
    color: LexiColors.onSurface,
    marginBottom: 4,
  },
  roleDesc: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    lineHeight: 19,
    color: LexiColors.onSurfaceVariant,
  },
  checkCircle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleVisible: {
    opacity: 1,
  },
  actionContainer: {
    paddingTop: 36,
    width: '100%',
  },
  getStartedButton: {
    width: '100%',
    height: 56,
    backgroundColor: LexiColors.primaryContainer,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LexiColors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  getStartedButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  getStartedButtonText: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    color: LexiColors.onPrimary,
    fontWeight: '600',
  },
});
