
'use client';

import { useState, useEffect } from 'react';
import { useFynWealthStore } from '@/lib/store';
import { WalkthroughTour } from './WalkthroughTour';

/**
 * TutorialTrigger automatically shows the contextual walkthrough
 * for new users after they have authenticated and the app is ready.
 * 
 * Logic: It only triggers the tour after the user has accepted 
 * the Data Privacy Consent.
 */
export function TutorialTrigger() {
  const { tutorialCompleted, hasAcceptedPrivacy } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure hydration and only show tour if privacy is accepted and tour isn't finished
  if (!mounted || tutorialCompleted || !hasAcceptedPrivacy) return null;

  return <WalkthroughTour />;
}
