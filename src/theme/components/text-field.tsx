import React, { forwardRef, useState } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme-provider';
import { Text, MAX_FONT_SCALE } from '../text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Always shown above the field, never only as a placeholder. */
  label: string;
  /** Helper text under the field. */
  help?: string;
  /** Replaces help and turns the edge red. Say how to fix it. */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * A labelled single-line input. Set keyboard and autofill props as the spec
 * asks: keyboardType="email-address" + textContentType="emailAddress",
 * autoComplete="password-new" on sign-up, "one-time-code" on verify.
 */
export const TextField = forwardRef<React.ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, help, error, containerStyle, onFocus, onBlur, editable = true, ...input },
  ref,
) {
  const { colors, radius, space, size, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const message = error ?? help;

  return (
    <View style={[{ gap: space[2] }, containerStyle]}>
      <Text variant="subhead" color="text">
        {label}
      </Text>
      <TextInput
        ref={ref}
        editable={editable}
        accessibilityLabel={label}
        accessibilityHint={message}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={colors['text-subtle']}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          ...type.body,
          color: colors.text,
          minHeight: size.controlHeight,
          paddingHorizontal: space[4],
          backgroundColor: colors['surface-raised'],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors['border-strong'],
          opacity: editable ? 1 : 0.45,
          // 2px focus ring, offset 2px.
          ...(focused
            ? { outlineColor: colors.focus, outlineWidth: 2, outlineOffset: 2, outlineStyle: 'solid' as const }
            : null),
        }}
        {...input}
      />
      {message ? (
        <Text variant="footnote" color={error ? 'danger' : 'text-subtle'} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {message}
        </Text>
      ) : null}
    </View>
  );
});
