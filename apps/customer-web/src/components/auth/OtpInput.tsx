import { useEffect, useRef } from 'react';

export function OtpInput({ value, onChange, disabled = false }: { value: string; onChange(value: string): void; disabled?: boolean }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '');

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next.join('').slice(0, 6));
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  return <div className="otp-input" role="group" aria-label="6-digit verification code" onPaste={(event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
  }}>
    {digits.map((digit, index) => <input
      key={index}
      ref={(element) => { inputs.current[index] = element; }}
      aria-label={`Digit ${index + 1}`}
      autoComplete={index === 0 ? 'one-time-code' : 'off'}
      disabled={disabled}
      inputMode="numeric"
      maxLength={1}
      pattern="[0-9]*"
      value={digit}
      onChange={(event) => setDigit(index, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Backspace' && !digit && index > 0) {
          const next = [...digits];
          next[index - 1] = '';
          onChange(next.join(''));
          inputs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
        if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus();
      }}
    />)}
  </div>;
}
