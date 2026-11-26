import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';

/**
 * The old "Zuri Assistant" chat. There is one chat now (Ask Zuri, in Everything
 * mode, which also answers questions about classes, tests and deadlines), so old
 * links and notifications that open /assistant land there.
 */
export default function AssistantRedirect() {
  return <Redirect href={{ pathname: '/ask', params: { mode: 'everything' } } as unknown as Href} />;
}
