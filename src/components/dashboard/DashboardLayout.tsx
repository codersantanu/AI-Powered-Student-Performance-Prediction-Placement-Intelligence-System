import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Award, Bell, BookOpen, Brain, ChartNoAxesCombined, ChevronDown, ChevronRight, Clock3, Code2, FileText, GraduationCap, LayoutDashboard, Lightbulb, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings2, Sun, UserRound, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Brand from '../Brand';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../hooks/useWorkspace';
import { previewStore } from '../../data/preview';
import { Badge, PreviewBanner } from './Page';

export const studentNavigation: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: '/student/profile', icon: UserRound },
  { label: 'Academic Performance', path: '/student/academic-performance', icon: BookOpen },
  { label: 'Study Behaviour', path: '/student/study-behaviour', icon: Clock3 },
  { label: 'Technical Assessment', path: '/student/technical-assessment', icon: Code2 },
  { label: 'Behavioural Assessment', path: '/student/behavioural-assessment', icon: Users },
  { label: 'Psychometric Assessment', path: '/student/psychometric-assessment', icon: Brain },
  { label: 'Skills & Experience', path: '/student/skills-experience', icon: Award },
  { label: 'Performance Prediction', path: '/student/performance-prediction', icon: ChartNoAxesCombined },
  { label: 'Improvement Recommendations', path: '/student/improvement-recommendations', icon: Lightbulb },
  { label: 'My Reports', path: '/student/reports', icon: FileText },
];
export const adminNavigation: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Student Management', path: '/admin/students', icon: UserRound },
  { label: 'Academic Records', path: '/admin/academic-records', icon: BookOpen },
  { label: 'Assessment Publishing', path: '/admin/assessments', icon: Brain },
  { label: 'Reports & Analytics', path: '/admin/reports', icon: FileText },
];
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase(); }
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isPreview, logout } = useAuth();
  const workspace = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  
  const [popover, setPopover] = useState<'notifications' | 'profile' | 'account' | null>(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('studentiq-theme') || 'light'; } catch { return 'light'; } });
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isAdmin = location.pathname.startsWith('/admin');
  const navigation = isAdmin ? adminNavigation : studentNavigation;
  const name = user?.name || (isPreview ? (isAdmin ? 'Admin Preview' : previewStore.dashboard().profile?.name || 'Student') : 'Student');
  const email = user?.email || (isPreview ? 'Preview account — not signed in' : '');
  const active = navigation.find((item) => item.path === location.pathname);
  const upcoming = isPreview ? previewStore.assessments : workspace.data?.upcomingAssessments || [];
  const searchResults = navigation.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { setDrawer(false); setPopover(null); setSearchOpen(false); setQuery(''); window.scrollTo({ top: 0, behavior: 'auto' }); }, [location.pathname, location.search]);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('studentiq-theme', theme); } catch { /* Theme still works without persistence. */ } }, [theme]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => { if (headerRef.current && !headerRef.current.contains(event.target as Node)) { setPopover(null); setSearchOpen(false); } };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDrawer(false); setPopover(null); setSearchOpen(false); } if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); searchRef.current?.focus(); } };
    document.addEventListener('mousedown', onClick); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { if (!drawer) return; const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; drawerRef.current?.querySelector<HTMLElement>('button')?.focus(); const trap = (event: KeyboardEvent) => { if (event.key !== 'Tab') return; const nodes = [...(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || [])]; const first = nodes[0]; const last = nodes[nodes.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }; document.addEventListener('keydown', trap); return () => { document.body.style.overflow = old; document.removeEventListener('keydown', trap); }; }, [drawer]);
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');
  const onLogout = async () => { setPopover(null); await logout(); };
  const selectSearchResult = (path: string) => { navigate(path); setQuery(''); setSearchOpen(false); };
  return (
    <div className={`workspace${collapsed ? ' workspace--collapsed' : ''}${drawer ? ' workspace--drawer' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {drawer && <div className="sidebar-overlay" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside className={`workspace-sidebar${drawer ? ' workspace-sidebar--open' : ''}`} ref={drawerRef} aria-label="Dashboard sidebar" role={drawer ? 'dialog' : undefined} aria-modal={drawer ? true : undefined}>
        <div className="sidebar-brand"><Brand compact /><button type="button" className="icon-button drawer-close" onClick={() => setDrawer(false)} aria-label="Close navigation"><X size={20} /></button></div>
        <div className="sidebar-search"><Search size={15} /><input aria-label="Search dashboard" placeholder="Search dashboard…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0].path); }} /><kbd>⌘ K</kbd></div>
        <div className="sidebar-section-label">APPLICATION</div>
        <nav className="sidebar-nav" aria-label={isAdmin ? 'Admin navigation' : 'Student navigation'}>{navigation.map(({ label, path, icon: Icon }) => { const isActive = location.pathname === path; return <NavLink key={path} to={path} className={({ isActive }) => `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`} title={collapsed ? label : undefined}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{isActive && <span className="sidebar-active-dot" />}</NavLink>; })}</nav>
        <div className="sidebar-bottom"><button type="button" className="sidebar-nav-item theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>{theme === 'light' ? <Moon size={18} strokeWidth={1.7} /> : <Sun size={18} strokeWidth={1.7} />}<span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span><span className={`theme-switch${theme === 'dark' ? ' theme-switch--on' : ''}`}><span /></span></button><div className="sidebar-account"><span className="student-avatar">{isAdmin ? 'AD' : initials(name)}</span><div className="sidebar-account-text"><strong>{name}</strong><span title={email}>{email}</span></div><button type="button" className="icon-button account-toggle" aria-label="Open account menu" aria-expanded={popover === 'account'} onClick={() => setPopover(popover === 'account' ? null : 'account')}><ChevronDown size={16} /></button>{popover === 'account' && <div className="account-menu sidebar-account-menu"><Link to={isAdmin ? '/admin/dashboard' : '/student/profile'} onClick={() => setPopover(null)}><UserRound size={15} />{isAdmin ? 'Dashboard' : 'My profile'}</Link><Link to="/" onClick={() => setPopover(null)}><GraduationCap size={15} />Back to website</Link>{!isPreview && <button type="button" onClick={onLogout}><LogOut size={15} />Logout</button>}</div>}</div></div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header" ref={headerRef}>
          <div className="header-left"><button type="button" className="icon-button sidebar-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => { if (window.innerWidth <= 960) setDrawer(true); else setCollapsed((c) => !c); }}>{collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}</button><button type="button" className="icon-button mobile-menu" aria-label="Open navigation drawer" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu size={22} /></button><div className="header-title"><div className="breadcrumbs"><Link to="/">StudentIQ</Link><ChevronRight size={12} /><span>{isAdmin ? 'Admin' : 'Student'}</span><ChevronRight size={12} /><strong>{active?.label || 'Dashboard'}</strong></div><p>Welcome back! Here's your academic overview.</p></div></div>
          <div className="header-right"><div className={`global-search${searchOpen ? ' global-search--active' : ''}`}><Search size={16} /><input ref={searchRef} aria-label="Search workspace" placeholder="Search anything…" value={query} onFocus={() => { setSearchOpen(true); setPopover(null); }} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); setPopover(null); }} onKeyDown={(e) => { if (e.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0].path); }} />{query && searchResults.length > 0 && <div className="search-results"><span className="popover-label">PAGES</span>{searchResults.map(({ label, path, icon: Icon }) => <button type="button" key={path} onClick={() => selectSearchResult(path)}><Icon size={16} /><span>{label}</span><ChevronRight size={13} /></button>)}</div>}{query && searchResults.length === 0 && <div className="search-results no-results">No pages match “{query}”.</div>}</div>
            <div className="header-popover-anchor"><button type="button" className={`icon-button notification-button${popover === 'notifications' ? ' is-active' : ''}`} aria-label="Notifications" aria-expanded={popover === 'notifications'} onClick={() => { setPopover(popover === 'notifications' ? null : 'notifications'); setSearchOpen(false); }}><Bell size={20} strokeWidth={1.6} />{upcoming.length > 0 && <span />}</button>{popover === 'notifications' && <div className="header-popover notifications-popover"><div className="popover-heading"><strong>Upcoming assessments</strong><Badge tone="purple">{upcoming.length}</Badge></div>{upcoming.length ? upcoming.slice(0, 4).map((assessment) => <Link key={assessment.id} to={isAdmin ? '/admin/assessments' : `/student/${assessment.category === 'Psychometric' ? 'psychometric-assessment' : 'technical-assessment'}`} onClick={() => setPopover(null)}><span className="notification-icon"><FileText size={17} /></span><div><strong>{assessment.title}</strong><span>{assessment.dueAt ? `Due ${new Date(assessment.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No due date'}</span></div></Link>) : <p className="popover-empty">You're all caught up. No upcoming assessments.</p>}</div>}</div>
            <span className="header-divider" /><div className="header-popover-anchor"><button type="button" className="header-profile" aria-label="Open profile menu" aria-expanded={popover === 'profile'} onClick={() => { setPopover(popover === 'profile' ? null : 'profile'); setSearchOpen(false); }}><span className="student-avatar">{isAdmin ? 'AD' : initials(name)}</span><div><strong>{name}</strong><span>{isAdmin ? 'Administrator' : 'Student'}</span></div><ChevronDown size={14} /></button>{popover === 'profile' && <div className="header-popover profile-menu"><Link to={isAdmin ? '/admin/dashboard' : '/student/profile'} onClick={() => setPopover(null)}><UserRound size={15} />{isAdmin ? 'Admin dashboard' : 'My profile'}</Link><Link to="/" onClick={() => setPopover(null)}><Settings2 size={15} />Back to website</Link>{!isPreview && <button type="button" onClick={onLogout}><LogOut size={15} />Logout</button>}</div>}</div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="workspace-content"><PreviewBanner />{children}<footer className="workspace-footer"><span>© 2026 StudentIQ. Every step counts.</span><span><span className="connection-dot" />{isPreview ? 'Sample preview · no live connection' : 'Secure student workspace'}</span></footer></main>
      </div>
    </div>
  );
}
