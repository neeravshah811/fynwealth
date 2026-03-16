
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Files,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Reminders", icon: Bell, href: "/bills" },
    { name: "Expenses", icon: Receipt, href: "/expenses", isCenter: true },
    { name: "Budgets", icon: PieChart, href: "/budgets" },
    { name: "Documents", icon: Files, href: "/documents" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgb(0,0,0,0.12)] safe-area-pb">
      <div className="max-w-screen-md mx-auto px-2 h-20 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 transition-all group relative",
                item.isCenter ? "-mt-10" : "h-full"
              )}
              {...(item.isCenter ? { id: "tour-expense-capture" } : {})}
            >
              {item.isCenter ? (
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-primary/30" 
                    : "bg-card border-2 border-primary/20 text-primary shadow-black/5"
                )}>
                  <item.icon className="w-7 h-7" />
                </div>
              ) : (
                <>
                  <item.icon className={cn(
                    "w-6 h-6 mb-1 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className={cn(
                    "text-[9px] md:text-[11px] font-bold uppercase tracking-tight transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )}>
                    {item.name}
                  </span>
                </>
              )}
              {isActive && !item.isCenter && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
