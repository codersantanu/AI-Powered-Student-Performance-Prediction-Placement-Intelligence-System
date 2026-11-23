import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section id="home" className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-content">
        <div className="hero-badge"><Sparkles size={14} strokeWidth={1.8} /> Smart Student Performance Analytics</div>
        <h1 id="hero-heading">Predict Your Performance.<br /><span>Shape Your Future.</span></h1>
        <p className="hero-description">Analyze your academic performance, track your study habits and discover how to improve with intelligent machine learning predictions.</p>
        <div className="hero-actions">
          <Link to="/register" className="button button--primary">Get Started <ArrowRight size={17} /></Link>
          <a href="#features" className="button button--secondary">Explore Features <ArrowDown size={16} /></a>
        </div>
        <p className="hero-trust">
          <span>Smarter Academic Insights</span><span className="trust-dot" aria-hidden="true" />
          <span>Data-Driven Predictions</span><span className="trust-dot" aria-hidden="true" />
          <span>Personalized Improvement</span>
        </p>
      </div>
    </section>
  );
}
