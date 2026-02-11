// Effectiveness badge utilities for TryHackMe-style response grading

export const getMagnitudeConfig = (magnitude) => {
  const configs = {
    most_effective: {
      label: 'Most Effective',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      icon: '✓',
      description: 'Optimal response demonstrating excellent understanding'
    },
    effective: {
      label: 'Effective',
      bgColor: 'bg-sky-500/10',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      icon: '✓',
      description: 'Strong response showing good comprehension'
    },
    not_effective: {
      label: 'Not Effective',
      bgColor: 'bg-gray-500/10',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-500/20',
      icon: '○',
      description: 'Ineffective response requiring review'
    },
    somewhat_effective: {
      label: 'Somewhat Effective',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      icon: '!',
      description: 'Partially correct but missing key elements'
    },
    least_effective: {
      label: 'Least Effective',
      bgColor: 'bg-rose-500/10',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/20',
      icon: '✗',
      description: 'Ineffective response, review concepts'
    }
  };

  return configs[magnitude] || configs.least_effective;
};

export const EffectivenessBadge = ({ magnitude, showDescription = false, className = '' }) => {
  const config = getMagnitudeConfig(magnitude);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
        title={showDescription ? config.description : undefined}
      >
        {config.label}
      </span>
    </div>
  );
};
