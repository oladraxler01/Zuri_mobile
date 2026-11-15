import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';
import type { Lecture, LectureConcept, TranscriptSegment } from '@/types/lecture';
import { formatClock } from '@/utils/time';
import { searchTranscript } from '@/utils/transcript-search';
import { tabStyles as t } from './tab-styles';

interface Props {
  lecture: Lecture;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
  onOpenQuiz: () => void;
  /** flashcard self-rating: knew it or not */
  onCard?: (card: { question: string; answer: string }, knew: boolean) => void;
}

type ChatMsg = { role: 'user' | 'lexi'; text: string; refs?: TranscriptSegment[] };

/** Summary, "what you need to know", knowledge gap and study actions. */
export function OverviewTab({ lecture, canSeek, onSeek, onOpenQuiz, onCard }: Props) {
  const a = lecture.analysis!;
  const [concept, setConcept] = useState<LectureConcept | null>(null);
  const [gapOpen, setGapOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  return (
    <>
      <ScrollView contentContainerStyle={t.scroll} showsVerticalScrollIndicator={false}>
        {a.source === 'sample' && (
          <View style={t.banner}>
            <Ionicons name="information-circle-outline" size={18} color={UI.amber} />
            <Text style={t.bannerText}>
              Sample results. The transcription server isn't connected yet, so this shows example content instead of
              your recording's.
            </Text>
          </View>
        )}

        <Text style={t.sectionHeading}>Summary</Text>
        <Text style={t.body}>{a.summary}</Text>

        <Text style={[t.sectionHeading, { marginTop: 28 }]}>What you need to know</Text>
        <View style={styles.grid}>
          {a.concepts.map((c, i) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                styles.concept,
                i === a.concepts.length - 1 && a.concepts.length % 2 === 1 && styles.conceptFull,
                pressed && t.pressed,
              ]}
              onPress={() => setConcept(c)}
              accessibilityRole="button"
            >
              <View style={styles.conceptTop}>
                <Text style={styles.conceptTitle}>
                  {i + 1}. {c.title}
                </Text>
                <Ionicons name={c.icon} size={18} color="rgba(39,46,10,0.45)" />
              </View>
              <Text style={styles.conceptSummary}>{c.summary}</Text>
            </Pressable>
          ))}
        </View>

        {a.knowledgeGap && (
          <View style={styles.gap}>
            <View style={styles.gapIcon}>
              <Ionicons name="flag" size={14} color={UI.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gapLabel}>WORTH REVISITING</Text>
              <Text style={styles.gapTitle}>{a.knowledgeGap.concept}</Text>
              <Text style={styles.gapReason}>{a.knowledgeGap.reason}</Text>
              <Pressable style={styles.gapLink} onPress={() => setGapOpen(true)}>
                <Text style={styles.gapLinkText}>Review concept</Text>
                <Ionicons name="arrow-forward" size={14} color={UI.ink} />
              </Pressable>
            </View>
          </View>
        )}

        <Text style={[t.sectionHeading, { marginTop: 28 }]}>Study this lecture</Text>
        <View style={{ gap: 10 }}>
          <Pressable style={({ pressed }) => [t.primaryBtn, pressed && t.pressed]} onPress={onOpenQuiz}>
            <Ionicons name="help-circle-outline" size={18} color="#fff" />
            <Text style={t.primaryBtnText}>Take the quiz · {a.questions.length} questions</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [t.secondaryBtn, pressed && t.pressed]} onPress={() => setCardsOpen(true)}>
            <Ionicons name="albums-outline" size={18} color={UI.ink} />
            <Text style={t.secondaryBtnText}>Flashcards · {a.flashcards.length}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [t.secondaryBtn, { borderColor: UI.amber }, pressed && t.pressed]}
            onPress={() => setAskOpen(true)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={UI.amber} />
            <Text style={[t.secondaryBtnText, { color: '#7a4f12' }]}>Ask about this lecture</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConceptSheet
        concept={concept}
        lecture={lecture}
        canSeek={canSeek}
        onSeek={(s) => {
          setConcept(null);
          onSeek(s);
        }}
        onClose={() => setConcept(null)}
      />

      {a.knowledgeGap && (
        <Modal visible={gapOpen} transparent animationType="slide" onRequestClose={() => setGapOpen(false)}>
          <View style={t.backdrop}>
            <View style={t.sheet}>
              <View style={t.sheetHeader}>
                <Text style={t.sheetTitle}>{a.knowledgeGap.concept}</Text>
                <Pressable onPress={() => setGapOpen(false)} hitSlop={10} accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={UI.ink} />
                </Pressable>
              </View>
              <ScrollView>
                <Text style={t.body}>{a.knowledgeGap.explanation ?? a.knowledgeGap.reason}</Text>
              </ScrollView>
              <Pressable
                style={({ pressed }) => [t.primaryBtn, { marginTop: 18 }, pressed && t.pressed]}
                onPress={() => setGapOpen(false)}
              >
                <Text style={t.primaryBtnText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      <FlashcardSheet visible={cardsOpen} lecture={lecture} onClose={() => setCardsOpen(false)} onCard={onCard} />
      <AskSheet
        visible={askOpen}
        lecture={lecture}
        canSeek={canSeek}
        onSeek={(s) => {
          setAskOpen(false);
          onSeek(s);
        }}
        onClose={() => setAskOpen(false)}
      />
    </>
  );
}

function TranscriptRef({
  seg,
  canSeek,
  onSeek,
}: {
  seg: TranscriptSegment;
  canSeek: boolean;
  onSeek: (s: number) => void;
}) {
  return (
    <Pressable
      disabled={!canSeek}
      onPress={() => onSeek(seg.start)}
      style={({ pressed }) => [styles.ref, pressed && t.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play from ${formatClock(seg.start)}`}
    >
      <View style={t.timeChip}>
        <Text style={t.timeChipText}>{formatClock(seg.start)}</Text>
      </View>
      <Text style={styles.refText}>"{seg.text}"</Text>
      {canSeek && <Ionicons name="play-circle-outline" size={18} color={UI.amber} />}
    </Pressable>
  );
}

function ConceptSheet({
  concept,
  lecture,
  canSeek,
  onSeek,
  onClose,
}: {
  concept: LectureConcept | null;
  lecture: Lecture;
  canSeek: boolean;
  onSeek: (s: number) => void;
  onClose: () => void;
}) {
  const mentions = concept ? searchTranscript(lecture.analysis!.transcript, concept.title, 3) : [];
  return (
    <Modal visible={!!concept} transparent animationType="slide" onRequestClose={onClose}>
      <View style={t.backdrop}>
        <View style={t.sheet}>
          <View style={t.sheetHeader}>
            <Text style={t.sheetTitle}>{concept?.title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={UI.ink} />
            </Pressable>
          </View>
          <ScrollView>
            <Text style={t.body}>{concept?.summary}</Text>
            {mentions.length > 0 && (
              <>
                <Text style={styles.subLabel}>WHERE IT CAME UP</Text>
                <View style={{ gap: 8 }}>
                  {mentions.map((m) => (
                    <TranscriptRef key={m.start} seg={m} canSeek={canSeek} onSeek={onSeek} />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FlashcardSheet({
  visible,
  lecture,
  onClose,
  onCard,
}: {
  visible: boolean;
  lecture: Lecture;
  onClose: () => void;
  onCard?: (card: { question: string; answer: string }, knew: boolean) => void;
}) {
  const cards = lecture.analysis!.flashcards;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const close = () => {
    setIdx(0);
    setFlipped(false);
    onClose();
  };

  if (!cards.length) return null;
  const card = cards[idx];
  const last = idx === cards.length - 1;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={t.backdrop}>
        <View style={t.sheet}>
          <View style={t.sheetHeader}>
            <Text style={t.sheetTitle}>
              Flashcards · {idx + 1}/{cards.length}
            </Text>
            <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={UI.ink} />
            </Pressable>
          </View>

          <View style={styles.dots}>
            {cards.map((_, i) => (
              <View key={i} style={[styles.dot, i <= idx && styles.dotOn]} />
            ))}
          </View>

          <Pressable
            style={[styles.flashcard, flipped && styles.flashcardFlipped]}
            onPress={() => setFlipped((f) => !f)}
            accessibilityRole="button"
            accessibilityHint="Tap to flip"
          >
            <Text style={[styles.flashTag, flipped && { color: UI.amber }]}>
              {flipped ? 'ANSWER' : 'QUESTION · TAP TO FLIP'}
            </Text>
            <Text style={[styles.flashText, flipped && { color: '#fff' }]}>
              {flipped ? card.answer : card.question}
            </Text>
          </Pressable>

          {flipped && onCard ? (
          <View style={styles.flashNav}>
            <Pressable
              style={({ pressed }) => [t.secondaryBtn, { flex: 1 }, pressed && t.pressed]}
              onPress={() => {
                onCard(card, false);
                if (last) return close();
                setFlipped(false);
                setIdx((i) => i + 1);
              }}
            >
              <Ionicons name="refresh" size={18} color={UI.ink} />
              <Text style={t.secondaryBtnText}>Still learning</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [t.primaryBtn, { flex: 1 }, pressed && t.pressed]}
              onPress={() => {
                onCard(card, true);
                if (last) return close();
                setFlipped(false);
                setIdx((i) => i + 1);
              }}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={t.primaryBtnText}>Got it</Text>
            </Pressable>
          </View>
          ) : (
          <View style={styles.flashNav}>
            <Pressable
              style={({ pressed }) => [t.secondaryBtn, { flex: 1 }, idx === 0 && { opacity: 0.4 }, pressed && t.pressed]}
              disabled={idx === 0}
              onPress={() => {
                setFlipped(false);
                setIdx((i) => i - 1);
              }}
            >
              <Ionicons name="arrow-back" size={18} color={UI.ink} />
              <Text style={t.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [t.primaryBtn, { flex: 1 }, pressed && t.pressed]}
              onPress={() => {
                if (last) return close();
                setFlipped(false);
                setIdx((i) => i + 1);
              }}
            >
              <Text style={t.primaryBtnText}>{last ? 'Done' : 'Next'}</Text>
              {!last && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </Pressable>
          </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function AskSheet({
  visible,
  lecture,
  canSeek,
  onSeek,
  onClose,
}: {
  visible: boolean;
  lecture: Lecture;
  canSeek: boolean;
  onSeek: (s: number) => void;
  onClose: () => void;
}) {
  const transcript = lecture.analysis!.transcript;
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: 'lexi',
      text: `Ask me anything about this ${lecture.courseCode} lecture. I'll point you to the exact moments in the recording.`,
    },
  ]);

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    const refs = searchTranscript(transcript, q, 2);
    const reply: ChatMsg = refs.length
      ? { role: 'lexi', text: 'Here is what was said about that:', refs }
      : {
          role: 'lexi',
          text: "I couldn't find that in this lecture's transcript. Try different words, or check the Transcript tab.",
        };
    setMsgs((m) => [...m, { role: 'user', text: q }, reply]);
    setInput('');
  };

  const suggestions = lecture.analysis!.concepts.slice(0, 3).map((c) => `What is ${c.title.toLowerCase()}?`);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={t.backdrop}>
        <View style={[t.sheet, { height: '85%' }]}>
          <View style={t.sheetHeader}>
            <Text style={t.sheetTitle}>Ask about this lecture</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={UI.ink} />
            </Pressable>
          </View>
          <Text style={styles.askNote}>Answers come from this lecture's transcript.</Text>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
            {msgs.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleLexi]}>
                <Text style={[styles.bubbleText, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
                {m.refs?.map((r) => (
                  <View key={r.start} style={{ marginTop: 8 }}>
                    <TranscriptRef seg={r} canSeek={canSeek} onSeek={onSeek} />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {suggestions.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question…"
              placeholderTextColor={UI.muted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
            />
            <Pressable style={styles.send} onPress={() => send()} accessibilityLabel="Send">
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  concept: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
  },
  conceptFull: {
    flexBasis: '100%',
  },
  conceptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  conceptTitle: {
    flex: 1,
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: UI.ink,
  },
  conceptSummary: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: UI.inkSoft,
  },
  gap: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff8f6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.errorSoft,
    padding: 16,
    marginTop: 20,
  },
  gapIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: UI.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapLabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: UI.error,
  },
  gapTitle: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 18,
    color: UI.ink,
    marginTop: 2,
    marginBottom: 4,
  },
  gapReason: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    color: UI.inkSoft,
  },
  gapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  gapLinkText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 14,
    color: UI.ink,
    textDecorationLine: 'underline',
  },
  subLabel: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: UI.muted,
    marginTop: 20,
    marginBottom: 10,
  },
  ref: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: UI.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    padding: 10,
  },
  refText: {
    flex: 1,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: UI.inkSoft,
    fontStyle: 'italic',
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: UI.cardMuted,
  },
  dotOn: {
    backgroundColor: UI.amber,
  },
  flashcard: {
    minHeight: 200,
    borderRadius: 20,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 22,
    justifyContent: 'center',
  },
  flashcardFlipped: {
    backgroundColor: UI.ink,
    borderColor: UI.ink,
  },
  flashTag: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: UI.muted,
    marginBottom: 12,
  },
  flashText: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 19,
    lineHeight: 27,
    color: UI.ink,
  },
  flashNav: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  askNote: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 12,
    color: UI.muted,
    marginTop: -8,
    marginBottom: 6,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: UI.ink,
  },
  bubbleLexi: {
    alignSelf: 'flex-start',
    backgroundColor: UI.cardMuted,
  },
  bubbleText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    color: UI.ink,
  },
  chips: {
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: UI.card,
  },
  chipText: {
    fontFamily: LexiFonts.bodyMedium,
    fontSize: 13,
    color: UI.ink,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 16,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    color: UI.ink,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
