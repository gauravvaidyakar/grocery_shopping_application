import { Bell, ChevronDown, LogOut, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useCart } from '../../features/cart/hooks';
import { useCategories } from '../../features/catalogue/hooks';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const cart = useCart(Boolean(session));
  const categories = useCategories();

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    void navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    setMenuOpen(false);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="announcement">Direct from rural producers · GST-inclusive prices · Multi-vendor checkout</div>
        <div className="shell header-main">
          <button className="icon-button mobile-menu" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <Link className="brand" to="/" aria-label="Vishwaneed home">
            <span className="brand-mark">V</span>
            <span><strong>Vishwaneed</strong><small>Made in India. Made for you.</small></span>
          </Link>
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <Search size={19} aria-hidden="true" />
            <label className="sr-only" htmlFor="site-search">Search products, vendors and categories</label>
            <input id="site-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, vendors, categories…" />
          </form>
          <nav className={`header-actions ${menuOpen ? 'is-open' : ''}`} aria-label="Customer navigation">
            <NavLink to="/products" onClick={() => setMenuOpen(false)}>Shop</NavLink>
            {session ? (
              <div className="account-menu">
                <NavLink to="/account" onClick={() => setMenuOpen(false)}><UserRound size={19} /> <span>{session.customer.name.split(' ')[0]}</span></NavLink>
                <NavLink to="/notifications" aria-label="Notifications" onClick={() => setMenuOpen(false)}><Bell size={18} /></NavLink>
                <button type="button" aria-label="Log out" onClick={() => void logout()}><LogOut size={17} /></button>
              </div>
            ) : <NavLink to="/login" onClick={() => setMenuOpen(false)}><UserRound size={19} /> Account</NavLink>}
            <NavLink className="cart-action" to="/cart" onClick={() => setMenuOpen(false)}>
              <ShoppingBag size={20} /> Cart <span>{session ? (cart.data?.itemCount ?? 0) : 0}</span>
            </NavLink>
          </nav>
        </div>
        <div className="category-nav-wrap">
          <nav className="shell category-nav" aria-label="Product categories">
            <NavLink to="/products" end>All products</NavLink>
            {categories.data?.slice(0, 6).map((category) => <NavLink key={category.id} to={`/products?category=${category.id}`}>{category.name}</NavLink>)}
            <span className="category-nav-more">More <ChevronDown size={14} /></span>
          </nav>
        </div>
      </header>
    </>
  );
}
