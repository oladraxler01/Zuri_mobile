import React from 'react';
import { Text, View, StyleSheet, type TextStyle } from 'react-native';
import { ZuriFonts } from '@/constants/zuri-theme';
import { UI } from '@/constants/zuri-ui';

/**
 * Just enough Markdown for Zuri's answers: headings (#), bullets (- * •),
 * numbered lists, **bold**, *italic* and `code`. Everything else is plain text.
 */
export function MarkdownText({ text, style }: { text: string; style?: TextStyle }) {
  const blocks = text.replace(/\r/g, '').split('\n');
  return (
    <View style={{ gap: 4 }}>
      {blocks.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <Text key={i} style={[style, styles.heading]}>
              {inline(heading[1], style)}
            </Text>
          );
        }
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (bullet || numbered) {
          const indent = (line.match(/^\s*/)?.[0].length ?? 0) >= 2 ? 14 : 0;
          return (
            <View key={i} style={[styles.row, { paddingLeft: indent }]}>
              <Text style={[style, styles.marker]}>{bullet ? '•' : `${numbered![1]}.`}</Text>
              <Text style={[style, { flex: 1 }]}>{inline(bullet ? bullet[1] : numbered![2], style)}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={style}>
            {inline(line, style)}
          </Text>
        );
      })}
    </View>
  );
}

function inline(s: string, style?: TextStyle): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return parts.map((p, k) => {
    if (p.startsWith('**') && p.endsWith('**')) return <Text key={k} style={[style, styles.bold]}>{p.slice(2, -2)}</Text>;
    if (p.startsWith('`') && p.endsWith('`')) return <Text key={k} style={[style, styles.code]}>{p.slice(1, -1)}</Text>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <Text key={k} style={[style, styles.italic]}>{p.slice(1, -1)}</Text>;
    return p;
  });
}

const styles = StyleSheet.create({
  heading: { fontFamily: ZuriFonts.headlineMd, fontSize: 16, marginTop: 4 },
  row: { flexDirection: 'row', gap: 6 },
  marker: { minWidth: 14 },
  bold: { fontFamily: ZuriFonts.labelSmBold },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: ZuriFonts.bodyMedium, backgroundColor: UI.card, color: UI.ink },
});
