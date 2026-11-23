import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main id="main-content" className="not-found" tabIndex={-1}>
      <span className="not-found-icon"><Compass size={35} strokeWidth={1.5} /></span>
      <span className="eyebrow">A LITTLE OFF THE BEATEN PATH</span>
      <h1>This page isn't on the syllabus.</h1>
      <p>Let's get you back to your academic journey.</p>
      <Link to="/" className="button button--primary"><ArrowLeft size={16} /> Back to Home</Link>
    </main>
  );
}
