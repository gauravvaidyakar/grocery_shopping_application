import { ArrowRight, BadgeCheck, Image as ImageIcon, MapPin, PackageCheck, Star, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import heroVegetables from '../assets/vishwaneed_hero_vegetables_image.webp';
import { HomeHeroCarousel, type HomeHeroSlide } from '../components/home/HomeHeroCarousel';
import { ScrollReveal } from '../components/home/ScrollReveal';
import { ProductGrid } from '../components/product/ProductGrid';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { useCategories, useHomeHeroSlides, useProducts } from '../features/catalogue/hooks';
import type { VendorSummary } from '../api/types';

const storyImage = 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=960&q=76';

export function HomePage() {
  const managedHero = useHomeHeroSlides();
  const categories = useCategories();
  const featured = useProducts({ limit: 4, page: 1, sort: 'NEWEST' });
  const bestSellers = useProducts({ sort: 'POPULAR', limit: 4, page: 1 });
  const featuredVendors = useMemo(() => {
    const vendors = new Map<string, VendorSummary>();
    [...(featured.data?.items ?? []), ...(bestSellers.data?.items ?? [])].forEach((product) => {
      vendors.set(product.vendor.id, product.vendor);
    });
    return [...vendors.values()].slice(0, 4);
  }, [bestSellers.data?.items, featured.data?.items]);
  const offers = useMemo(() => [...(featured.data?.items ?? []), ...(bestSellers.data?.items ?? [])]
    .filter((product, index, all) => product.mrp && product.mrp.amount > product.price.amount && all.findIndex((candidate) => candidate.id === product.id) === index)
    .slice(0, 4), [bestSellers.data?.items, featured.data?.items]);
  const trending = useMemo(() => [...(bestSellers.data?.items ?? []), ...(featured.data?.items ?? [])]
    .filter((product, index, all) => all.findIndex((candidate) => candidate.id === product.id) === index)
    .slice(0, 4), [bestSellers.data?.items, featured.data?.items]);
  const heroSlides = useMemo<HomeHeroSlide[]>(() => {
    if (managedHero.data?.length) {
      return managedHero.data.map((slide) => ({
        id: slide.id,
        imageUrl: slide.imageUrl,
        imageAlt: slide.imageAlt,
        eyebrow: slide.eyebrow,
        title: slide.title,
        description: slide.description,
        ctaLabel: slide.ctaLabel,
        href: slide.ctaHref,
      }));
    }
    const slides: HomeHeroSlide[] = [{
      id: 'vishwaneed-marketplace',
      imageUrl: heroVegetables,
      imageAlt: 'A fresh harvest of bitter gourds, carrots, cucumbers and leafy greens',
      eyebrow: 'Pure · Natural · Made in India',
      title: 'From our villages to your home.',
      description: 'Discover honest food made by rural producers using traditional methods and carefully selected ingredients.',
      ctaLabel: 'Shop now',
      href: '/products',
    }, {
      id: 'made-in-india-story',
      imageUrl: storyImage,
      imageAlt: 'Rural producers in Indian fields',
      eyebrow: 'Made in India story',
      title: 'Food with a place, a person and a purpose.',
      description: 'Discover regionally rooted food while supporting rural producers and their path to a trusted marketplace.',
      ctaLabel: 'Explore marketplace',
      href: '/products',
    }];
    const seenProducts = new Set<string>();
    [...(bestSellers.data?.items ?? []), ...(featured.data?.items ?? [])].forEach((product) => {
      if (slides.length >= 3 || !product.images[0] || seenProducts.has(product.id)) return;
      seenProducts.add(product.id);
      slides.push({
        id: product.id,
        imageUrl: product.images[0],
        imageAlt: product.name,
        eyebrow: `${product.categoryName} · ${product.vendor.name}`,
        title: product.name,
        description: product.description,
        ctaLabel: 'Shop product',
        href: `/products/${product.id}`,
      });
    });
    return slides;
  }, [bestSellers.data?.items, featured.data?.items, managedHero.data]);

  return (
    <>
      <section className="home-hero">
        <div className="shell"><HomeHeroCarousel slides={heroSlides} /></div>
      </section>

      <ScrollReveal className="home-reveal--image"><section className="home-story" id="our-story" aria-labelledby="story-heading">
        <div className="shell home-story-grid">
          <div className="home-story-copy"><span className="eyebrow">Made in India story</span><h2 id="story-heading">Food with a place, a person and a purpose.</h2><p>Vishwaneed helps customers discover regionally rooted food while giving rural producers a clear path to market. Every listed product moves through marketplace approval before it reaches the store.</p><Link className="button button--primary" to="/products">Know our story <ArrowRight size={17} /></Link></div>
          <div className="home-story-media"><img src={storyImage} width="960" height="720" loading="lazy" decoding="async" alt="A farmer working in green fields" /></div>
        </div>
      </section></ScrollReveal>

      <ScrollReveal className="home-reveal--cards"><section className="section home-market-section shell" aria-labelledby="categories-heading">
        <div className="section-heading home-section-heading"><h2 id="categories-heading">Shop by category</h2><Link to="/products">View all <ArrowRight size={17} /></Link></div>
        {categories.isLoading && <LoadingState label="Loading categories" />}
        {categories.isError && <ErrorState message="Categories are unavailable." onRetry={() => void categories.refetch()} />}
        {categories.data && <div className="home-category-rail">{categories.data.slice(0, 7).map((category) => <Link className="home-category-card" key={category.id} to={`/products?category=${category.id}`}>{category.imageUrl ? <img src={category.imageUrl} alt="" loading="lazy" decoding="async" width="160" height="160" /> : <span className="home-category-fallback" aria-hidden="true"><ImageIcon /></span>}<h3>{category.name}</h3></Link>)}<Link className="home-category-card home-category-more" to="/products"><span aria-hidden="true">•••</span><h3>More</h3></Link></div>}
      </section></ScrollReveal>

      <ScrollReveal className="home-reveal--cards"><section className="section home-market-section shell" aria-labelledby="vendors-heading">
        <div className="section-heading home-section-heading"><h2 id="vendors-heading">Featured vendors</h2><Link to="/products">View all <ArrowRight size={17} /></Link></div>
        {(featured.isLoading || bestSellers.isLoading) && <LoadingState label="Loading approved vendors" />}
        {(featured.isError || bestSellers.isError) && <ErrorState message="Approved vendors are unavailable." onRetry={() => { void featured.refetch(); void bestSellers.refetch(); }} />}
        {featuredVendors.length > 0 && <div className="vendor-grid">{featuredVendors.map((vendor) => <article className="vendor-card" key={vendor.id}><div className="vendor-avatar">{vendor.name.charAt(0)}</div><div><h3>{vendor.name}</h3>{vendor.rating > 0 && <p className="vendor-rating"><Star size={13} fill="currentColor" aria-hidden="true" /> {vendor.rating.toFixed(1)}</p>}<p><MapPin size={12} aria-hidden="true" /> {vendor.location}</p><span>{vendor.productCount} approved {vendor.productCount === 1 ? 'product' : 'products'}</span></div></article>)}</div>}
      </section></ScrollReveal>

      <ScrollReveal className="home-reveal--cards"><section className="section home-market-section shell" aria-labelledby="best-heading">
        <div className="section-heading home-section-heading"><h2 id="best-heading">Best selling products</h2><Link to="/products?sort=POPULAR">View all <ArrowRight size={17} /></Link></div>
        {bestSellers.isLoading && <LoadingState label="Loading best sellers" />}
        {bestSellers.isError && <ErrorState message="Best sellers are unavailable." onRetry={() => void bestSellers.refetch()} />}
        {bestSellers.data && <ProductGrid products={bestSellers.data.items} compact />}
      </section></ScrollReveal>

      <ScrollReveal><section className="trust-strip"><div className="shell"><span><PackageCheck /> Secure marketplace checkout</span><span><Truck /> Vendor-wise delivery visibility</span><span><BadgeCheck /> Approved products only</span></div></section></ScrollReveal>

      <ScrollReveal className="home-reveal--cards"><section className="section shell" aria-labelledby="featured-heading">
        <div className="section-heading"><div><span className="eyebrow">Freshly approved</span><h2 id="featured-heading">New arrivals</h2></div><Link to="/products?sort=NEWEST">View all <ArrowRight size={17} /></Link></div>
        {featured.isLoading && <LoadingState label="Loading new arrivals" />}
        {featured.isError && <ErrorState message="New arrivals are unavailable." onRetry={() => void featured.refetch()} />}
        {featured.data && <ProductGrid products={featured.data.items} compact />}
      </section></ScrollReveal>

      {trending.length > 0 && <ScrollReveal className="home-reveal--cards"><section className="section shell" aria-labelledby="trending-heading">
        <div className="section-heading"><div><span className="eyebrow">Popular right now</span><h2 id="trending-heading">Trending products</h2></div><Link to="/products?sort=POPULAR">View all <ArrowRight size={17} /></Link></div>
        <ProductGrid products={trending} compact />
      </section></ScrollReveal>}

      <ScrollReveal><section className="promo-section"><div className="shell promo-grid"><div><span className="eyebrow eyebrow--light">Millet goodness</span><h2>Everyday staples, grown with care.</h2><p>Build a better pantry with unpolished grains, stone-ground flours and mindful snacks.</p><Link className="button button--light" to="/products?category=millets">Explore millets <ArrowRight size={18} /></Link></div><div className="promo-stat"><strong>GST-inclusive</strong><span>Product prices are shown clearly, without adding tax twice.</span></div></div></section></ScrollReveal>

      {offers.length > 0 && <ScrollReveal className="home-reveal--cards"><section className="section shell" aria-labelledby="offers-heading">
        <div className="section-heading"><div><span className="eyebrow">Current savings</span><h2 id="offers-heading">Offers</h2></div><Link to="/products">View all <ArrowRight size={17} /></Link></div>
        <ProductGrid products={offers} compact />
      </section></ScrollReveal>}
    </>
  );
}
