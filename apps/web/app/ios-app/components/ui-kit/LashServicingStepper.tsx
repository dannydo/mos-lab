import React from 'react';
import { Check } from 'lucide-react';

interface LashServicingStepperProps {
  activeStep: 1 | 2 | 3 | 4;
  elapsedMinutes?: number;
}

export function LashServicingStepper({ activeStep, elapsedMinutes }: LashServicingStepperProps) {
  const steps = [
    { num: 1, label: 'Before' },
    { num: 2, label: 'Vệ Sinh' },
    {
      num: 3,
      label: elapsedMinutes && activeStep > 3 ? `${elapsedMinutes}p Nối` : 'Nối Mi',
    },
    { num: 4, label: 'After' },
  ];

  return (
    <div className="bg-black select-none shrink-0 border-b border-neutral-800/80 px-3 py-1.5">
      <div className="grid grid-cols-4 gap-1.5 items-center">
        {steps.map((step) => {
          const isCompleted = activeStep > step.num;
          const isCurrent = activeStep === step.num;

          if (isCurrent) {
            return (
              <div
                key={step.num}
                className="bg-[#FFB400] text-black font-black text-[11px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 shadow-sm leading-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                <span className="truncate">
                  {step.num}. {step.label}
                </span>
              </div>
            );
          }

          if (isCompleted) {
            return (
              <div
                key={step.num}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 font-bold text-[10.5px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 leading-none"
              >
                <Check className="w-3 h-3 text-emerald-400 shrink-0 stroke-[3]" />
                <span className="truncate">{step.label}</span>
              </div>
            );
          }

          return (
            <div
              key={step.num}
              className="bg-neutral-900/40 border border-neutral-900 text-neutral-500 font-medium text-[10.5px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 leading-none"
            >
              <span className="text-[9px] text-neutral-600 shrink-0">{step.num}</span>
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
