import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useAcademic } from '@/context/academic-context';
import { FACULTY_OPTIONS } from '@/constants/course-catalogue';
import { looksLikeMatric } from '@/utils/validation';

/**
 * Student profile setup: name, matric number (student verification) and faculty.
 * Comes after choosing the Student role, before courses.
 */
export default function ProfileSetupScreen() {
  const { state, setAcademicInfo } = useAcademic();
  const [name, setName] = useState(state.studentName);
  const [matric, setMatric] = useState(state.matricNumber);
  const [faculty, setFaculty] = useState(state.faculty);
  const [error, setError] = useState('');

  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const matricOk = looksLikeMatric(matric);

  const next = () => {
    if (!name.trim()) return setError('Enter your full name.');
    if (matric.trim() && !matricOk) return setError('That doesn’t look like a matric number. Check it, or leave it blank for now.');
    setAcademicInfo({
      studentName: name.trim(),
      matricNumber: matric.trim(),
      verification: matric.trim() ? 'pending' : 'unverified',
      faculty,
    });
    router.push('/onboarding/student-courses' as Href);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.step}>Your profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={styles.h1}>Tell us who you are</Text>
          <Text style={styles.lead}>{state.university}</Text>

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError('');
            }}
            placeholder="e.g. Marvellous Okoro"
            placeholderTextColor={UI.muted}
            autoComplete="name"
          />

          <Text style={styles.label}>MATRIC NUMBER</Text>
          <View>
            <TextInput
              style={[styles.input, { paddingRight: 44 }]}
              value={matric}
              onChangeText={(v) => {
                setMatric(v.toUpperCase());
                setError('');
              }}
              placeholder="e.g. VUG/CSC/21/1234"
              placeholderTextColor={UI.muted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {!!matric.trim() && (
              <Ionicons
                name={matricOk ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={matricOk ? UI.success : UI.amber}
                style={styles.inputIcon}
              />
            )}
          </View>
          <Text style={styles.hint}>
            Used to verify you’re a student at {state.university}. You can add it later in your profile.
          </Text>

          <Text style={styles.label}>FACULTY</Text>
          <View style={{ gap: 8 }}>
            {FACULTY_OPTIONS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFaculty(f)}
                style={[styles.option, faculty === f && styles.optionOn]}
                accessibilityRole="radio"
                accessibilityState={{ checked: faculty === f }}
              >
                <Text style={styles.optionText}>{f}</Text>
                <Ionicons name={faculty === f ? 'radio-button-on' : 'radio-button-off'} size={20} color={faculty === f ? UI.ink : UI.muted} />
              </Pressable>
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={next}>
            <Text style={styles.primaryText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  step: { fontFamily: ZuriFonts.labelSmBold, fontSize: 13, color: UI.muted },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: UI.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  initials: { fontFamily: ZuriFonts.headlineMd, fontSize: 26, color: UI.ink },
  h1: { fontFamily: ZuriFonts.headlineLg, fontSize: 28, color: UI.ink, textAlign: 'center' },
  lead: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.muted, textAlign: 'center', marginTop: 4 },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 22, marginBottom: 8 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 14,
    fontFamily: ZuriFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  inputIcon: { position: 'absolute', right: 14, top: 15 },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: UI.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: UI.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionOn: { borderColor: UI.ink },
  optionText: { flex: 1, fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.ink },
  error: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.error, marginTop: 14 },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
});
