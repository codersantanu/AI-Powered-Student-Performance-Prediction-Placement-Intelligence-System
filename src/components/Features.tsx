import { Brain, ChartNoAxesCombined, Clock3, Code2, Network, TrendingUp } from 'lucide-react';

const features = [
  { icon: ChartNoAxesCombined, title: 'Academic Performance Analysis', description: 'Track your semester-wise marks, SGPA, CGPA, attendance and academic progress.' },
  { icon: Clock3, title: 'Study Behaviour Tracking', description: 'Monitor daily study hours, subject-wise time distribution and study consistency.' },
  { icon: Brain, title: 'Psychometric Assessment', description: 'Evaluate communication, teamwork, problem-solving and decision-making skills through scenario-based assessments.' },
  { icon: Code2, title: 'Technical Assessment', description: 'Evaluate your technical knowledge through subject-based tests with different difficulty levels.' },
  { icon: Network, title: 'ML-Based Performance Prediction', description: 'Use Machine Learning models such as Decision Tree and Random Forest to estimate future academic performance.' },
  { icon: TrendingUp, title: 'Personalized Improvement Recommendations', description: 'Identify weak subjects and receive recommendations to improve your academic performance.' },
];

export default function Features() {
  return (
    <section id="features" className="features-section section-padding" aria-labelledby="features-heading">
      <div className="page-container">
        <div className="section-heading centered">
          <span className="eyebrow">BUILT FOR YOUR ACADEMIC SUCCESS</span>
          <h2 id="features-heading">Everything You Need to<br className="heading-break" /> Improve Your Academic Performance</h2>
          <p>Explore the tools designed to help students understand, evaluate and improve their academic journey.</p>
        </div>
        <div className="features-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon"><Icon size={23} strokeWidth={1.65} /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
