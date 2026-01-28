// Effectiveness badge utilities for TryHackMe-style response grading

export const getMagnitudeConfig = (magnitude) => {
  const configs = {
    most_effective: {
      label: 'Most Effective',
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-300',
      borderColor: 'border-green-500/30',
      icon: '✓',
      description: 'Optimal response demonstrating excellent understanding'
    },
    effective: {
      label: 'Effective',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-500/30',
      icon: '✓',
      description: 'Strong response showing good comprehension'
    },
    not_effective: {
      label: 'Not Effective',
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-300',
      borderColor: 'border-gray-500/30',
      icon: '○',
      description: 'Ineffective response requiring review'
    },
    somewhat_effective: {
      label: 'Somewhat Effective',
      bgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-500/30',
      icon: '!',
      description: 'Partially correct but missing key elements'
    },
    least_effective: {
      label: 'Least Effective',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-300',
      borderColor: 'border-red-500/30',
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
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    </div>
  );
};
