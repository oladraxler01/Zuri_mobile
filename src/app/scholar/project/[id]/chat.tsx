import { Redirect, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';

/** "Ask your sources" opens the one chat (Ask Zuri) narrowed to this research project. */
export default function ResearchChatRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/ask', params: { projectId: id } } as unknown as Href} />;
}
