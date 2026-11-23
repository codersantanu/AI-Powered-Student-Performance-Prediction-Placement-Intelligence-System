import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';


function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = pathname === '/login' ? 'Login — StudentIQ' : pathname === '/register' ? 'Get Started — StudentIQ' : pathname === '/' ? 'StudentIQ — Shape Your Academic Future' : `${pathname.startsWith('/admin') ? 'Admin' : 'Student'} Workspace — StudentIQ`;
    const timeout = window.setTimeout(() => {
      if (hash) { const target = document.getElementById(decodeURIComponent(hash.slice(1))); if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
      else window.scrollTo({ top: 0, behavior: 'auto' });
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [pathname, hash]);
  return null;
}
export default function App() {
  return <BrowserRouter><AuthProvider><ScrollManager /><AppRoutes /></AuthProvider></BrowserRouter>;
}
