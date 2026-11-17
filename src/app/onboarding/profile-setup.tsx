import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAcademic } from '@/context/academic-context';
import { FACULTY_OPTIONS } from '@/constants/course-catalogue';
import { looksLikeMatric } from '@/utils/validation';
import { makeStyles, useTheme } from '@/theme';

/**
 * Student profile setup: name, matric number (student verification) and faculty.
 * Comes after choosing the Student role, before courses.
 */
export default function ProfileSetupScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
            placeholderTextColor={colors['text-subtle']}
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
              placeholderTextColor={colors['text-subtle']}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {!!matric.trim() && (
              <Ionicons
                name={matricOk ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={matricOk ? colors.success : colors.warning}
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
                <Ionicons name={faculty === f ? 'radio-button-on' : 'radio-button-off'} size={20} color={faculty === f ? colors.text : colors['text-subtle']} />
              </Pressable>
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={next}>
            <Text style={styles.primaryText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors['on-primary']} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.surface },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  step: { ...t.type.subhead, color: t.colors['text-subtle'] },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: t.radius.full,
    backgroundColor: t.colors['warning-container'],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  initials: { ...t.type['title-1'], color: t.colors.text },
  h1: { ...t.type['title-1'], color: t.colors.text, textAlign: 'center' },
  lead: { ...t.type.callout, color: t.colors['text-subtle'], textAlign: 'center', marginTop: 4 },
  label: { ...t.type.eyebrow, color: t.colors['text-subtle'], marginTop: 22, marginBottom: 8 },
  input: { ...t.type.callout, height: 50,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors['surface-raised'],
    paddingHorizontal: 14,
    color: t.colors.text,
  },
  inputIcon: { position: 'absolute', right: 14, top: 15 },
  hint: { ...t.type.caption, color: t.colors['text-subtle'], marginTop: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: t.colors['surface-raised'],
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionOn: { borderColor: t.colors.primary },
  optionText: { ...t.type.subhead, flex: 1, color: t.colors.text },
  error: { ...t.type.subhead, color: t.colors.danger, marginTop: 14 },
  primary: {
    height: 54,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  },
  primaryText: { ...t.type.subhead, color: t.colors['on-primary'] },
}));
