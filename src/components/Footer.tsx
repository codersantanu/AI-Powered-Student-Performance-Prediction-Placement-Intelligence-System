import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import Brand from './Brand';

export default function Footer() {
  const [contactOpen, setContactOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (contactOpen && !dialog.open) dialog.showModal();
    if (!contactOpen && dialog.open) dialog.close();
  }, [contactOpen]);

  return (
    <footer className="site-footer">
      <div className="page-container">
        <div className="footer-main"><div className="footer-brand"><Brand /><p>An intelligent platform for student<br className="footer-line-break" /> performance analysis and prediction.</p></div><nav className="footer-nav" aria-label="Footer navigation"><Link to="/">Home</Link><Link to="/#features">Features</Link><Link to="/#about">About</Link><Link to="/login">Login</Link><button type="button" onClick={() => setContactOpen(true)}>Contact</button></nav></div>
        <div className="footer-bottom"><p>© 2026 StudentIQ. All rights reserved.</p><span>Designed for a brighter academic future.<span className="footer-sparkle" aria-hidden="true">✦</span></span></div>
      </div>
      <dialog ref={dialogRef} className="contact-dialog" onCancel={() => setContactOpen(false)} onClose={() => setContactOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setContactOpen(false); }} aria-labelledby="contact-heading">
        <button type="button" className="dialog-close" aria-label="Close contact information" onClick={() => setContactOpen(false)}><X size={20} /></button>
        <span className="eyebrow">LET'S CONNECT</span><h2 id="contact-heading">A little more about StudentIQ.</h2><p>StudentIQ brings academic records, study habits and assessments together to help you understand your potential.</p><div className="contact-note"><strong>About this preview</strong><p>This is a frontend demonstration. Backend services, machine learning and messaging are not connected. For project-specific questions, reach out to your project administrator.</p></div>
        <button type="button" className="button button--primary" onClick={() => { setContactOpen(false); navigate('/#about'); }}>Explore the project <ArrowRight size={16} /></button>
      </dialog>
    </footer>
  );
}
