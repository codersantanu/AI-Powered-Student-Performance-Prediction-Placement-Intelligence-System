import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import Brand from './Brand';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/#features' },
  { label: 'About', to: '/#about' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, hash } = useLocation();
  

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, hash]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const linkClass = (to: string) => {
    const active = pathname === '/' && (to === '/' ? !hash || hash === '#home' : hash === to);
    return `nav-link${active ? ' nav-link--active' : ''}`;
  };

  return (
    <header className="site-header">
      <div className="page-container navbar">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <div className="nav-links">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass(link.to)}>{link.label}</NavLink>
            ))}
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-link login-link">Login</Link>
            <Link to="/register" className="button button--primary button--nav">
              Get Started
              <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
        <div className="mobile-actions">
          <Link to="/register" className="button button--primary button--nav">Get Started <ArrowRight size={15} /></Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass(link.to)}>{link.label}</NavLink>
          ))}
          <Link to={pathname === '/login' ? '/register' : '/login'} className="nav-link">{pathname === '/login' ? 'Get Started' : 'Login'}</Link>
          <Link to="/" className="mobile-home-link">Back to home <ArrowRight size={16} /></Link>
        </nav>
      )}
    </header>
  );
}
