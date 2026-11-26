import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { useAcademic, type TimetableSlot } from '@/context/academic-context';
import { currentUser } from '@/services/api-client';
import { isBackendConfigured } from '@/services/api-config';
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_TEXT,
  confirmTimetableImport,
  importMimeType,
  newIdempotencyKey,
  previewTimetableImport,
  readFileAsBase64,
  type CourseMatchKind,
  type TimetableImportPreview,
} from '@/services/timetable-import-api';
import { normaliseCode, parseTimetableText } from '@/utils/timetable-import';
import {
  REVIEW_DAYS,
  clock12,
  isStudentsRow,
  matchedCourseId,
  parseClockTime,
  rowFromServer,
  rowProblem,
  rowToConfirm,
  type ReviewRow,
} from '@/utils/timetable-review';
import { Button, Chip, Text, TextField, makeStyles, useTheme } from '@/theme';

/**
 * Upload a timetable (photo, PDF, text file or pasted text), check the classes
 * Zuri found, fix or remove any, then save them.
 *
 * Signed in: Zuri's server reads it (POST /academic/timetable/import) and saves
 * it (…/import/confirm). Signed out: only text can be read, on the phone.
 */

const signedIn = () => isBackendConfigured && !!currentUser();

type Phase = 'pick' | 'paste' | 'reading' | 'review' | 'saving';

const MATCH_LABEL: Record<CourseMatchKind, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  enrolled: { label: 'You take this course', icon: 'checkmark-circle-outline' },
  personal: { label: 'One of your courses', icon: 'checkmark-circle-outline' },
  catalogue: { label: 'Saving enrols you', icon: 'school-outline' },
  new: { label: 'Added as a new course', icon: 'add-circle-outline' },
};

const DAY_ORDER = (d: TimetableSlot['day']) => REVIEW_DAYS.indexOf(d);
const sortRows = (rows: ReviewRow[]) =>
  [...rows].sort((a, b) => DAY_ORDER(a.day) - DAY_ORDER(b.day) || a.start.localeCompare(b.start));

let localKey = 0;
const nextKey = () => `local_${Date.now().toString(36)}_${localKey++}`;

export function TimetableImport({ onSaved }: { onSaved: (message: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, addCourse, setTimetableSlots, applyTimetableImport } = useAcademic();

  const [phase, setPhase] = useState<Phase>('pick');
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  // One key per import: retrying a save over a bad connection never saves twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  // Read on the phone (signed out): saved on the phone too.
  const [readLocally, setReadLocally] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [editing, setEditing] = useState<{ row: ReviewRow; isNew: boolean } | null>(null);

  const sorted = useMemo(() => sortRows(rows), [rows]);
  const othersCount = rows.filter((r) => !isStudentsRow(r, state.level)).length;
  const mineCount = rows.length - othersCount;

  const reset = () => {
    setPhase('pick');
    setError(null);
    setRows([]);
    setWarnings([]);
    setFileName(null);
    setShowProblems(false);
  };

  const showPreview = (p: TimetableImportPreview) => {
    const found = p.classes.map(rowFromServer);
    setWarnings(p.warnings);
    setIdempotencyKey(newIdempotencyKey());
    setReadLocally(false);
    setShowProblems(false);
    if (!found.length) {
      setError(
        'Zuri didn’t find any classes in that. Crop the photo to just the timetable, or paste the text instead.'
      );
      setPhase('pick');
      return;
    }
    setRows(found);
    setPhase('review');
  };

  const readText = async (text: string) => {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Paste your timetable first.');
      return;
    }
    if (!signedIn()) {
      // Read on the phone: one class per line.
      const parsed = parseTimetableText(trimmed, state.courses);
      const byCode = new Map(state.courses.map((c) => [normaliseCode(c.code), c]));
      const found: ReviewRow[] = parsed.slots.map((sl) => {
        const course = byCode.get(sl.courseCode);
        return {
          key: nextKey(),
          code: sl.courseCode,
          title: course?.title ?? '',
          day: sl.day,
          start: parseClockTime(sl.startTime) ?? sl.startTime,
          end: parseClockTime(sl.endTime) ?? sl.endTime,
          venue: sl.venue,
          match: { kind: course ? 'personal' : 'new', course_id: null, code: sl.courseCode },
          warnings: [],
        };
      });
      setWarnings(parsed.skipped.map((s) => `Left out “${s.line.slice(0, 60)}”: ${s.reason.toLowerCase()}.`));
      setReadLocally(true);
      setShowProblems(false);
      if (!found.length) {
        setError('No classes found. Put one class per line with a course code, day, start and end time, and venue. Sign in to have Zuri read any layout.');
        return;
      }
      setRows(found);
      setPhase('review');
      return;
    }
    if (trimmed.length > MAX_IMPORT_TEXT) {
      setError('That’s more than 20,000 characters. Paste just your department’s part of the timetable.');
      return;
    }
    const back = phase;
    setPhase('reading');
    setStage('Reading your timetable…');
    try {
      showPreview(await previewTimetableImport({ text: trimmed }));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Zuri couldn’t read that. Try again.');
      setPhase(back === 'paste' ? 'paste' : 'pick');
    }
  };

  const pickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf', 'text/*', 'text/csv', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const f = res.assets[0];
    setFileName(f.name);

    const isText = /^text\//.test(f.mimeType ?? '') || /\.(csv|txt|tsv)$/i.test(f.name);
    if (isText) {
      try {
        const text = Platform.OS === 'web' ? await (await fetch(f.uri)).text() : await new File(f.uri).text();
        await readText(text);
      } catch {
        setError('That file couldn’t be opened. Try saving it again as CSV or plain text.');
      }
      return;
    }

    const mime = importMimeType(f.name, f.mimeType);
    if (mime === 'heic') {
      setError('This photo is in HEIC format, which Zuri can’t read. Take a screenshot of it and choose the screenshot instead.');
      return;
    }
    if (!mime) {
      setError('Zuri can read photos (JPEG, PNG, WebP), PDFs and text files. Choose one of those, or paste the text.');
      return;
    }
    if ((f.size ?? 0) > MAX_IMPORT_BYTES) {
      setError('That file is over 10 MB. Crop the photo to just the timetable, or paste the text instead.');
      return;
    }
    if (!signedIn()) {
      setError('Sign in first: Zuri reads photos and PDFs on its server. You can still paste the text.');
      return;
    }

    setPhase('reading');
    setStage(mime === 'application/pdf' ? 'Reading your PDF…' : 'Reading your photo…');
    try {
      const base64 = await readFileAsBase64(f.uri);
      setStage('Finding your classes. This can take up to a minute…');
      showPreview(await previewTimetableImport({ file_base64: base64, mime_type: mime }));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Zuri couldn’t read that file. Try again, or paste the text.');
      setPhase('pick');
    }
  };

  const saveLocally = (): string => {
    const idByCode = new Map(state.courses.map((c) => [normaliseCode(c.code), c.id]));
    const added: string[] = [];
    for (const r of rows) {
      const code = normaliseCode(r.code);
      if (!idByCode.has(code)) {
        idByCode.set(code, addCourse({ code, title: r.title.trim() || code, units: 3 }));
        added.push(code);
      }
    }
    const courseIds = new Set(rows.map((r) => idByCode.get(normaliseCode(r.code))));
    const kept = replaceExisting ? state.timetable.filter((t) => !courseIds.has(t.courseId)) : state.timetable;
    const stamp = Date.now().toString(36);
    setTimetableSlots([
      ...kept,
      ...rows.map((r, k) => ({
        id: `imp_${stamp}_${k}`,
        courseId: idByCode.get(normaliseCode(r.code)) ?? '',
        courseCode: normaliseCode(r.code),
        day: r.day,
        startTime: clock12(parseClockTime(r.start)!),
        endTime: clock12(parseClockTime(r.end)!),
        venue: r.venue.trim(),
      })),
    ]);
    return added.length ? `, and added ${added.join(', ')} to your courses` : '';
  };

  const save = async () => {
    setError(null);
    if (rows.some((r) => rowProblem(r))) {
      setShowProblems(true);
      setError('Some classes need fixing first. Tap a class marked in red to fix it, or remove it.');
      return;
    }
    const n = rows.length;
    const saved = `Saved ${n} ${n === 1 ? 'class' : 'classes'}`;
    if (readLocally || !signedIn()) {
      const extra = saveLocally();
      onSaved(`${saved}${extra}.`);
      reset();
      return;
    }
    setPhase('saving');
    try {
      const result = await confirmTimetableImport(rows.map(rowToConfirm), replaceExisting, idempotencyKey);
      applyTimetableImport(result, replaceExisting);
      const created = result.created_courses;
      onSaved(
        saved +
          (created ? `, and added ${created} new ${created === 1 ? 'course' : 'courses'}` : '') +
          '.' +
          (result.warnings.length ? ` ${result.warnings.join(' ')}` : '')
      );
      reset();
    } catch (e) {
      // Keep the list and the same key, so trying again is safe.
      setError(e instanceof Error && e.message ? e.message : 'Your classes weren’t saved. Try again.');
      setPhase('review');
    }
  };

  const saveEdit = (row: ReviewRow) => {
    setRows((prev) => (prev.some((r) => r.key === row.key) ? prev.map((r) => (r.key === row.key ? row : r)) : [...prev, row]));
    setEditing(null);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setEditing(null);
  };

  // ─── Reading / saving ───
  if (phase === 'reading' || phase === 'saving') {
    return (
      <View style={styles.busyBox} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.text} />
        <Text variant="callout" color="text-muted" style={styles.center}>
          {phase === 'saving' ? 'Saving your classes…' : stage}
        </Text>
        {fileName && phase === 'reading' ? (
          <Text variant="footnote" color="text-subtle" numberOfLines={1}>
            {fileName}
          </Text>
        ) : null}
      </View>
    );
  }

  // ─── Review ───
  if (phase === 'review') {
    return (
      <View style={styles.gap4}>
        <View style={styles.gap1}>
          <Text variant="title-2">Check your classes</Text>
          <Text variant="callout" color="text-muted">
            Zuri found {rows.length} {rows.length === 1 ? 'class' : 'classes'}. Tap one to fix it, or remove any that
            aren’t yours.
          </Text>
        </View>

        {othersCount > 0 && mineCount > 0 ? (
          <Button
            variant="tonal"
            size="sm"
            icon="funnel-outline"
            label={`Keep only my ${state.level} classes (${mineCount})`}
            onPress={() => setRows((prev) => prev.filter((r) => isStudentsRow(r, state.level)))}
          />
        ) : null}

        {warnings.length ? (
          <View style={[styles.callout, styles.calloutWarning]}>
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <View style={styles.flex}>
              <Text variant="subhead" color="warning">
                Left out
              </Text>
              {warnings.map((w, i) => (
                <Text key={i} variant="footnote" color="text">
                  {w}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.list}>
          {sorted.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text variant="callout" color="text-muted" style={styles.center}>
                No classes left. Add one, or start again.
              </Text>
            </View>
          ) : (
            sorted.map((r, i) => {
              const problem = showProblems ? rowProblem(r) : null;
              const matchKind: CourseMatchKind | null = matchedCourseId(r) || readLocally ? (r.match?.kind ?? null) : null;
              const match = matchKind ? MATCH_LABEL[matchKind] : { label: 'Matched when you save', icon: 'sync-outline' as const };
              const start = parseClockTime(r.start);
              const end = parseClockTime(r.end);
              return (
                <View key={r.key} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <Pressable
                    style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
                    onPress={() => setEditing({ row: r, isNew: false })}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.code || 'Class with no code'}, ${r.day}, ${start ? clock12(start) : r.start} to ${end ? clock12(end) : r.end}${r.venue ? `, ${r.venue}` : ''}. Edit`}
                  >
                    <Text variant="footnote" color="text-muted">
                      {r.day} · {start ? clock12(start) : r.start} – {end ? clock12(end) : r.end}
                    </Text>
                    <Text variant="headline">
                      {r.code || 'No course code'}
                      {r.title ? (
                        <Text variant="callout" color="text-muted">
                          {'  '}
                          {r.title}
                        </Text>
                      ) : null}
                    </Text>
                    {r.venue ? (
                      <View style={styles.inline}>
                        <Ionicons name="location-outline" size={16} color={colors['text-muted']} />
                        <Text variant="footnote" color="text-muted">
                          {r.venue}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.inline}>
                      <Ionicons name={match.icon} size={16} color={colors['text-subtle']} />
                      <Text variant="caption" color="text-subtle">
                        {match.label}
                      </Text>
                    </View>
                    {r.warnings.map((w, k) => (
                      <View key={k} style={styles.inline}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                        <Text variant="caption" color="warning" style={styles.flex}>
                          Check: {w}
                        </Text>
                      </View>
                    ))}
                    {problem ? (
                      <View style={styles.inline}>
                        <Ionicons name="close-circle" size={16} color={colors.danger} />
                        <Text variant="caption" color="danger" style={styles.flex}>
                          Fix: {problem}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => removeRow(r.key)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${r.code || 'this class'} on ${r.day}`}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors['text-subtle']} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <Button
          variant="secondary"
          icon="add"
          label="Add a class"
          onPress={() =>
            setEditing({
              row: { key: nextKey(), code: '', title: '', day: 'Mon', start: '08:00', end: '10:00', venue: '', match: null, warnings: [] },
              isNew: true,
            })
          }
        />

        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="subhead">Replace my classes for these courses</Text>
            <Text variant="footnote" color="text-muted">
              {replaceExisting
                ? 'Classes you already have for these courses are swapped for this timetable.'
                : 'These classes are added next to the ones you already have.'}
            </Text>
          </View>
          <Switch
            value={replaceExisting}
            onValueChange={setReplaceExisting}
            trackColor={{ false: colors['surface-sunken'], true: colors.primary }}
            thumbColor={colors['surface-raised']}
            ios_backgroundColor={colors['surface-sunken']}
            accessibilityLabel="Replace my classes for these courses"
            accessibilityState={{ checked: replaceExisting }}
          />
        </View>

        {error ? <ErrorCallout text={error} /> : null}

        <Button
          label={rows.length ? `Save ${rows.length} ${rows.length === 1 ? 'class' : 'classes'}` : 'Save classes'}
          icon="checkmark"
          onPress={save}
          disabled={!rows.length}
          block
        />
        <Button variant="text" label="Start again" onPress={reset} />

        <EditSheet
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onRemove={removeRow}
        />
      </View>
    );
  }

  // ─── Paste ───
  if (phase === 'paste') {
    return (
      <View style={styles.gap4}>
        <View style={styles.gap1}>
          <Text variant="title-2">Paste your timetable</Text>
          <Text variant="callout" color="text-muted">
            Copy it from a document, website or message. Any layout works
            {signedIn() ? '' : ' once you sign in; for now, put one class per line'}.
          </Text>
        </View>
        <TextInput
          style={styles.pasteBox}
          value={pasteText}
          onChangeText={setPasteText}
          multiline
          textAlignVertical="top"
          placeholder={'CSC 301, Monday, 08:00 AM, 10:00 AM, LT 1\nMTH 201 Tue 2-4pm Math Hall'}
          placeholderTextColor={colors['text-subtle']}
          accessibilityLabel="Timetable text"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Text variant="caption" color="text-subtle">
          {pasteText.length.toLocaleString()} / {MAX_IMPORT_TEXT.toLocaleString()} characters
        </Text>
        {error ? <ErrorCallout text={error} /> : null}
        <Button label="Find my classes" icon="search" onPress={() => readText(pasteText)} block />
        <Button
          variant="text"
          label="Back"
          onPress={() => {
            setError(null);
            setPhase('pick');
          }}
        />
      </View>
    );
  }

  // ─── Pick ───
  return (
    <View style={styles.gap4}>
      <View style={styles.dropZone}>
        <View style={styles.iconWell}>
          <Ionicons name="document-text-outline" size={24} color={colors['on-tint']} />
        </View>
        <Text variant="headline" style={styles.center}>
          Upload your timetable
        </Text>
        <Text variant="callout" color="text-muted" style={styles.center}>
          A photo or screenshot, the PDF from your department, or a text file. Zuri reads the table and shows you the
          classes to check before anything is saved.
        </Text>
        <Button label="Choose photo or file" icon="cloud-upload-outline" onPress={pickFile} block />
        <Button
          variant="secondary"
          label="Paste text instead"
          icon="clipboard-outline"
          onPress={() => {
            setError(null);
            setPhase('paste');
          }}
          block
        />
      </View>

      {error ? (
        <ErrorCallout text={error} />
      ) : (
        <View style={styles.callout}>
          <Ionicons name="information-circle-outline" size={20} color={colors['accent-text']} />
          <Text variant="footnote" color="text-muted" style={styles.flex}>
            For photos, crop to just the timetable and keep it straight and in focus. Files can be up to 10 MB.
          </Text>
        </View>
      )}
    </View>
  );
}

function ErrorCallout({ text }: { text: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.callout, styles.calloutDanger]} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <View style={styles.flex}>
        <Text variant="subhead" color="danger">
          Couldn’t do that
        </Text>
        <Text variant="footnote" color="text">
          {text}
        </Text>
      </View>
    </View>
  );
}

function EditSheet({
  editing,
  onClose,
  onSave,
  onRemove,
}: {
  editing: { row: ReviewRow; isNew: boolean } | null;
  onClose: () => void;
  onSave: (row: ReviewRow) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <Modal statusBarTranslucent navigationBarTranslucent visible={!!editing} transparent animationType="fade" onRequestClose={onClose}>
      {editing ? <EditForm key={editing.row.key} {...editing} onClose={onClose} onSave={onSave} onRemove={onRemove} /> : null}
    </Modal>
  );
}

function EditForm({
  row,
  isNew,
  onClose,
  onSave,
  onRemove,
}: {
  row: ReviewRow;
  isNew: boolean;
  onClose: () => void;
  onSave: (row: ReviewRow) => void;
  onRemove: (key: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state } = useAcademic();
  const [draft, setDraft] = useState<ReviewRow>({
    ...row,
    start: parseClockTime(row.start) ? clock12(parseClockTime(row.start)!) : row.start,
    end: parseClockTime(row.end) ? clock12(parseClockTime(row.end)!) : row.end,
  });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<ReviewRow>) => setDraft((d) => ({ ...d, ...patch }));

  const startOk = !!parseClockTime(draft.start);
  const endOk = !!parseClockTime(draft.end);
  const problem = rowProblem(draft);

  const submit = () => {
    setTried(true);
    if (problem) return;
    onSave({
      ...draft,
      code: draft.code.trim(),
      title: draft.title.trim(),
      venue: draft.venue.trim(),
      start: parseClockTime(draft.start)!,
      end: parseClockTime(draft.end)!,
      warnings: [], // the student has checked this class
    });
  };

  return (
    <KeyboardSheet backdropStyle={styles.backdrop} sheetStyle={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text variant="title-2">{isNew ? 'Add a class' : 'Edit class'}</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.gap4}>
        {state.courses.length ? (
          <View style={styles.gap2}>
            <Text variant="subhead" color="text-muted">
              Your courses
            </Text>
            <View style={styles.wrap}>
              {state.courses.map((c) => (
                <Chip
                  key={c.id}
                  label={c.code}
                  role="radio"
                  selected={normaliseCode(draft.code) === normaliseCode(c.code)}
                  onPress={() =>
                    set({
                      code: c.code,
                      title: c.title,
                      match: c.serverId && c.onAcademic
                        ? { kind: c.catalogue ? 'enrolled' : 'personal', course_id: c.serverId, code: c.code, title: c.title }
                        : row.match,
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        <TextField
          label="Course code"
          value={draft.code}
          onChangeText={(code) => set({ code })}
          placeholder="CSC 301"
          autoCapitalize="characters"
          autoCorrect={false}
          error={tried && !draft.code.trim() ? 'Add the course code, like CSC 301.' : undefined}
        />
        <TextField
          label="Course title (optional)"
          value={draft.title}
          onChangeText={(title) => set({ title })}
          placeholder="Data Structures"
        />

        <View style={styles.gap2}>
          <Text variant="subhead" color="text-muted">
            Day
          </Text>
          <View style={styles.wrap}>
            {REVIEW_DAYS.map((d) => (
              <Chip key={d} label={d} role="radio" selected={draft.day === d} onPress={() => set({ day: d })} />
            ))}
          </View>
        </View>

        <View style={styles.twoCol}>
          <TextField
            label="Starts"
            value={draft.start}
            onChangeText={(start) => set({ start })}
            placeholder="08:00 AM"
            autoCorrect={false}
            containerStyle={styles.flex}
            error={tried && !startOk ? 'Like 8:00 AM' : undefined}
          />
          <TextField
            label="Ends"
            value={draft.end}
            onChangeText={(end) => set({ end })}
            placeholder="10:00 AM"
            autoCorrect={false}
            containerStyle={styles.flex}
            error={tried && !endOk ? 'Like 10:00 AM' : tried && startOk && endOk && problem ? 'After the start' : undefined}
          />
        </View>

        <TextField
          label="Venue (optional)"
          value={draft.venue}
          onChangeText={(venue) => set({ venue })}
          placeholder="LT 1"
        />

        <Button label={isNew ? 'Add class' : 'Save changes'} icon="checkmark" onPress={submit} block />
        {!isNew ? <Button variant="danger" label="Remove class" icon="trash-outline" onPress={() => onRemove(row.key)} block /> : null}
      </View>
    </KeyboardSheet>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  gap1: { gap: t.space[1] },
  gap2: { gap: t.space[2] },
  gap4: { gap: t.space[4] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], marginTop: t.space[1] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  twoCol: { flexDirection: 'row', gap: t.space[3] },
  pressed: { opacity: 0.7 },

  dropZone: {
    alignItems: 'center',
    gap: t.space[3],
    padding: t.space[5],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors['border-strong'],
    backgroundColor: t.colors['surface-raised'],
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyBox: {
    alignItems: 'center',
    gap: t.space[3],
    paddingVertical: t.space[12],
    paddingHorizontal: t.space[5],
    borderRadius: t.radius.lg,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  callout: {
    flexDirection: 'row',
    gap: t.space[3],
    padding: t.space[4],
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-sunken'],
  },
  calloutWarning: { backgroundColor: t.colors['warning-container'] },
  calloutDanger: { backgroundColor: t.colors['danger-container'] },

  list: {
    borderRadius: t.radius.md,
    backgroundColor: t.colors['surface-raised'],
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  emptyBox: { padding: t.space[6] },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowDivider: { borderTopWidth: 1, borderTopColor: t.colors.border },
  rowMain: { flex: 1, paddingVertical: t.space[3], paddingLeft: t.space[4], paddingRight: t.space[2], minHeight: t.size['touch-target'] },
  iconBtn: {
    width: t.size['touch-target'],
    height: t.size['touch-target'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: t.space[1],
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },

  pasteBox: {
    ...t.type.body,
    color: t.colors.text,
    minHeight: 200,
    padding: t.space[4],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors['border-strong'],
    backgroundColor: t.colors['surface-sunken'],
  },

  backdrop: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: t.space[5],
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.space[5],
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.space[4],
  },
}));
