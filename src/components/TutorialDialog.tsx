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
  Bell,
  Receipt,
  PieChart,
  Files,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const steps = [
  {
    title: 'Welcome to FynWealth',
    description:
      "Take control of your finances with smart tracking and AI-powered insights. Let's show you around your new financial command center!",
    icon: Sparkles,
    color: 'text-primary',
  },
  {
    title: 'Smart Overview',
    description:
      'The Dashboard gives you a bird’s-eye view of your monthly spend, active budgets, and remaining balance at a glance.',
    icon: LayoutDashboard,
    color: 'text-blue-500',
  },
  {
    title: 'Payment Reminders',
    description:
      'Never miss a due date again. Set up recurring reminders for EMIs, rent, and subscriptions with automated notifications.',
    icon: Bell,
    color: 'text-amber-500',
  },
  {
    title: 'Capture Everything',
    description:
      'Add all your expenses in one go - Import your bank statement, enter manually, scan bills with your camera, or record transactions instantly using your voice.',
    icon: Receipt,
    color: 'text-accent',
  },
  {
    title: 'Manage Budgets',
    description:
      'Set realistic monthly limits for categories and track your progress in real-time to avoid overspending.',
    icon: PieChart,
    color: 'text-emerald-500',
  },
  {
    title: 'Digital Document Hub',
    description:
      'Every bill you scan or upload is automatically stored in your Document Safe. Search and preview invoices whenever you need them.',
    icon: Files,
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
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="p-10 flex flex-col items-center text-center space-y-8">
          <div className={`p-6 rounded-3xl bg-muted/50 ${step.color} animate-in zoom-in duration-500`}>
            <Icon className="w-14 h-14" />
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold font-headline tracking-tight">{step.title}</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed px-2">
              {step.description}
            </p>
          </div>

          <div className="flex gap-2.5">
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
            className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Skip Guide
          </Button>

          <div className="flex items-center gap-2.5">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack} className="h-9 w-9 p-0 rounded-full">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-9 text-xs md:text-sm px-6 rounded-full font-bold shadow-lg shadow-primary/20">
              {currentStep === steps.length - 1 ? 'Start Saving' : 'Continue'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
