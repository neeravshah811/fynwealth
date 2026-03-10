
'use client';

import { useState } from 'react';
import { TutorialDialog } from './TutorialDialog';

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Help
      </button>
      <TutorialDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
