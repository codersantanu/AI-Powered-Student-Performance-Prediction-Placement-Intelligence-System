import Hero from '../components/Hero';
import DashboardPreview from '../components/DashboardPreview';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import About from '../components/About';
import CallToAction from '../components/CallToAction';
import Footer from '../components/Footer';

export default function Landing() {
  return (
    <>
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <DashboardPreview />
        <Features />
        <HowItWorks />
        <About />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
