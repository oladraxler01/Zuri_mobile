import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import { useAcademic } from '@/context/academic-context';
import { useMaterials } from '@/context/materials-context';
import { Chip } from '@/components/ui/chip';
import { StateView } from '@/components/states/state-view';
import { fileIcon, formatSize } from '@/components/materials/material-card';
import { MATERIAL_CATEGORIES, type MaterialCategory, type MaterialVisibility } from '@/types/material';
import { isTextFile } from '@/services/material-api';
import { isBackendConfigured } from '@/services/lecture-api';

/** Upload details: course, type and who can see it. */
export default function NewMaterialScreen() {
  const p = useLocalSearchParams<{ uri: string; name: string; mimeType?: string; size?: string; courseId?: string }>();
  const { state } = useAcademic();
  const { addMaterial } = useMaterials();

  const guessCategory = (): MaterialCategory => {
    const n = (p.name ?? '').toLowerCase();
    if (/past|pq|exam|question/.test(n)) return 'past-questions';
    if (/slide|ppt|lecture/.test(n) || /\.pptx?$/.test(n)) return 'slides';
    if (/note/.test(n)) return 'notes';
    return 'notes';
  };

  const [courseId, setCourseId] = useState(p.courseId || state.courses[0]?.id || '');
  const [category, setCategory] = useState<MaterialCategory>(guessCategory());
  const [visibility, setVisibility] = useState<MaterialVisibility>('private');

  if (!p.uri) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <StateView icon="document-outline" title="No file selected" primary={{ label: 'Go back', onPress: () => router.back() }} />
      </SafeAreaView>
    );
  }

  const course = state.courses.find((c) => c.id === courseId);
  const textFile = isTextFile(p.name ?? '', p.mimeType);

  const save = () => {
    const id = addMaterial({
      uri: p.uri,
      name: p.name ?? 'Document',
      mimeType: p.mimeType || undefined,
      sizeBytes: p.size ? Number(p.size) || undefined : undefined,
      courseId: course?.id,
      courseCode: course?.code,
      courseTitle: course?.title,
      category,
      visibility,
    });
    router.replace(`/material/${id}` as Href);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Cancel">
          <Ionicons name="close" size={24} color={UI.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Upload material</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.file}>
          <View style={styles.fileIcon}>
            <Ionicons name={fileIcon({ name: p.name ?? '', mimeType: p.mimeType })} size={26} color={UI.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={2}>
              {p.name}
            </Text>
            <Text style={styles.fileMeta}>{formatSize(Number(p.size))}</Text>
          </View>
        </View>

        <Text style={styles.label}>COURSE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {state.courses.map((c) => (
            <Chip key={c.id} label={c.code} on={courseId === c.id} onPress={() => setCourseId(c.id)} />
          ))}
        </ScrollView>

        <Text style={styles.label}>TYPE</Text>
        <View style={styles.wrap}>
          {MATERIAL_CATEGORIES.map((c) => (
            <Chip key={c.key} label={c.label} on={category === c.key} onPress={() => setCategory(c.key)} />
          ))}
        </View>

        <Text style={styles.label}>WHO CAN SEE IT</Text>
        <View style={{ gap: 10 }}>
          <VisibilityOption
            icon="lock-closed-outline"
            title="Only me"
            desc="Kept private to your account."
            on={visibility === 'private'}
            onPress={() => setVisibility('private')}
          />
          <VisibilityOption
            icon="people-outline"
            title={`My ${course?.code ?? 'course'} classmates`}
            desc="Classmates on Lexi in this course can view it once sharing is live."
            on={visibility === 'course'}
            onPress={() => setVisibility('course')}
          />
        </View>

        {!isBackendConfigured && (
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={UI.amber} />
            <Text style={styles.noteText}>
              {textFile
                ? 'This text file will be read on your phone for a basic summary and key passages.'
                : 'The document server isn’t connected yet, so this file will get sample study results. The file itself is saved and can be opened anytime.'}
            </Text>
          </View>
        )}

        <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]} onPress={save}>
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.primaryText}>Upload & process</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function VisibilityOption({
  icon,
  title,
  desc,
  on,
  onPress,
}: {
  icon: any;
  title: string;
  desc: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, on && styles.optionOn]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
    >
      <Ionicons name={icon} size={20} color={UI.ink} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{desc}</Text>
      </View>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? UI.ink : UI.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.borderSoft,
  },
  topTitle: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: UI.ink },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },
  fileIcon: { width: 52, height: 60, borderRadius: 12, backgroundColor: UI.amberSoft, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  fileMeta: { fontFamily: LexiFonts.bodyRegular, fontSize: 13, color: UI.muted, marginTop: 2 },
  label: { fontFamily: LexiFonts.labelSmBold, fontSize: 11, letterSpacing: 1.2, color: UI.muted, marginTop: 22, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: UI.border,
    padding: 14,
  },
  optionOn: { borderColor: UI.ink },
  optionTitle: { fontFamily: LexiFonts.bodyMedium, fontSize: 15, color: UI.ink },
  optionDesc: { fontFamily: LexiFonts.bodyRegular, fontSize: 12, color: UI.muted, marginTop: 2 },
  note: { flexDirection: 'row', gap: 10, backgroundColor: UI.amberSoft, borderRadius: 12, padding: 12, marginTop: 20 },
  noteText: { flex: 1, fontFamily: LexiFonts.bodyRegular, fontSize: 13, lineHeight: 19, color: '#6b4511' },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },
  primaryText: { fontFamily: LexiFonts.labelSmBold, fontSize: 15, color: '#fff' },
});
