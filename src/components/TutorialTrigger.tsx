
'use client';

import { useState, useEffect } from 'react';
import { useFynWealthStore } from '@/lib/store';
import { WalkthroughTour } from './WalkthroughTour';

/**
 * TutorialTrigger automatically shows the contextual walkthrough
 * for new users after they have authenticated and the app is ready.
 */
export function TutorialTrigger() {
  const { tutorialCompleted } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || tutorialCompleted) return null;

  return <WalkthroughTour />;
}
