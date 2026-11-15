import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiColors, LexiFonts, LexiSpacing } from '@/constants/lexi-theme';
import { useLexiFonts } from '@/hooks/use-lexi-fonts';
import { NIGERIAN_UNIVERSITIES, University } from '@/constants/nigerian-universities';
import { useAcademic } from '@/context/academic-context';

export default function InstitutionSelectScreen() {
  const router = useRouter();
  const [fontsLoaded] = useLexiFonts();
  const { setAcademicInfo } = useAcademic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('veritas'); // Default to Veritas University as in Stitch mockup

  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) {
      return NIGERIAN_UNIVERSITIES;
    }
    const q = searchQuery.toLowerCase().trim();
    return NIGERIAN_UNIVERSITIES.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        u.state.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/verify' as Href);
    }
  };

  const handleContinue = () => {
    const selectedUni = NIGERIAN_UNIVERSITIES.find((u) => u.id === selectedId);
    if (selectedUni) setAcademicInfo({ university: selectedUni.name });
    router.push({
      pathname: '/onboarding/role-select',
      params: {
        universityId: selectedId,
        universityName: selectedUni?.name || 'Veritas University',
      },
    } as any);
  };

  const handleRequestInstitution = () => {
    if ((Alert as any).prompt) {
      (Alert as any).prompt(
        'Request Institution',
        'Enter the name of your university or college:',
        (text: string) => {
          if (text) {
            Alert.alert('Request Received', `Thank you! We will verify and add ${text} soon.`);
          }
        }
      );
    } else {
      Alert.alert(
        'Request Institution',
        'Please send your institution name to support@lexiapp.com and our team will add it.'
      );
    }
  };

  const renderUniversityItem = ({ item }: { item: University }) => {
    const isSelected = item.id === selectedId;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isSelected ? styles.cardSelected : styles.cardDefault,
          pressed && styles.cardPressed,
        ]}
        onPress={() => setSelectedId(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${item.name}, ${item.location}`}
      >
        {/* Placeholder Crest */}
        <View style={styles.crestBox}>
          <Ionicons name="business-outline" size={22} color={LexiColors.outline} />
        </View>

        {/* University Info */}
        <View style={styles.infoBox}>
          <Text style={styles.uniName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.uniLocation} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {/* Checkmark Badge */}
        {isSelected ? (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          </View>
        ) : (
          <View style={styles.unselectedIndicator} />
        )}
      </Pressable>
    );
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
          <Ionicons name="arrow-back" size={24} color={LexiColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Zuri</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentWrapper}>
        {/* Header Section */}
        <View style={styles.titleSection}>
          <Text style={styles.headline}>Connect your institution</Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={LexiColors.outline}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for your university..."
              placeholderTextColor={LexiColors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS !== 'ios' && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={18} color={LexiColors.outline} />
              </Pressable>
            )}
          </View>
        </View>

        {/* University List */}
        <FlatList
          data={filteredUniversities}
          keyExtractor={(item) => item.id}
          renderItem={renderUniversityItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={40} color={LexiColors.outline} />
              <Text style={styles.emptyTitle}>No institution found</Text>
              <Text style={styles.emptySubtitle}>
                No universities found matching "{searchQuery}".
              </Text>
              <Pressable style={styles.requestButton} onPress={handleRequestInstitution}>
                <Text style={styles.requestButtonText}>Request to add it</Text>
              </Pressable>
            </View>
          }
        />

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueButtonText}>CONTINUE</Text>
          </Pressable>

          <View style={styles.requestFooterRow}>
            <Text style={styles.requestFooterText}>
              Can't find your institution?{' '}
              <Text style={styles.requestFooterLink} onPress={handleRequestInstitution}>
                Request to add it
              </Text>
            </Text>
          </View>
        </View>
      </View>
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
  contentWrapper: {
    flex: 1,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: LexiSpacing.containerPaddingH,
  },
  titleSection: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  headline: {
    fontFamily: LexiFonts.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    color: LexiColors.primary,
    marginBottom: 20,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: LexiColors.outlineVariant,
    borderRadius: 10,
    paddingLeft: 44,
    paddingRight: 40,
    fontFamily: LexiFonts.bodyMd,
    fontSize: 15,
    color: LexiColors.onSurface,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F5F3EF',
  },
  cardDefault: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: LexiColors.primary,
    backgroundColor: '#ffffff',
    shadowColor: LexiColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  crestBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LexiColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flex: 1,
  },
  uniName: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 15,
    fontWeight: '600',
    color: LexiColors.primary,
    marginBottom: 2,
  },
  uniLocation: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LexiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: LexiFonts.bodyLg,
    fontSize: 16,
    fontWeight: '600',
    color: LexiColors.primary,
  },
  emptySubtitle: {
    fontFamily: LexiFonts.bodyMd,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
    textAlign: 'center',
  },
  requestButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: LexiColors.surfaceContainerHigh,
  },
  requestButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 13,
    color: LexiColors.primary,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
    backgroundColor: LexiColors.background,
  },
  continueButton: {
    width: '100%',
    height: 56,
    backgroundColor: LexiColors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LexiColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueButtonText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: LexiColors.onPrimary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  requestFooterRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestFooterText: {
    fontFamily: LexiFonts.labelSm,
    fontSize: 13,
    color: LexiColors.onSurfaceVariant,
  },
  requestFooterLink: {
    color: LexiColors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
