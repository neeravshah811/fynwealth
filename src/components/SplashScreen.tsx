"use client";

import React, { useState, useEffect } from "react";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Timing adjusted to 3 seconds as requested
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 3000); 

    const unmountTimer = setTimeout(() => {
      setShouldRender(false);
    }, 3300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#4F21B3] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold font-headline text-white tracking-tighter mb-2">FynWealth</h1>
          <p className="text-white/60 font-medium tracking-[0.2em] uppercase text-[10px]">Know Where Your Money Goes</p>
        </div>
      </div>
    </div>
  );
}
