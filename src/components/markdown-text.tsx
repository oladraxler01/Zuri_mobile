import React, { useMemo } from 'react';
import { Text, View, StyleSheet, type TextStyle } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Just enough Markdown for Zuri's answers: headings (#), bullets (- * •),
 * numbered lists, **bold**, *italic* and `code`. Everything else is plain text.
 * `style` is the base text style (colour, size); headings use the `headline` type style.
 */
export function MarkdownText({ text, style }: { text: string; style?: TextStyle }) {
  const { colors, space, radius, type } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        heading: { ...type.headline, color: colors.text, marginTop: space[1] },
        row: { flexDirection: 'row', gap: space[2] },
        marker: { minWidth: space[3] },
        bold: { fontFamily: type.headline.fontFamily },
        italic: { fontStyle: 'italic' },
        code: { fontFamily: type.subhead.fontFamily, backgroundColor: colors['surface-sunken'], color: colors.text, borderRadius: radius.sm },
      }),
    [colors]
  );

  const inline = (s: string): React.ReactNode[] =>
    s
      .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g)
      .filter(Boolean)
      .map((p, k) => {
        if (p.startsWith('**') && p.endsWith('**')) return <Text key={k} style={[style, styles.bold]}>{p.slice(2, -2)}</Text>;
        if (p.startsWith('`') && p.endsWith('`')) return <Text key={k} style={[style, styles.code]}>{p.slice(1, -1)}</Text>;
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <Text key={k} style={[style, styles.italic]}>{p.slice(1, -1)}</Text>;
        return p;
      });

  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View style={{ gap: space[1] }}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: space[1] }} />;
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <Text key={i} style={styles.heading} accessibilityRole="header">
              {inline(heading[1])}
            </Text>
          );
        }
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (bullet || numbered) {
          const nested = (line.match(/^\s*/)?.[0].length ?? 0) >= 2;
          return (
            <View key={i} style={[styles.row, nested && { paddingLeft: space[4] }]}>
              <Text style={[style, styles.marker]}>{bullet ? '•' : `${numbered![1]}.`}</Text>
              <Text style={[style, { flex: 1 }]}>{inline(bullet ? bullet[1] : numbered![2])}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={style}>
            {inline(line)}
          </Text>
        );
      })}
    </View>
  );
}
