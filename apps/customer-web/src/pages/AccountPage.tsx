import { Bell, MapPin, MessageSquare, Package, Settings, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function AccountPage() {
  const { session, logout } = useAuth();
  if (!session) return null;
  return <div className="page shell account-page"><div className="page-heading"><div><span className="eyebrow">Customer account</span><h1>Hello, {session.customer.name}</h1><p>Manage your shopping profile, orders and support requests.</p></div><button className="button button--secondary" type="button" onClick={() => void logout()}>Log out</button></div><div className="account-grid"><section className="account-profile"><div className="profile-avatar"><UserRound /></div><h2>{session.customer.name}</h2><p>{session.customer.email ?? session.customer.mobile}</p><span>Customer account</span></section><div className="account-links"><Link to="/orders"><Package /><span><strong>My orders</strong><small>Order details, item actions and tracking</small></span></Link><Link to="/addresses"><MapPin /><span><strong>Delivery addresses</strong><small>Add, edit or select your default address</small></span></Link><Link to="/notifications"><Bell /><span><strong>Notifications</strong><small>Order, payment, shipment and support updates</small></span></Link><Link to="/complaints"><MessageSquare /><span><strong>Complaints</strong><small>View and continue support conversations</small></span></Link><Link to="/profile"><Settings /><span><strong>Profile settings</strong><small>Update account contact preferences</small></span></Link></div></div></div>;
}
