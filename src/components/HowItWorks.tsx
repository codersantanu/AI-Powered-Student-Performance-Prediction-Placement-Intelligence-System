import { ClipboardCheck, FileChartColumn, Sparkles, UserRoundPlus } from 'lucide-react';

const steps = [
  { icon: UserRoundPlus, title: 'Create Your Account', description: 'Register and complete your student profile.' },
  { icon: FileChartColumn, title: 'Add Academic Information', description: 'Provide your marks, CGPA, attendance and study hours.' },
  { icon: ClipboardCheck, title: 'Complete Assessments', description: 'Take psychometric and technical assessments.' },
  { icon: Sparkles, title: 'Get Your Prediction', description: 'View your predicted academic performance and personalized improvement suggestions.' },
];

export default function HowItWorks() {
  return (
    <section className="how-section section-padding" aria-labelledby="how-heading">
      <div className="page-container">
        <div className="section-heading centered">
          <span className="eyebrow">A SIMPLE PATH TO BETTER RESULTS</span>
          <h2 id="how-heading">How It Works</h2>
          <p>A simple process to understand your academic performance and improve your results.</p>
        </div>
        <div className="steps-grid">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <article className="step" key={title}>
              <div className="step-marker"><Icon size={23} strokeWidth={1.65} /><span className="step-number">{index + 1}</span></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
