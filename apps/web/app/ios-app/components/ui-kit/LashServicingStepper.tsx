import React from 'react';
import { Check } from 'lucide-react';

interface LashServicingStepperProps {
  activeStep: 1 | 2 | 3 | 4;
  elapsedMinutes?: number;
}

export function LashServicingStepper({ activeStep, elapsedMinutes }: LashServicingStepperProps) {
  const steps = [
    { num: 1, label: 'Bắt đầu' },
    { num: 2, label: 'Vệ Sinh' },
    {
      num: 3,
      label: elapsedMinutes && activeStep > 3 ? `${elapsedMinutes}p Nối` : 'Nối Mi',
    },
    { num: 4, label: 'Kết thúc' },
  ];

  return (
    <div
      className="select-none shrink-0 border-b px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: 'var(--mos-surface)',
        borderColor: 'var(--mos-surface-border)',
      }}
    >
      <div className="grid grid-cols-4 gap-1.5 items-center">
        {steps.map((step) => {
          const isCompleted = activeStep > step.num;
          const isCurrent = activeStep === step.num;

          if (isCurrent) {
            return (
              <div
                key={step.num}
                className="font-black text-[11px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 shadow-sm leading-none"
                style={{
                  backgroundColor: 'var(--mos-accent)',
                  color: 'var(--mos-accent-contrast)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--mos-accent-contrast)' }}
                />
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
                className="border font-bold text-[10.5px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 leading-none"
                style={{
                  backgroundColor: 'var(--mos-surface-muted)',
                  borderColor: 'var(--mos-surface-border)',
                  color: 'var(--mos-text)',
                }}
              >
                <Check className="w-3 h-3 text-emerald-500 shrink-0 stroke-[3]" />
                <span className="truncate">{step.label}</span>
              </div>
            );
          }

          return (
            <div
              key={step.num}
              className="border font-medium text-[10.5px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 leading-none opacity-75"
              style={{
                backgroundColor: 'var(--mos-surface-muted)',
                borderColor: 'var(--mos-surface-border)',
                color: 'var(--mos-text-muted)',
              }}
            >
              <span className="text-[9px] shrink-0">{step.num}</span>
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
