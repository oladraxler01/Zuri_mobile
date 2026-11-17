import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  ListGroup,
  ListRow,
  Skeleton,
  StateView,
  Text,
  TextField,
  useTheme,
} from '@/theme';

/**
 * Dev-only gallery of the design-system components (open /dev/design-system).
 * Use it for visual checks while screens migrate. Not reachable in production.
 */
export default function DesignSystemGallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[3] }}>
      <Text variant="eyebrow" color="accent-text">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Gallery() {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const [style, setStyle] = useState('Examples first');
  const [email, setEmail] = useState('ada@gmail');
  const [sheet, setSheet] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[12],
          paddingHorizontal: space[5],
          gap: space[8],
        }}
      >
        <Text variant="title-1">Design system</Text>

        <Section title="TYPE">
          <Text variant="display">Know what to revise.</Text>
          <Text variant="title-2">CSC 301 · Data Structures</Text>
          <Text variant="headline">Your next class starts in 18 min</Text>
          <Text variant="body">Zuri recorded today’s lecture and filed it under CSC 301.</Text>
          <Text variant="callout" color="text-muted">
            Merge sort splits the list in half, sorts each half, then merges.
          </Text>
          <Text variant="footnote" color="text-subtle">
            From slide 12 · transcript 10:42
          </Text>
          <Text variant="stat">67%</Text>
        </Section>

        <Section title="BUTTONS">
          <Button label="Start class" onPress={() => {}} />
          <Button label="Save and continue" onPress={() => {}} block />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Button label="Not now" variant="secondary" onPress={() => {}} />
            <Button label="Practise now" variant="tonal" onPress={() => {}} />
            <Button label="See all" variant="text" onPress={() => {}} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Button label="Delete recording" variant="danger" icon="trash-outline" onPress={() => {}} />
            <Button label="Uploading" loading onPress={() => {}} />
            <Button label="Disabled" disabled onPress={() => {}} />
          </View>
        </Section>

        <Section title="CHIPS">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {['Examples first', 'Step by step', 'Theory first'].map((l) => (
              <Chip key={l} label={l} role="radio" selected={style === l} onPress={() => setStyle(l)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Chip label="Understood" status="success" />
            <Chip label="Due tomorrow" status="warning" />
            <Chip label="Overdue" status="danger" />
          </View>
        </Section>

        <Section title="TEXT FIELDS">
          <TextField label="Course code" placeholder="e.g. CSC 301" help="As it appears on your timetable." />
          <TextField
            label="School email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            error={email.includes('@') && email.includes('.') ? undefined : 'Add the part after @, e.g. ada@veritas.edu.ng.'}
          />
        </Section>

        <Section title="CARD">
          <Card
            eyebrow="AFTER CLASS"
            title="Debrief: CSC 301, Merge sort"
            body="You flagged two moments. Five minutes now and Zuri will check you got them."
            action={
              <>
                <Button size="sm" label="Start debrief" onPress={() => setSheet(true)} />
                <Button size="sm" variant="text" label="Later" onPress={() => {}} />
              </>
            }
          />
        </Section>

        <Section title="LIST">
          <ListGroup>
            <ListRow
              icon="school-outline"
              title="CSC 301 · Data Structures"
              meta="3 lectures · next Wed 10:00"
              trailing={<Chip label="Ready" status="success" />}
            />
            <ListRow icon="mic-outline" title="Lecture 4: Merge sort" meta="Mon 12 Nov · 1 h 48 min · notes ready" onPress={() => {}} />
            <ListRow icon="refresh-outline" title="Follow-up: recursion depth" meta="From Tuesday's debrief · 3 questions" onPress={() => {}} />
          </ListGroup>
        </Section>

        <Section title="STATES">
          <StateView kind="offline" body="You're offline. Changes will sync when you're back." />
          <StateView
            kind="empty"
            title="No materials yet"
            body="Add notes, slides or past questions for CSC 301, and Zuri will answer from them."
            actionLabel="Upload a file"
            onAction={() => {}}
          />
          <StateView
            kind="error"
            title="Couldn't load your timetable"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => {}}
          />
          <View style={{ gap: space[2] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton height={14} />
            <Skeleton width="80%" height={14} />
          </View>
        </Section>
      </ScrollView>

      <BottomSheet
        visible={sheet}
        onDismiss={() => setSheet(false)}
        title="Record this class?"
        dismissible={false}
        primary={{ label: 'Start recording', onPress: () => setSheet(false) }}
        secondary={{ label: 'Ask questions without recording', onPress: () => setSheet(false) }}
      >
        <Text variant="callout" color="text-muted">
          Only you can hear the recording. It’s kept for 90 days, and the transcript and notes stay after that.
        </Text>
      </BottomSheet>
    </View>
  );
}
