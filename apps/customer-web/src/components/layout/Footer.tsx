import { Bell, MessageSquare, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link className="brand brand--footer" to="/"><span className="brand-mark">V</span><span><strong>Vishwaneed</strong><small>Made in India. Made for you.</small></span></Link>
          <p>Connecting trusted rural producers with homes across India through a transparent marketplace.</p>
        </div>
        <div><h2>Shop</h2><Link to="/products">All products</Link><Link to="/products?category=millets">Millets</Link><Link to="/products?category=jaggery">Jaggery</Link><Link to="/products?category=food-products">Food products</Link></div>
        <div><h2>Customer care</h2><Link to="/account">My account</Link><Link to="/orders">My orders</Link><Link to="/addresses">Addresses</Link><Link to="/complaints">Complaints & support</Link></div>
        <div><h2>Trust & support</h2><span><ShieldCheck size={16} /> Approved products only</span><Link to="/complaints"><MessageSquare size={16} /> Customer support</Link><Link to="/notifications"><Bell size={16} /> Notifications</Link></div>
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Vishwaneed Marketplace</span><span>Privacy · Terms · Accessibility</span></div>
    </footer>
  );
}
