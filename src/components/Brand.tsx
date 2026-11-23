import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BrandProps {
  inverse?: boolean;
  compact?: boolean;
}

export default function Brand({ inverse = false, compact = false }: BrandProps) {
  return (
    <Link
      to="/"
      className={`brand${inverse ? ' brand--inverse' : ''}${compact ? ' brand--compact' : ''}`}
      aria-label="StudentIQ home"
    >
      <span className="brand-mark"><GraduationCap size={compact ? 20 : 25} strokeWidth={1.8} /></span>
      <span className="brand-name">Student<span>IQ</span></span>
    </Link>
  );
}
