import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { StateView } from '@/components/states/state-view';
import { UI } from '@/constants/lexi-ui';

/** Shown for any link or route that doesn't exist. */
export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <StateView
          icon="compass-outline"
          title="Page not found"
          message="This link doesn’t lead anywhere. It may be out of date."
          primary={{ label: 'Go to home', onPress: () => router.replace('/' as Href), icon: 'home-outline' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, justifyContent: 'center' },
});
