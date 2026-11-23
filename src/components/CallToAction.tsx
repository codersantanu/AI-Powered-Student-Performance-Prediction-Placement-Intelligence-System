import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CallToAction() {
  return (
    <section className="cta-section" aria-labelledby="cta-heading">
      <div className="page-container">
        <div className="cta-panel">
          <div className="cta-decoration" aria-hidden="true"><div /><div /><div /></div>
          <div className="cta-copy"><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2 id="cta-heading">Take Control of Your<br className="cta-break" /> Academic Journey</h2><p>Understand your performance, identify your weaknesses and take the next step towards better academic results.</p></div>
          <Link to="/register" className="button button--white">Get Started Today <ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>
  );
}
