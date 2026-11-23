import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = ['Data-Driven Academic Analysis', 'Intelligent Performance Prediction', 'Personalized Student Improvement'];

export default function About() {
  return (
    <section id="about" className="about-section section-padding" aria-labelledby="about-heading">
      <div className="page-container">
        <div className="about-grid">
          <div className="about-heading"><span className="eyebrow">UNDERSTAND MORE. ACHIEVE MORE.</span><h2 id="about-heading">Making Academic Performance Easier to Understand</h2><Link to="/register" className="text-link">Your journey, a little clearer <span aria-hidden="true">↗</span></Link></div>
          <div className="about-description"><p>StudentIQ is designed to help students monitor academic progress, identify learning gaps and understand their academic strengths and weaknesses. By combining academic data analysis with Machine Learning, the platform provides meaningful performance insights and personalized improvement guidance.</p><div className="about-highlights">{highlights.map((highlight) => <span key={highlight}><span className="highlight-check"><Check size={12} strokeWidth={2.5} /></span>{highlight}</span>)}</div></div>
        </div>
      </div>
    </section>
  );
}
