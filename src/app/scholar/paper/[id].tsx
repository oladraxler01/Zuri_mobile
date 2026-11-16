import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, Linking, Share, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZuriFonts } from '@/constants/zuri-theme';
import { useResearch } from '@/context/research-context';
import { ED, EdPage, Masthead, Rule, SectionHead, PaperRow, edStyles } from '@/components/research/editorial';
import { ErrorState } from '@/components/states/state-view';
import { citingPapers, getPaper, referencedPapers } from '@/services/scholar-api';
import { formatCitation, keyFindings, sentences, STYLE_LABEL } from '@/utils/research';
import type { CitationStyle, EvidenceStance, Paper } from '@/types/research';

/** Paper reader: metadata, summary, key findings, evidence extraction, citations, related work. */
export default function PaperScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId?: string }>();
  const research = useResearch();
  const [paper, setPaper] = useState<Paper | undefined>(research.papers[id]);
  const [error, setError] = useState('');
  const [citing, setCiting] = useState<Paper[] | null>(null);
  const [refs, setRefs] = useState<Paper[] | null>(null);
  const [style, setStyle] = useState<CitationStyle>('apa');
  const [pick, setPick] = useState<string | null>(null); // sentence being extracted
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getPaper(id)
      .then((p) => {
        setPaper(p);
        if (research.papers[id]) research.cachePaper(p);
      })
      .catch((e) => !research.papers[id] && setError(e.message));
    citingPapers(id).then(setCiting).catch(() => setCiting([]));
    referencedPapers(id).then(setRefs).catch(() => setRefs([]));
  }, [id]);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(''), 2200);
  };

  if (!paper) {
    return (
      <EdPage>
        {error ? <ErrorState kind="network" message={error} compact /> : <ActivityIndicator color={ED.accent} style={{ marginTop: 60 }} />}
      </EdPage>
    );
  }

  const saved = research.isSaved(paper.id);
  const active = research.projects.filter((p) => !p.archived);
  const defaultProject = active.find((p) => p.id === projectId) ?? (active.length === 1 ? active[0] : undefined);

  const extract = (stance: EvidenceStance, targetId: string) => {
    if (!pick) return;
    research.addSource(targetId, paper);
    research.addEvidence(targetId, { paperId: paper.id, quote: pick, stance });
    setPick(null);
    flash(`Added as ${stance} evidence to “${active.find((p) => p.id === targetId)?.title}”`);
  };

  return (
    <EdPage
      right={
        <>
          <Pressable onPress={() => research.toggleSaved(paper)} hitSlop={10} accessibilityLabel={saved ? 'Unsave' : 'Save'}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? ED.accent : ED.ink} />
          </Pressable>
          <Pressable onPress={() => setAddOpen(true)} hitSlop={10} accessibilityLabel="Add to project">
            <Ionicons name="folder-open-outline" size={22} color={ED.ink} />
          </Pressable>
        </>
      }
    >
      <Masthead kicker={[paper.type?.toUpperCase(), paper.year].filter(Boolean).join(' · ')} title={paper.title} />
      <Text style={styles.authors}>{paper.authors.join(', ') || 'Unknown author'}</Text>
      <Rule heavy />

      {/* Metadata */}
      <View style={styles.metaGrid}>
        <Meta label="Published in" value={paper.venue ?? '—'} />
        <Meta label="Year" value={paper.year ? String(paper.year) : '—'} />
        <Meta label="Cited by" value={paper.citedBy.toLocaleString()} />
        <Meta label="References" value={String(paper.referencesCount)} />
      </View>
      {!!paper.doi && <Text style={edStyles.muted}>DOI {paper.doi.replace(/^https?:\/\/doi.org\//, '')}</Text>}
      <View style={styles.actions}>
        {paper.oaUrl ? (
          <Pressable style={edStyles.btn} onPress={() => Linking.openURL(paper.oaUrl!)}>
            <Ionicons name="reader-outline" size={16} color={ED.paper} />
            <Text style={edStyles.btnText}>Read full text</Text>
          </Pressable>
        ) : null}
        {!!paper.url && (
          <Pressable style={edStyles.btnGhost} onPress={() => Linking.openURL(paper.url!)}>
            <Text style={edStyles.btnGhostText}>Publisher page</Text>
          </Pressable>
        )}
      </View>

      {/* Summary + evidence extraction */}
      <SectionHead title="Summary" />
      {paper.abstract ? (
        <>
          <Text style={edStyles.muted}>Tap a sentence to save it as evidence in a project.</Text>
          <Text style={edStyles.serifBody}>
            {sentences(paper.abstract).map((s, i) => (
              <Text key={i} onPress={() => setPick(s)} style={pick === s ? styles.picked : undefined} suppressHighlighting={false}>
                {s}{' '}
              </Text>
            ))}
          </Text>
        </>
      ) : (
        <Text style={edStyles.muted}>No abstract is available for this paper. Open the full text or publisher page to read it.</Text>
      )}

      {paper.abstract && (
        <>
          <SectionHead title="Key findings" />
          {keyFindings(paper).map((f) => (
            <Pressable key={f} style={styles.finding} onPress={() => setPick(f)}>
              <View style={styles.findingBar} />
              <Text style={[edStyles.body, { flex: 1 }]}>{f}</Text>
            </Pressable>
          ))}
        </>
      )}

      {paper.topics.length > 0 && (
        <>
          <SectionHead title="Topics" />
          <View style={styles.tags}>
            {paper.topics.map((t) => (
              <Pressable key={t} style={edStyles.tag} onPress={() => router.push({ pathname: '/scholar/search', params: { q: t } } as any)}>
                <Text style={edStyles.tagText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Citation */}
      <SectionHead title="Cite this paper" />
      <View style={styles.tags}>
        {(Object.keys(STYLE_LABEL) as CitationStyle[]).map((s) => (
          <Pressable key={s} style={[edStyles.tag, style === s && edStyles.tagOn]} onPress={() => setStyle(s)}>
            <Text style={[edStyles.tagText, style === s && { color: ED.paper }]}>{STYLE_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.citeBox}>
        <Text style={styles.cite} selectable>
          {formatCitation(paper, style)}
        </Text>
      </View>
      <Pressable style={edStyles.btnGhost} onPress={() => Share.share({ message: formatCitation(paper, style) })}>
        <Ionicons name="share-outline" size={16} color={ED.ink} />
        <Text style={edStyles.btnGhostText}>Share citation</Text>
      </Pressable>

      {/* Related work */}
      <SectionHead title="Cited by (most influential)" />
      {citing === null ? <ActivityIndicator color={ED.accent} /> : citing.length ? citing.map((p) => <PaperRow key={p.id} paper={p} />) : <Text style={edStyles.muted}>No citing papers found.</Text>}
      <SectionHead title="References (most cited)" />
      {refs === null ? <ActivityIndicator color={ED.accent} /> : refs.length ? refs.map((p) => <PaperRow key={p.id} paper={p} />) : <Text style={edStyles.muted}>No references listed.</Text>}

      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Evidence sheet */}
      <Modal visible={!!pick} transparent animationType="slide" onRequestClose={() => setPick(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetKicker}>SAVE AS EVIDENCE</Text>
            <Text style={styles.sheetQuote}>“{pick}”</Text>
            {active.length === 0 ? (
              <>
                <Text style={edStyles.muted}>Create a project to collect evidence.</Text>
                <Pressable style={edStyles.btn} onPress={() => { setPick(null); router.push('/scholar/project/new' as Href); }}>
                  <Text style={edStyles.btnText}>New project</Text>
                </Pressable>
              </>
            ) : (
              (defaultProject ? [defaultProject] : active).map((proj) => (
                <View key={proj.id} style={{ gap: 8 }}>
                  {!defaultProject && <Text style={styles.sheetProject}>{proj.title}</Text>}
                  <View style={styles.stanceRow}>
                    {(['supports', 'contradicts', 'background'] as EvidenceStance[]).map((s) => (
                      <Pressable key={s} style={[edStyles.btnGhost, { flex: 1, paddingHorizontal: 6 }]} onPress={() => extract(s, proj.id)}>
                        <Text style={edStyles.btnGhostText}>{s[0].toUpperCase() + s.slice(1)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}
            <Pressable onPress={() => setPick(null)} style={{ alignSelf: 'center', padding: 10 }}>
              <Text style={edStyles.muted}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add to project */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetKicker}>ADD TO PROJECT</Text>
            {active.map((proj) => {
              const has = proj.sourceIds.includes(paper.id);
              return (
                <Pressable
                  key={proj.id}
                  style={styles.projRow}
                  onPress={() => (has ? research.removeSource(proj.id, paper.id) : research.addSource(proj.id, paper))}
                >
                  <Ionicons name={has ? 'checkbox' : 'square-outline'} size={22} color={has ? ED.accent : ED.ink} />
                  <Text style={styles.projName}>{proj.title}</Text>
                </Pressable>
              );
            })}
            <Pressable style={edStyles.btnGhost} onPress={() => { setAddOpen(false); router.push('/scholar/project/new' as Href); }}>
              <Text style={edStyles.btnGhostText}>New project</Text>
            </Pressable>
            <Pressable onPress={() => setAddOpen(false)} style={edStyles.btn}>
              <Text style={edStyles.btnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </EdPage>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  authors: { fontFamily: ZuriFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: ED.inkSoft },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  meta: { width: '50%', paddingVertical: 8 },
  metaLabel: { fontFamily: ZuriFonts.labelSmBold, fontSize: 10, letterSpacing: 1.4, color: ED.muted },
  metaValue: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 16, color: ED.ink, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  picked: { backgroundColor: ED.accentSoft },
  finding: { flexDirection: 'row', gap: 12 },
  findingBar: { width: 3, backgroundColor: ED.accent },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  citeBox: { borderLeftWidth: 3, borderLeftColor: ED.ink, paddingLeft: 12, paddingVertical: 4 },
  cite: { fontFamily: 'SourceSerif4_400Regular', fontSize: 14, lineHeight: 21, color: ED.ink },
  toast: { backgroundColor: ED.ink, padding: 12 },
  toastText: { fontFamily: ZuriFonts.bodyMedium, fontSize: 13, color: ED.paper },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: ED.paper, padding: 22, paddingBottom: 32, gap: 12 },
  sheetKicker: { fontFamily: ZuriFonts.labelSmBold, fontSize: 11, letterSpacing: 1.8, color: ED.accent },
  sheetQuote: { fontFamily: 'SourceSerif4_400Regular', fontSize: 16, lineHeight: 24, color: ED.ink, fontStyle: 'italic' },
  sheetProject: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 16, color: ED.ink },
  stanceRow: { flexDirection: 'row', gap: 8 },
  projRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ED.rule },
  projName: { flex: 1, fontFamily: 'SourceSerif4_600SemiBold', fontSize: 16, color: ED.ink },
});
