import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, Chip, StateView, Text, lightColors } from '@/theme';

// RNTL 14: render and fireEvent are async.

describe('Button', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Start class" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start class' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while loading or disabled', async () => {
    const onPress = jest.fn();
    const view = await render(<Button label="Upload notes" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Upload notes' }));
    await view.rerender(<Button label="Upload notes" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Upload notes' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('exposes its selected state to screen readers', async () => {
    await render(<Chip label="Examples first" selected onPress={() => {}} role="radio" />);
    expect(screen.getByRole('radio', { name: 'Examples first' })).toBeChecked();
  });
});

describe('Text', () => {
  it('applies the variant and colour token', async () => {
    await render(
      <Text variant="eyebrow" color="accent-text">
        BEFORE CLASS
      </Text>,
    );
    expect(screen.getByText('BEFORE CLASS')).toHaveStyle({ fontSize: 11, color: lightColors['accent-text'] });
  });
});

describe('StateView', () => {
  it('shows the error with a retry action', async () => {
    const onAction = jest.fn();
    await render(
      <StateView
        kind="error"
        title="Couldn't load your timetable"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={onAction}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onAction).toHaveBeenCalled();
  });
});
