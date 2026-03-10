
'use client';

import { useEffect, useRef } from 'react';
import { useFynWealthStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

/**
 * Manages browser notifications and in-app toasts for upcoming reminders.
 * Uses a stable interval and checks the store state directly to avoid stale closures.
 */
export function NotificationManager() {
  const markBillNotified = useFynWealthStore((state) => state.markBillNotified);
  
  // Use a ref to track permission status across renders
  const permissionRef = useRef<NotificationPermission | 'not_supported'>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for browser support
    if (!('Notification' in window)) {
      permissionRef.current = 'not_supported';
    } else {
      permissionRef.current = Notification.permission;
      
      // Request permission if not already set
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          permissionRef.current = permission;
        });
      }
    }

    const checkReminders = () => {
      // Always get the freshest state from the store
      const state = useFynWealthStore.getState();
      const { bills, currency } = state;
      const now = new Date();
      
      bills.forEach((bill) => {
        if (bill.status === 'pending' && !bill.notified) {
          try {
            // Parse date and time from stored strings
            const [year, month, day] = bill.dueDate.split('-').map(Number);
            const [hours, minutes] = bill.dueTime.split(':').map(Number);
            
            // Construct a local Date object for the reminder
            const scheduledDate = new Date(year, month - 1, day, hours, minutes);

            // Check if it's time to notify
            if (now >= scheduledDate) {
              const title = `FynWealth Reminder: ${bill.name}`;
              const message = `Payment of ${currency.symbol}${bill.amount} is due.`;

              // 1. Trigger Browser Notification
              if (permissionRef.current === 'granted') {
                try {
                  new Notification(title, {
                    body: message,
                    tag: bill.id,
                    requireInteraction: true
                  });
                } catch (e) {
                  // Fallback if Notification constructor fails
                }
              }

              // 2. Trigger In-app Toast (for immediate visibility)
              toast({
                title: title,
                description: message,
              });

              // 3. Mark as notified to prevent repeating the alert
              markBillNotified(bill.id);
            }
          } catch (err) {
            // Malformed data safety
          }
        }
      });
    };

    // Initial check on mount
    checkReminders();

    // High-precision check every 10 seconds
    const interval = setInterval(checkReminders, 10000);
    
    return () => clearInterval(interval);
  }, [markBillNotified]);

  return null;
}
