import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';
import { useSession } from '@/context/session-context';
import { useInstitution } from '@/context/institution-context';

/**
 * Institution login for administrators: institution email + admin access
 * code issued by Zuri when a university is onboarded. Checked by the server
 * once it's connected; here the format is validated.
 */
export default function AdminSignInScreen() {
  const { setRole } = useSession();
  const { settings, log } = useInstitution();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter your institution email address.');
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.trim().toUpperCase())) return setError('Admin access codes look like ABCD-1234.');
    setError('');
    setRole('institution');
    log('Administrator signed in', email.trim().replace(/(.{2}).*(@.*)/, '$1•••$2'));
    router.replace('/institution' as Href);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={UI.ink} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <View style={styles.icon}>
            <Ionicons name="business-outline" size={28} color={UI.ink} />
          </View>
          <Text style={styles.kicker}>INSTITUTION ADMIN</Text>
          <Text style={styles.title}>Sign in to the dashboard</Text>
          <Text style={styles.lead}>For registry, deans and administrators managing {settings.name} on Zuri.</Text>

          <Text style={styles.label}>INSTITUTION EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@university.edu.ng"
            placeholderTextColor={UI.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Text style={styles.label}>ADMIN ACCESS CODE</Text>
          <View>
            <TextInput
              style={[styles.input, { paddingRight: 46 }]}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="ABCD-1234"
              placeholderTextColor={UI.muted}
              autoCapitalize="characters"
              secureTextEntry={!show}
            />
            <Pressable onPress={() => setShow(!show)} style={styles.eye} hitSlop={8} accessibilityLabel={show ? 'Hide code' : 'Show code'}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={UI.muted} />
            </Pressable>
          </View>
          <Text style={styles.hint}>Your access code was issued when your university joined Zuri. Ask your Zuri administrator if you don’t have one.</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={submit}>
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  body: { padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  icon: { width: 56, height: 56, borderRadius: 16, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  kicker: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.4, color: UI.amber },
  title: { fontFamily: ZuriFonts.headlineLg, fontSize: 28, color: UI.ink, marginTop: 4 },
  lead: { fontFamily: ZuriFonts.bodyRegular, fontSize: 15, lineHeight: 22, color: UI.inkSoft, marginTop: 6 },
  label: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 20, marginBottom: 8 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: UI.border, backgroundColor: UI.card, paddingHorizontal: 14, fontFamily: ZuriFonts.bodyRegular, fontSize: 15, color: UI.ink },
  eye: { position: 'absolute', right: 14, top: 15 },
  hint: { fontFamily: ZuriFonts.bodyRegular, fontSize: 12, lineHeight: 18, color: UI.muted, marginTop: 8 },
  error: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, color: UI.error, marginTop: 12 },
  primary: { height: 54, borderRadius: 27, backgroundColor: UI.ink, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { fontFamily: ZuriFonts.labelSmBold, fontSize: 15, color: '#fff' },
});
