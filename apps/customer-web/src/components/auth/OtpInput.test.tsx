import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { OtpInput } from './OtpInput';

function Harness() {
  const [value, setValue] = useState('');
  return <><OtpInput value={value} onChange={setValue} /><output>{value}</output></>;
}

describe('OtpInput', () => {
  it('accepts a pasted six-digit code without storing anything outside component state', () => {
    render(<Harness />);
    const group = screen.getByRole('group', { name: '6-digit verification code' });
    fireEvent.paste(group, { clipboardData: { getData: () => '12 34-56' } });
    expect(screen.getByText('123456')).toBeInTheDocument();
  });

  it('moves focus forward as digits are entered', () => {
    render(<Harness />);
    const first = screen.getByLabelText('Digit 1');
    fireEvent.change(first, { target: { value: '4' } });
    expect(screen.getByLabelText('Digit 2')).toHaveFocus();
  });

  it('supports moving backward with Backspace', () => {
    render(<Harness />);
    const second = screen.getByLabelText('Digit 2');
    second.focus();
    fireEvent.keyDown(second, { key: 'Backspace' });
    expect(screen.getByLabelText('Digit 1')).toHaveFocus();
  });
});
