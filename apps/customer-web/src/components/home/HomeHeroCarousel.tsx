import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export interface HomeHeroSlide {
  id: string;
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export function HomeHeroCarousel({ slides }: { slides: HomeHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasMultipleSlides = slides.length > 1;

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasMultipleSlides || paused || reduceMotion) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(interval);
  }, [hasMultipleSlides, paused, slides.length]);

  const selectSlide = (index: number) => setActiveIndex((index + slides.length) % slides.length);

  return (
    <div
      className="home-hero-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Vishwaneed marketplace highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="home-hero-track" style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}>
        {slides.map((slide, index) => (
          <article className="home-hero-slide" key={slide.id} aria-hidden={index !== activeIndex}>
            <img src={slide.imageUrl} width="1200" height="650" fetchPriority={index === 0 ? 'high' : 'auto'} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" alt={slide.imageAlt} />
            <div className="hero-copy">
              <span className="eyebrow eyebrow--light">{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.description}</p>
              <Link className="button button--light" to={slide.href} tabIndex={index === activeIndex ? undefined : -1}>{slide.ctaLabel} <ArrowRight size={18} /></Link>
            </div>
          </article>
        ))}
      </div>
      {hasMultipleSlides && <>
        <button className="hero-carousel-control hero-carousel-control--previous" type="button" aria-label="Previous highlight" onClick={() => selectSlide(activeIndex - 1)}><ChevronLeft aria-hidden="true" /></button>
        <button className="hero-carousel-control hero-carousel-control--next" type="button" aria-label="Next highlight" onClick={() => selectSlide(activeIndex + 1)}><ChevronRight aria-hidden="true" /></button>
        <div className="hero-carousel-dots" role="group" aria-label="Choose a highlight">
          {slides.map((slide, index) => <button className={index === activeIndex ? 'is-active' : ''} type="button" key={slide.id} aria-label={`Show highlight ${index + 1}: ${slide.title}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => selectSlide(index)} />)}
        </div>
      </>}
    </div>
  );
}
