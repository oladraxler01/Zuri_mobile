import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZuriFonts } from '@/hooks/use-zuri-fonts';
import { useSession, ROLE_HOME } from '@/context/session-context';
import { makeStyles, useTheme } from '@/theme';

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
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ universityName?: string; universityId?: string }>();
  const [fontsLoaded] = useZuriFonts();
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
        pathname: '/onboarding/profile-setup',
        params: {
          university: params.universityName || 'Veritas University',
        },
      } as any);
      return;
    }

    // Lecturer and School Board each open their own app.
    if (selectedRole === 'lecturer') {
      setRole('lecturer');
      router.push('/onboarding/lecturer-setup' as Href);
      return;
    }
    // School Board uses the normal sign-in. Until the server issues admin
    // roles (spec alignment report Q10), the role chosen here routes the
    // account after sign-in (ROLE_HOME).
    setRole('institution');
    router.push('/onboarding/sign-in' as Href);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Bar */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Zuri</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Group */}
        <View style={styles.headerGroup}>
          <Text style={styles.headline}>How will you use Zuri?</Text>
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
                  <Ionicons name={role.icon} size={22} color={colors.text} />
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
                      color={colors.text}
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.space[5],
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
    borderRadius: t.radius.md,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: { ...t.type['title-1'], color: t.colors.text,
    },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: t.space[5],
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
  headline: { ...t.type['title-1'], color: t.colors.text,
  },
  subtitle: { ...t.type.body, color: t.colors['text-muted'],
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
    borderRadius: t.radius.md,
    borderWidth: 1.5,
  },
  roleCardDefault: {
    backgroundColor: t.colors['surface-sunken'],
    borderColor: t.colors.border,
  },
  roleCardActive: {
    backgroundColor: t.colors['surface-raised'],
    borderColor: t.colors.primary, boxShadow: t.shadows.card,},
  roleCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  roleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: t.radius.full,
    backgroundColor: t.colors['surface-raised'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  roleTextBox: {
    flex: 1,
    paddingRight: 8,
  },
  roleTitle: { ...t.type.body, color: t.colors.text,
    marginBottom: 4,
  },
  roleDesc: { ...t.type.footnote, color: t.colors['text-muted'],
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
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.full,
    alignItems: 'center',
    justifyContent: 'center', boxShadow: t.shadows.card,},
  getStartedButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  getStartedButtonText: { ...t.type.body, color: t.colors['on-primary'],
    },
}));
