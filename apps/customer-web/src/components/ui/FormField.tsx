import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

interface FormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  hint?: string;
}

export function FormField({ label, registration, error, hint, ...inputProps }: FormFieldProps) {
  const id = `field-${registration.name}`;
  return <label className="form-field" htmlFor={id}><span>{label}</span><input id={id} {...inputProps} {...registration} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />{hint && !error && <small id={`${id}-hint`}>{hint}</small>}{error && <small className="field-error" id={`${id}-error`}>{error.message}</small>}</label>;
}
