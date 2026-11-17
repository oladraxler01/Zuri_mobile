import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, makeStyles, useTheme } from '@/theme';

/**
 * The extra content the course study partner can attach to an answer
 * (POST /academic/courses/:id/partner/chat → widget_type + widget_data):
 *   flashcard_deck { title, cards[{ front, back }] }
 *   quiz_card      { title, questions[{ question, options{A..}, correct_answer, explanation }] }
 *   concept_card   { title, summary, concepts[{ term, definition, example, formula, key_takeaway }] }
 */
export interface PartnerWidgetData {
  type: string;
  data: Record<string, any>;
}

export function PartnerWidget({ widget }: { widget: PartnerWidgetData }) {
  const styles = useStyles();
  const d = widget.data ?? {};
  const title: string | undefined = d.title;

  return (
    <View style={styles.box}>
      {!!title && (
        <Text variant="eyebrow" color="accent-text">
          {String(title).toUpperCase()}
        </Text>
      )}
      {widget.type === 'flashcard_deck' && <Cards cards={Array.isArray(d.cards) ? d.cards : []} />}
      {widget.type === 'quiz_card' && <Quiz questions={Array.isArray(d.questions) ? d.questions : []} />}
      {widget.type === 'concept_card' && <Concepts summary={d.summary} concepts={Array.isArray(d.concepts) ? d.concepts : []} />}
    </View>
  );
}

function Cards({ cards }: { cards: { front: string; back: string }[] }) {
  const styles = useStyles();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={styles.list}>
      {cards.slice(0, 10).map((c, i) => (
        <Pressable
          key={i}
          onPress={() => setOpen(open === i ? null : i)}
          style={styles.item}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === i }}
          accessibilityLabel={open === i ? `${c.front}. Answer: ${c.back}` : `${c.front}. Tap to see the answer`}
        >
          <Text variant="subhead">{c.front}</Text>
          {open === i ? (
            <Text variant="footnote" color="text-muted">
              {c.back}
            </Text>
          ) : (
            <Text variant="caption" color="text-subtle">
              Tap to see the answer
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function Quiz({ questions }: { questions: { question: string; options?: Record<string, string>; correct_answer?: string; explanation?: string }[] }) {
  const styles = useStyles();
  const { colors, size } = useTheme();
  const [picked, setPicked] = useState<Record<number, string>>({});
  return (
    <View style={styles.list}>
      {questions.slice(0, 5).map((q, i) => {
        const choice = picked[i];
        const right = (q.correct_answer ?? '').trim().toUpperCase();
        return (
          <View key={i} style={styles.item}>
            <Text variant="subhead">
              {i + 1}. {q.question}
            </Text>
            {Object.entries(q.options ?? {}).map(([key, text]) => {
              const isChoice = choice === key;
              const isRight = key.trim().toUpperCase() === right;
              const reveal = choice !== undefined;
              return (
                <Pressable
                  key={key}
                  disabled={reveal}
                  onPress={() => setPicked((p) => ({ ...p, [i]: key }))}
                  style={[styles.option, reveal && isRight && styles.optionRight, reveal && isChoice && !isRight && styles.optionWrong]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isChoice, disabled: reveal }}
                >
                  {reveal && (isRight || isChoice) && (
                    <Ionicons
                      name={isRight ? 'checkmark-circle' : 'close-circle'}
                      size={size['icon-sm']}
                      color={isRight ? colors.success : colors.danger}
                    />
                  )}
                  <Text variant="footnote" style={{ flex: 1 }}>
                    {key}. {text}
                  </Text>
                  {reveal && isRight && (
                    <Text variant="caption" color="success">
                      Correct
                    </Text>
                  )}
                  {reveal && isChoice && !isRight && (
                    <Text variant="caption" color="danger">
                      Your answer
                    </Text>
                  )}
                </Pressable>
              );
            })}
            {choice !== undefined && !!q.explanation && (
              <Text variant="caption" color="text-muted">
                {q.explanation}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Concepts({
  summary,
  concepts,
}: {
  summary?: string;
  concepts: { term: string; definition: string; example?: string; formula?: string; key_takeaway?: string }[];
}) {
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {!!summary && (
        <Text variant="footnote" color="text-muted">
          {summary}
        </Text>
      )}
      {concepts.slice(0, 8).map((c, i) => (
        <View key={i} style={styles.item}>
          <Text variant="subhead">{c.term}</Text>
          <Text variant="footnote" color="text-muted">
            {c.definition}
          </Text>
          {!!c.formula && <Text variant="caption">Formula: {c.formula}</Text>}
          {!!c.example && (
            <Text variant="caption" color="text-subtle">
              Example: {c.example}
            </Text>
          )}
          {!!c.key_takeaway && (
            <Text variant="caption" color="accent-text">
              Remember: {c.key_takeaway}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colors, space, radius, size }) => ({
  box: { marginTop: space[3], gap: space[2] },
  list: { gap: space[2] },
  item: {
    backgroundColor: colors['surface-raised'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[3],
    gap: space[1],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: size['touch-target'],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionRight: { backgroundColor: colors['success-container'], borderColor: colors.success },
  optionWrong: { backgroundColor: colors['danger-container'], borderColor: colors.danger },
}));
