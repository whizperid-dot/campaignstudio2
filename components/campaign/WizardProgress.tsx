import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Data' },
  { id: 3, label: 'Audience & Mechanics' },
  { id: 4, label: 'Review & Confirm' },
];

export default function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center w-full max-w-lg">
      {STEPS.map((step, i) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all duration-300"
                style={
                  isCompleted
                    ? { background: '#1434cb', color: '#fff' }
                    : isActive
                    ? { background: '#07143a', color: '#fff', boxShadow: '0 0 0 4px rgba(20,52,203,0.15)' }
                    : { background: 'transparent', border: '1.5px solid rgba(136,148,180,0.3)', color: '#8894b4' }
                }
              >
                {isCompleted
                  ? <Check size={12} strokeWidth={3} />
                  : <span style={{ fontSize: '11px' }}>{step.id}</span>}
              </div>
              <span
                className="mt-1.5 whitespace-nowrap transition-all"
                style={{
                  fontSize: '11px',
                  color: isActive ? '#07143a' : isCompleted ? '#4a5578' : '#8894b4',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-2 mb-5 transition-all duration-500"
                style={{ background: isCompleted ? '#1434cb' : 'rgba(136,148,180,0.2)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
