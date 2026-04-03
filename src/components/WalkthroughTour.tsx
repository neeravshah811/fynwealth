"use client";

import { useState, useEffect, useCallback } from "react";
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
  Files,
  Loader2
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
    description: "Add all your expenses in one go - Import your bank statement, enter manually, scan bills with your camera, or record transactions instantly using your voice.",
    targetId: "tour-expense-capture",
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
  const { tutorialCompleted, setTutorialCompleted, tourStepIndex, setTourStepIndex } = useFynWealthStore();
  
  const [isVisible, setIsVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!tutorialCompleted) {
      // Small delay to let the initial page settle
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [tutorialCompleted]);

  // If tour has already progressed past step 0, don't show welcome again
  useEffect(() => {
    if (tourStepIndex > 0) {
      setShowWelcome(false);
    }
  }, [tourStepIndex]);

  const currentStep = TOUR_STEPS[tourStepIndex];

  const calculateSpotlight = useCallback(() => {
    if (!isVisible || showWelcome) return;
    
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSpotlightRect(rect);
          setIsNavigating(false);
        } else {
          setSpotlightRect(null);
        }
      }, 400);
    } else {
      setSpotlightRect(null);
    }
  }, [isVisible, showWelcome, currentStep.targetId]);

  useEffect(() => {
    if (!isVisible || tutorialCompleted || showWelcome) return;

    if (pathname !== currentStep.path) {
      setIsNavigating(true);
      setSpotlightRect(null);
      router.push(currentStep.path);
    } else {
      const timer = setTimeout(calculateSpotlight, 500);
      return () => clearTimeout(timer);
    }

    window.addEventListener("resize", calculateSpotlight);
    window.addEventListener("scroll", calculateSpotlight);
    return () => {
      window.removeEventListener("resize", calculateSpotlight);
      window.removeEventListener("scroll", calculateSpotlight);
    };
  }, [tourStepIndex, pathname, isVisible, tutorialCompleted, currentStep.path, router, calculateSpotlight, showWelcome]);

  const handleStartTour = () => {
    setShowWelcome(false);
  };

  const handleNext = () => {
    if (tourStepIndex < TOUR_STEPS.length - 1) {
      setIsNavigating(true);
      setTourStepIndex(tourStepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (tourStepIndex > 0) {
      setIsNavigating(true);
      setTourStepIndex(tourStepIndex - 1);
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    setTutorialCompleted(true);
    // Always return to dashboard on finish/skip
    router.push('/dashboard');
  };

  if (!mounted || !isVisible || tutorialCompleted) return null;

  const Icon = currentStep.icon;
  const padding = 12;
  const isTooLow = spotlightRect ? (spotlightRect.bottom + 320 > window.innerHeight) : false;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed Overlay with Hole */}
      <div 
        className="absolute inset-0 bg-black/60 pointer-events-auto transition-all duration-500"
        style={{
          clipPath: spotlightRect && !showWelcome
            ? `polygon(0% 0%, 0% 100%, ${spotlightRect.left - padding}px 100%, ${spotlightRect.left - padding}px ${spotlightRect.top - padding}px, ${spotlightRect.right + padding}px ${spotlightRect.top - padding}px, ${spotlightRect.right + padding}px ${spotlightRect.bottom + padding}px, ${spotlightRect.left - padding}px ${spotlightRect.bottom + padding}px, ${spotlightRect.left - padding}px 100%, 100% 100%, 100% 0%)`
            : "none"
        }}
      />

      {/* Tooltip Card */}
      {isVisible && (
        <div 
          className="absolute pointer-events-auto transition-all duration-500 ease-out flex flex-col items-center"
          style={{
            left: spotlightRect && !showWelcome
              ? `${Math.min(Math.max(16, spotlightRect.left + (spotlightRect.width / 2) - 160), window.innerWidth - 336)}px`
              : "50%",
            top: spotlightRect && !showWelcome
              ? (isTooLow 
                  ? `${Math.max(16, spotlightRect.top - 320)}px` 
                  : `${spotlightRect.bottom + 30}px`)
              : "50%",
            transform: spotlightRect && !showWelcome ? "none" : "translate(-50%, -50%)",
            width: "320px"
          }}
        >
          {showWelcome ? (
            <div className="bg-card shadow-2xl rounded-[32px] p-10 text-center animate-in zoom-in duration-500 w-full max-w-sm">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold font-headline mb-4">Welcome to FynWealth</h2>
              <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                Take control of your finances with smart tracking and AI-powered insights. Let's show you around your new financial command center!
              </p>
              <Button onClick={handleStartTour} className="w-full h-12 rounded-xl font-bold text-base shadow-lg">
                Start Walkthrough
              </Button>
              <button 
                onClick={handleFinish}
                className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip Tour
              </button>
            </div>
          ) : (
            <div className="bg-card shadow-2xl rounded-3xl p-6 border-none ring-1 ring-black/5 animate-in fade-in zoom-in duration-300 w-full">
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
              
              {isNavigating ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Entering {currentStep.path.substring(1)}...</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {currentStep.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === tourStepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {tourStepIndex > 0 && (
                    <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-full">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={handleNext} 
                    disabled={isNavigating}
                    className="rounded-full h-9 px-5 font-bold shadow-lg shadow-primary/20"
                  >
                    {tourStepIndex === TOUR_STEPS.length - 1 ? "Start Saving" : "Next"}
                    {tourStepIndex < TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {spotlightRect && !showWelcome && (
            <div 
              className={cn(
                "w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent transition-all",
                isTooLow
                  ? "border-t-[10px] border-t-card -mt-0.5"
                  : "border-b-[10px] border-b-card order-first -mb-0.5"
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
