
'use client';

import { useState, useEffect } from 'react';
import { useFynWealthStore } from '@/lib/store';
import { TutorialDialog } from './TutorialDialog';

/**
 * TutorialTrigger automatically shows the onboarding tutorial
 * for new users after the splash screen finishes.
 */
export function TutorialTrigger() {
  const { hasSeenTutorial, setHasSeenTutorial } = useFynWealthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !hasSeenTutorial) {
      // Delay slightly to appear after the splash screen (2s)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTutorial, mounted]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setHasSeenTutorial(true);
    }
  };

  if (!mounted) return null;

  return <TutorialDialog open={isOpen} onOpenChange={handleOpenChange} />;
}
