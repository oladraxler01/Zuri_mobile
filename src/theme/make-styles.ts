import { StyleSheet } from 'react-native';
import { useTheme, type Theme } from './theme-provider';

/** What StyleSheet.create accepts (RN's own type isn't exported under a stable name). */
type NamedStyles = Parameters<typeof StyleSheet.create>[0];

/**
 * Theme-aware StyleSheet. Define styles once at module level from the theme,
 * then call the returned hook inside each component that uses them:
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.colors['surface-raised'], borderRadius: t.radius.lg, padding: t.space[4] },
 *     title: { ...t.type.headline, color: t.colors.text },
 *   }));
 *
 *   function MyCard() {
 *     const styles = useStyles();
 *     return <View style={styles.card} />;
 *   }
 *
 * Styles are built once per theme (light/dark) and cached.
 */
// `S & NamedStyles` gives the factory's object literal a contextual type, so
// values like 'row' and 'center' keep their literal types (as in StyleSheet.create).
export function makeStyles<S extends NamedStyles>(factory: (t: Theme) => S & NamedStyles) {
  const cache = new WeakMap<Theme, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const theme = useTheme();
    const cached = cache.get(theme);
    if (cached) return cached;
    const styles = StyleSheet.create(factory(theme));
    cache.set(theme, styles);
    return styles;
  };
}
