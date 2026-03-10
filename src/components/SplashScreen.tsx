
"use client";

import React, { useState, useEffect } from "react";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1000); // Reduced to 1 second for faster app start
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#4F21B3] animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 animate-in zoom-in-50 duration-500 delay-100">
        <div className="text-center">
          <h1 className="text-6xl font-bold font-headline text-white tracking-tighter mb-2">FynWealth</h1>
          <p className="text-white/60 font-medium tracking-[0.2em] uppercase text-xs">Know Where Your Money Goes</p>
        </div>
      </div>
    </div>
  );
}
