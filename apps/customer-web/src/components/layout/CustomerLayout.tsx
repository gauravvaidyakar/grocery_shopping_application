import { NavigationType, useLocation, useNavigationType, useOutlet } from 'react-router-dom';
import { runtimeConfig } from '../../api';
import { Footer } from './Footer';
import { Header } from './Header';
import { PageTransition } from './PageTransition';

export function CustomerLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();

  return (
    <div className="app-shell">
      {runtimeConfig.isMock && <div className="development-banner" role="status">Development adapter active — catalogue, account and checkout data are local mock responses.</div>}
      <Header />
      <main id="main-content"><PageTransition transitionKey={`${location.pathname}${location.search}`} direction={navigationType === NavigationType.Pop ? 'back' : 'forward'}>{outlet}</PageTransition></main>
      <Footer />
    </div>
  );
}
