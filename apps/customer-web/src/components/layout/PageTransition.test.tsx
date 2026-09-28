import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageTransition } from './PageTransition';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PageTransition', () => {
  it('keeps both pages mounted during the slide and completes after 480ms', async () => {
    vi.useFakeTimers();
    const view = render(<PageTransition transitionKey="/" direction="forward"><div>Home page</div></PageTransition>);

    view.rerender(<PageTransition transitionKey="/products" direction="forward"><div>Products page</div></PageTransition>);

    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.getByText('Products page')).toBeInTheDocument();
    expect(view.container.querySelector('.is-forward')).not.toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(480));

    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
    expect(screen.getByText('Products page')).toBeInTheDocument();
  });

  it('applies the reverse direction for back navigation', () => {
    vi.useFakeTimers();
    const view = render(<PageTransition transitionKey="/products" direction="forward"><div>Products page</div></PageTransition>);

    view.rerender(<PageTransition transitionKey="/" direction="back"><div>Home page</div></PageTransition>);

    expect(view.container.querySelector('.is-back')).not.toBeNull();
  });
});
