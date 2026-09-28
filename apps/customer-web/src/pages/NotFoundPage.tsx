import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <div className="page shell not-found"><span>404</span><h1>This page has wandered off the trail.</h1><p>Let’s take you back to the Vishwaneed marketplace.</p><Link className="button button--primary" to="/">Return home</Link></div>;
}
