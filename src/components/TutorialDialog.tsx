'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const steps = [
  {
    title: 'Welcome to FynWealth',
    description:
      "Take control of your finances with smart tracking and AI-powered insights. Let's show you around!",
    icon: Sparkles,
    color: 'text-primary',
  },
  {
    title: 'Smart Dashboard',
    description:
      'Get a bird’s-eye view of your monthly spend, total budget, and remaining balance at a glance.',
    icon: LayoutDashboard,
    color: 'text-blue-500',
  },
  {
    title: 'Capture Every Cent',
    description:
      'Add expenses manually, scan your physical bills, or just use your voice to record transactions instantly.',
    icon: Receipt,
    color: 'text-accent',
  },
  {
    title: 'Manage Budgets',
    description:
      'Set monthly limits for categories and use the "Rollover" feature to automatically bring in recurring expenses like rent or loans.',
    icon: PieChart,
    color: 'text-emerald-500',
  },
  {
    title: 'AI Powered Insights',
    description:
      'Our AI identifies unnecessary recurring expenses and predicts heavy spending months to help you save more.',
    icon: Sparkles,
    color: 'text-purple-500',
  },
];

export function TutorialDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset step when dialog opens
  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        {/* Accessibility requirement: DialogTitle and Description */}
        <DialogHeader className="sr-only">
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <div className={`p-5 rounded-2xl bg-muted/50 ${step.color} animate-in zoom-in duration-300`}>
            <Icon className="w-12 h-12" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold font-headline">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t flex-row items-center justify-between sm:justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Skip Tutorial
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack} className="h-8 w-8 p-0 rounded-full">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-8 text-xs px-6 rounded-full font-bold shadow-md shadow-primary/20">
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next Step'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
