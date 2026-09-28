import {
  ArrowLeft,
  Check,
  ChevronRight,
  ImageOff,
  MapPin,
  Maximize2,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { marketplaceApi } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { ProductGrid } from '../components/product/ProductGrid';
import { ErrorState } from '../components/ui/AsyncState';
import { discountPercentage, formatMoney } from '../components/ui/format';
import { useAddToCart } from '../features/cart/hooks';
import { useProduct, useProductReviews, useRelatedProducts } from '../features/catalogue/hooks';

function ProductImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span className={`pdp-image-placeholder ${className}`} role="img" aria-label={`${alt} image unavailable`}>
        <ImageOff aria-hidden="true" />
        <span>Image unavailable</span>
      </span>
    );
  }

  return <img className={className} src={src} alt={alt} width="900" height="900" decoding="async" onError={() => setFailed(true)} />;
}

function ProductDetailsSkeleton() {
  return (
    <div className="pdp-skeleton" aria-label="Loading product" aria-busy="true">
      <div className="pdp-skeleton__image" />
      <div className="pdp-skeleton__copy">
        <span /><span /><span /><span /><span />
      </div>
    </div>
  );
}

export function ProductDetailsPage() {
  const { productId = '' } = useParams();
  const productQuery = useProduct(productId);
  const product = productQuery.data;
  const reviewsQuery = useProductReviews(product?.id ?? '');
  const relatedQuery = useRelatedProducts(product?.categoryId ?? '');
  const addToCart = useAddToCart();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [reportedReview, setReportedReview] = useState<string | null>(null);

  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);
    setNotice(null);
  }, [productId]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setLightboxOpen(false);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [lightboxOpen]);

  const relatedProducts = useMemo(
    () => (relatedQuery.data?.items ?? []).filter((item) => item.id !== product?.id).slice(0, 4),
    [relatedQuery.data, product?.id],
  );

  if (productQuery.isLoading) return <main className="page shell"><ProductDetailsSkeleton /></main>;
  if (productQuery.isError || !product) {
    return (
      <main className="page shell">
        <ErrorState
          message={productQuery.isError ? getErrorMessage(productQuery.error) : 'This product could not be found.'}
          onRetry={() => void productQuery.refetch()}
        />
        <Link className="back-link" to="/products"><ArrowLeft size={17} /> Browse all products</Link>
      </main>
    );
  }

  const images = product.images.filter(Boolean);
  const currentImage = images[activeImage];
  const outOfStock = product.stockStatus === 'OUT_OF_STOCK' || product.availableQuantity < 1;
  const discount = discountPercentage(product.price, product.mrp);
  const productType = product.productType === 'RAW_COMMODITY' ? 'Raw commodity' : 'Value-added product';
  const dimensions = product.dimensions
    ? [product.dimensions.lengthCm, product.dimensions.widthCm, product.dimensions.heightCm]
      .map((value) => value ?? '–').join(' × ')
    : null;
  const shortDescription = product.description.length > 190
    ? `${product.description.slice(0, 187).trim()}…`
    : product.description;

  const add = async (buyNow = false) => {
    if (!isAuthenticated) {
      void navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setNotice(null);
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity });
      setNotice({ kind: 'success', message: `${product.name} was added to your cart.` });
      if (buyNow) void navigate('/checkout');
    } catch (error) {
      setNotice({ kind: 'error', message: getErrorMessage(error) });
    }
  };

  return (
    <main className="page shell pdp-page">
      <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><ChevronRight aria-hidden="true" />
        <Link to={`/products?category=${encodeURIComponent(product.categoryId)}`}>{product.categoryName}</Link>
        <ChevronRight aria-hidden="true" /><span aria-current="page">{product.name}</span>
      </nav>

      <article className="product-detail">
        <section className="gallery" aria-label="Product images">
          <button className="gallery-main" type="button" onClick={() => currentImage && setLightboxOpen(true)} disabled={!currentImage} aria-label="Open product image viewer">
            <ProductImage src={currentImage} alt={product.name} />
            {currentImage && <span className="gallery-zoom"><Maximize2 /> View larger</span>}
          </button>
          {images.length > 1 && (
            <div className="thumbnails">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} className={index === activeImage ? 'active' : ''} type="button" onClick={() => setActiveImage(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={index === activeImage}>
                  <ProductImage src={image} alt={`${product.name} thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="product-info">
          <div className="pdp-labels"><span>{product.categoryName}</span><span>{productType}</span></div>
          <h1>{product.name}</h1>
          <a className="detail-rating" href="#customer-reviews">
            <Star aria-hidden="true" fill="currentColor" />
            <strong>{product.rating.toFixed(1)}</strong>
            <span>{product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'}</span>
          </a>
          <p className="vendor-byline"><Store aria-hidden="true" /> Sold by <strong>{product.vendor.name}</strong>{product.vendor.location && <><span>·</span><MapPin aria-hidden="true" /> {product.vendor.location}</>}</p>
          <p className="detail-description detail-description--summary">{shortDescription}</p>

          <div className="pdp-price-box">
            <div className="detail-price">
              <strong>{formatMoney(product.price)}</strong>
              {product.mrp && product.mrp > product.price && <del>{formatMoney(product.mrp)}</del>}
              {discount !== null && discount > 0 && <span>{discount}% off</span>}
            </div>
            <p className="gst-note">Inclusive of applicable GST</p>
          </div>

          <div className={`stock-status stock-status--${product.stockStatus.toLowerCase()}`}>
            {outOfStock ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}
            {product.stockStatus === 'IN_STOCK' ? `In stock · ${product.availableQuantity} available` : product.stockStatus === 'LOW_STOCK' ? `Only ${product.availableQuantity} left in stock` : 'Currently out of stock'}
          </div>

          <dl className="pdp-key-facts">
            <div><dt>Net weight</dt><dd>{product.weight}</dd></div>
            {dimensions && <div><dt>Dimensions</dt><dd>{dimensions} cm</dd></div>}
            <div><dt>Product type</dt><dd>{productType}</dd></div>
          </dl>

          <div className="purchase-panel">
            <div className="purchase-panel__top">
              <label htmlFor="product-quantity">Quantity</label>
              <div className="quantity-control">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1 || addToCart.isPending} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus /></button>
                <output id="product-quantity" aria-live="polite">{quantity}</output>
                <button type="button" aria-label="Increase quantity" disabled={outOfStock || quantity >= product.availableQuantity || addToCart.isPending} onClick={() => setQuantity((value) => Math.min(product.availableQuantity, value + 1))}><Plus /></button>
              </div>
            </div>
            <div className="purchase-actions">
              <button className="button button--primary" type="button" disabled={outOfStock || addToCart.isPending} onClick={() => void add()}><ShoppingBag /> {addToCart.isPending ? 'Adding…' : 'Add to cart'}</button>
              <button className="button button--accent" type="button" disabled={outOfStock || addToCart.isPending} onClick={() => void add(true)}>Buy now</button>
            </div>
            {notice && <p className={`pdp-notice pdp-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}</p>}
          </div>
        </section>
      </article>

      <section className="pdp-service-grid" aria-label="Delivery and purchase information">
        <div><Truck /><span><strong>Vendor-wise delivery</strong>Shipping availability and charges are confirmed after you select an address.</span></div>
        <div><RotateCcw /><span><strong>7-day return window</strong>Eligible requests follow the marketplace return policy and backend approval.</span></div>
        <div><ShieldCheck /><span><strong>Secure checkout</strong>Price, stock and final totals are revalidated by Vishwaneed.</span></div>
      </section>

      <div className="pdp-content-grid">
        <div className="pdp-content-main">
          <section className="pdp-content-card" id="product-description">
            <h2>Product description</h2><p>{product.description}</p>
          </section>
          {product.ingredients?.length ? (
            <section className="pdp-content-card"><h2>Ingredients</h2><ul className="pdp-ingredient-list">{product.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></section>
          ) : null}
          <section className="pdp-content-card">
            <h2>Product information</h2>
            <dl className="pdp-specifications">
              <div><dt>Category</dt><dd>{product.categoryName}</dd></div>
              <div><dt>Product type</dt><dd>{productType}</dd></div>
              <div><dt>Net weight</dt><dd>{product.weight}</dd></div>
              {dimensions && <div><dt>Dimensions</dt><dd>{dimensions} cm</dd></div>}
              {Object.entries(product.specifications).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>
        </div>
        <aside className="pdp-seller-card">
          <Store aria-hidden="true" /><p>Sold by</p><h2>{product.vendor.name}</h2>
          {product.vendor.rating > 0 && <p><Star fill="currentColor" aria-hidden="true" /> {product.vendor.rating.toFixed(1)} vendor rating</p>}
          {product.vendor.location && <p><MapPin aria-hidden="true" /> {product.vendor.location}</p>}
          {product.vendor.productCount > 0 && <p><PackageCheck aria-hidden="true" /> {product.vendor.productCount} approved {product.vendor.productCount === 1 ? 'product' : 'products'}</p>}
          <Link className="button button--secondary" to={`/products?vendorId=${encodeURIComponent(product.vendor.id)}`}>View seller products</Link>
        </aside>
      </div>

      <section className="pdp-reviews" id="customer-reviews">
        <div className="section-heading"><div><p className="eyebrow">Customer feedback</p><h2>Ratings &amp; reviews</h2></div></div>
        {reviewsQuery.isLoading ? <p className="muted">Loading reviews…</p> : reviewsQuery.isError ? (
          <ErrorState message={getErrorMessage(reviewsQuery.error)} onRetry={() => void reviewsQuery.refetch()} />
        ) : reviewsQuery.data?.length ? (
          <div className="pdp-review-layout">
            <div className="pdp-review-summary"><strong>{product.rating.toFixed(1)}</strong><span><Star fill="currentColor" /> out of 5</span><p>{reviewsQuery.data.length} published {reviewsQuery.data.length === 1 ? 'review' : 'reviews'}</p></div>
            <div className="pdp-review-list">{reviewsQuery.data.map((review) => <article key={review.id}><div><strong>{review.customerName}</strong><span>{new Date(review.submittedAt).toLocaleDateString('en-IN')}</span></div><p className="pdp-review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < review.rating ? 'currentColor' : 'none'} />)}</p>{review.comment && <p>{review.comment}</p>}{review.images.length > 0 && <div className="pdp-review-images">{review.images.map((image) => <img key={image} src={image} alt="Customer review" loading="lazy" />)}</div>}{isAuthenticated && <button className="text-button" type="button" disabled={reportedReview === review.id} onClick={() => { setReportedReview(review.id); void marketplaceApi.reportReview(review.id).then((result) => setNotice({ kind: 'success', message: `Review reported. Reference ${result.referenceNumber}.` })).catch((error: unknown) => setNotice({ kind: 'error', message: getErrorMessage(error) })).finally(() => setReportedReview(null)); }}>{reportedReview === review.id ? 'Reporting…' : 'Report review'}</button>}</article>)}</div>
          </div>
        ) : <div className="pdp-empty-reviews"><Star /><h3>No published reviews yet</h3><p>Verified customers can review this product after delivery.</p></div>}
      </section>

      {relatedQuery.isLoading || relatedProducts.length > 0 ? (
        <section className="pdp-related"><div className="section-heading"><div><p className="eyebrow">More to explore</p><h2>Related products</h2></div><Link to={`/products?category=${encodeURIComponent(product.categoryId)}`}>View category <ChevronRight /></Link></div>{relatedQuery.isLoading ? <div className="pdp-related-loading" aria-label="Loading related products" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div> : <ProductGrid products={relatedProducts} />}</section>
      ) : null}

      {lightboxOpen && (
        <div className="pdp-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image viewer`} onClick={() => setLightboxOpen(false)}>
          <button type="button" aria-label="Close image viewer" onClick={() => setLightboxOpen(false)}><X /></button>
          <ProductImage src={currentImage} alt={`${product.name} enlarged`} className="pdp-lightbox__image" />
        </div>
      )}
    </main>
  );
}
