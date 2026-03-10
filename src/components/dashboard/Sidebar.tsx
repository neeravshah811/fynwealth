
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Sparkles,
  Trash2,
  Eraser,
  Eye,
  EyeOff,
  Bell,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { useFynWealthStore } from "@/lib/store";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Sidebar as SidebarPrimitive, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const items = [
  { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Expenses", icon: Receipt, href: "/expenses" },
  { name: "Custom Reminders", icon: Bell, href: "/bills" },
  { name: "Budgets", icon: PieChart, href: "/budgets" },
  { name: "AI Insights", icon: Sparkles, href: "/insights" },
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { clearAllData, clearMonthlyExpenses, viewMonth, viewYear, privacyMode, togglePrivacyMode } = useFynWealthStore();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleClearAllData = () => {
    clearAllData();
    toast({ title: "System Reset", description: "All data cleared successfully." });
    window.location.reload();
  };

  const handleClearMonthlyExpenses = () => {
    clearMonthlyExpenses();
    toast({ title: "Monthly Data Cleared", description: "Expenses for this month have been removed." });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "Successfully logged out." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to sign out." });
    }
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(viewYear, viewMonth));

  return (
    <SidebarPrimitive className="border-r bg-card">
      <SidebarHeader className="p-4 pb-2">
        <div className="mb-2">
          <Logo className="scale-90 origin-left" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Know Where Your Money Goes
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name} className="h-10">
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all group",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto py-2">
          <SidebarGroupContent>
            <div className="px-3 py-2 bg-muted/30 rounded-lg flex items-center justify-between mx-2">
              <div className="flex items-center gap-2">
                {privacyMode ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4 text-primary" />}
                <Label htmlFor="privacy-toggle" className="text-[11px] font-bold uppercase cursor-pointer tracking-tight">Privacy Mode</Label>
              </div>
              <Switch 
                id="privacy-toggle"
                checked={privacyMode}
                onCheckedChange={togglePrivacyMode}
                className="scale-75"
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 pt-0 gap-1 flex flex-col">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              className="flex items-center gap-2 px-3 py-1.5 w-full rounded-md text-[10px] font-bold uppercase tracking-tight text-amber-600 hover:bg-amber-50 transition-colors text-left"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Clear monthly data</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear {monthName} Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all expense transactions recorded for {monthName} {viewYear}. Budget targets and other months' data will remain safe.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearMonthlyExpenses} className="bg-amber-600 hover:bg-amber-700">
                Yes, clear monthly data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              className="flex items-center gap-2 px-3 py-1.5 w-full rounded-md text-[10px] font-bold uppercase tracking-tight text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset app data</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset app data?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete ALL expenses, custom categories, budget limits, and profile settings for all years. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, clear everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              className="flex items-center gap-2 px-3 py-1.5 w-full rounded-md text-[10px] font-bold uppercase tracking-tight text-muted-foreground hover:bg-muted/30 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to log out of FynWealth?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-primary">
                Yes, Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 mt-1">
          <p className="text-[9px] font-bold text-primary mb-1 uppercase tracking-widest">Pro Tip</p>
          <p className="text-[11px] text-muted-foreground leading-tight font-medium">
            Record utilities regularly for accurate AI heavy-spending forecasts.
          </p>
        </div>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
