import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';

/**
 * Root index that redirects to the appropriate initial screen.
 * For now, always redirects to onboarding.
 * Later, check AsyncStorage to see if onboarding is completed.
 */
export default function RootIndex() {
  // TODO: Check if onboarding has been completed
  // const hasOnboarded = useAsyncStorageValue('hasOnboarded');
  // if (hasOnboarded) return <Redirect href={'/(tabs)' as Href} />;

  return <Redirect href={'/onboarding' as Href} />;
}
