import React from 'react';
import { Keyboard, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/**
 * Body of a form pop-up (inside a transparent <Modal>): moves above the
 * keyboard, scrolls when the form is taller than the space left, and closes
 * the keyboard when you tap outside a field or drag the form.
 */
export function KeyboardSheet({
  backdropStyle,
  sheetStyle,
  children,
}: {
  backdropStyle: StyleProp<ViewStyle>;
  sheetStyle: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Pressable style={backdropStyle} onPress={Keyboard.dismiss} accessible={false}>
        <Pressable style={[sheetStyle, { maxHeight: '90%' }]} onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} bounces={false}>
            {children}
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
