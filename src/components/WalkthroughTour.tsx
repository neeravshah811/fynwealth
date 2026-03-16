"use client";

import { useState, useEffect, useRef } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles,
  LayoutDashboard,
  Bell,
  Receipt,
  PieChart,
  Files
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
  targetId: string;
  path: string;
  icon: any;
  color: string;
}

const TOUR_STEPS: Step[] = [
  {
    title: "Smart Overview",
    description: "The Dashboard gives you a bird’s-eye view of your monthly spend, active budgets, and remaining balance at a glance.",
    targetId: "tour-overview",
    path: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500"
  },
  {
    title: "Payment Reminders",
    description: "Never miss a due date again. Set up recurring reminders for EMIs, rent, and subscriptions with automated notifications.",
    targetId: "tour-reminders-add",
    path: "/bills",
    icon: Bell,
    color: "text-amber-500"
  },
  {
    title: "Capture Everything",
    description: "Add expenses manually, scan physical bills with your camera, or just use your voice to record transactions instantly.",
    targetId: "tour-expense-amount",
    path: "/expenses",
    icon: Receipt,
    color: "text-accent"
  },
  {
    title: "Manage Budgets",
    description: "Set realistic monthly limits for categories and track your progress in real-time to avoid overspending.",
    targetId: "tour-budget-progress",
    path: "/budgets",
    icon: PieChart,
    color: "text-emerald-500"
  },
  {
    title: "Digital Document Hub",
    description: "Every bill you scan or upload is automatically stored in your Document Safe. Search and preview invoices whenever you need them.",
    targetId: "tour-doc-list",
    path: "/documents",
    icon: Files,
    color: "text-purple-500"
  }
];

export function WalkthroughTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { tutorialCompleted, setTutorialCompleted } = useFynWealthStore();
  
  const [currentStepIndex, setCurrentStepStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!tutorialCompleted) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [tutorialCompleted]);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Logic to calculate spotlight and navigate if needed
  useEffect(() => {
    if (!isVisible) return;

    if (pathname !== currentStep.path) {
      router.push(currentStep.path);
      // Give some time for navigation and element rendering
      const timer = setTimeout(calculateSpotlight, 800);
      return () => clearTimeout(timer);
    } else {
      calculateSpotlight();
    }

    window.addEventListener("resize", calculateSpotlight);
    window.addEventListener("scroll", calculateSpotlight);
    return () => {
      window.removeEventListener("resize", calculateSpotlight);
      window.removeEventListener("scroll", calculateSpotlight);
    };
  }, [currentStepIndex, pathname, isVisible, currentStep.path, router]);

  const calculateSpotlight = () => {
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setSpotlightRect(rect);
      }, 300);
    } else {
      setSpotlightRect(null);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepStepIndex(currentStepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepStepIndex(currentStepIndex - 1);
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    setTutorialCompleted(true);
  };

  if (!mounted || !isVisible || tutorialCompleted) return null;

  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed Overlay with Hole */}
      <div 
        className="absolute inset-0 bg-black/60 pointer-events-auto transition-all duration-500"
        style={{
          clipPath: spotlightRect 
            ? `polygon(0% 0%, 0% 100%, ${spotlightRect.left - 8}px 100%, ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px, ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px, ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px, ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px, ${spotlightRect.left - 8}px 100%, 100% 100%, 100% 0%)`
            : "none"
        }}
      />

      {/* Tooltip Card */}
      {spotlightRect && (
        <div 
          className="absolute pointer-events-auto transition-all duration-500 ease-out flex flex-col items-center"
          style={{
            left: `${Math.min(Math.max(16, spotlightRect.left + (spotlightRect.width / 2) - 160), window.innerWidth - 336)}px`,
            top: spotlightRect.bottom + 20 > window.innerHeight - 300 
              ? `${Math.max(16, spotlightRect.top - 280)}px` 
              : `${spotlightRect.bottom + 20}px`,
            width: "320px"
          }}
        >
          <div className="bg-card shadow-2xl rounded-3xl p-6 border-none ring-1 ring-black/5 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl bg-muted/50", currentStep.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <button 
                onClick={handleFinish}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold font-headline mb-2">{currentStep.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {currentStep.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === currentStepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted"
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-full">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleNext} 
                  className="rounded-full h-9 px-5 font-bold shadow-lg shadow-primary/20"
                >
                  {currentStepIndex === TOUR_STEPS.length - 1 ? "Start Saving" : "Next"}
                  {currentStepIndex < TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Arrow point */}
          <div 
            className={cn(
              "w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent transition-all",
              spotlightRect.bottom + 20 > window.innerHeight - 300
                ? "border-t-[10px] border-t-card -mt-0.5"
                : "border-b-[10px] border-b-card order-first -mb-0.5"
            )}
          />
        </div>
      )}

      {/* Fallback Full-Center Welcome if no rect */}
      {!spotlightRect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
          <div className="bg-card shadow-2xl rounded-3xl p-10 max-w-sm text-center pointer-events-auto animate-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold font-headline mb-4">Welcome to FynWealth</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Take control of your finances with smart tracking and AI-powered insights. Let's show you around your new financial command center!
            </p>
            <Button onClick={handleNext} className="w-full h-12 rounded-xl font-bold text-base">
              Start Walkthrough
            </Button>
            <button 
              onClick={handleFinish}
              className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Tour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
