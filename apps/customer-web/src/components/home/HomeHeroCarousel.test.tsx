import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomeHeroCarousel, type HomeHeroSlide } from './HomeHeroCarousel';

const slides: HomeHeroSlide[] = [
  { id: 'one', imageUrl: '/one.jpg', imageAlt: 'First', eyebrow: 'Natural', title: 'First slide', description: 'First description', ctaLabel: 'Shop now', href: '/products' },
  { id: 'two', imageUrl: '/two.jpg', imageAlt: 'Second', eyebrow: 'Approved', title: 'Second slide', description: 'Second description', ctaLabel: 'Shop product', href: '/products/two' },
];

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HomeHeroCarousel', () => {
  it('moves to the requested slide without replacing its real content', () => {
    const view = render(<MemoryRouter><HomeHeroCarousel slides={slides} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Next highlight' }));

    expect(view.container.querySelector('.home-hero-track')).toHaveStyle({ transform: 'translate3d(-100%, 0, 0)' });
    expect(screen.getByText('Second slide').closest('article')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('link', { name: /Shop product/i })).toHaveAttribute('href', '/products/two');
  });

  it('auto-advances after the configured interval', async () => {
    vi.useFakeTimers();
    const view = render(<MemoryRouter><HomeHeroCarousel slides={slides} /></MemoryRouter>);

    await act(async () => vi.advanceTimersByTimeAsync(5500));

    expect(view.container.querySelector('.home-hero-track')).toHaveStyle({ transform: 'translate3d(-100%, 0, 0)' });
  });
});
