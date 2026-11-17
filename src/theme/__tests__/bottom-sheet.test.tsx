import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BottomSheet } from '@/theme';

describe('BottomSheet', () => {
  it('mounts when it becomes visible', async () => {
    const view = await render(<BottomSheet visible={false} onDismiss={() => {}} title="Record this class?" />);
    expect(screen.queryByText('Record this class?')).toBeNull();
    await view.rerender(<BottomSheet visible onDismiss={() => {}} title="Record this class?" />);
    expect(screen.getByText('Record this class?')).toBeOnTheScreen();
  });
});
