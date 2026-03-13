'use client';

import { useEffect, useRef } from 'react';
import { useFynWealthStore } from '@/lib/store';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, updateDoc, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

/**
 * Manages browser notifications and in-app toasts for upcoming reminders.
 * Fetches pending bills from Firestore to ensure data is synced across devices.
 */
export function NotificationManager() {
  const { user } = useUser();
  const db = useFirestore();
  const { currency } = useFynWealthStore();
  
  // Use a ref to track permission status across renders
  const permissionRef = useRef<NotificationPermission | 'not_supported'>('default');

  // Fetch pending bills that haven't been notified yet
  const billsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'bills'),
      where('status', '==', 'pending'),
      where('notified', '==', false)
    );
  }, [db, user?.uid]);

  const { data: bills } = useCollection(billsQuery);

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
  }, []);

  const markBillNotified = async (billId: string) => {
    if (!db || !user?.uid) return;
    try {
      const billRef = doc(db, 'users', user.uid, 'bills', billId);
      await updateDoc(billRef, { notified: true });
    } catch (err) {
      console.error("Failed to mark bill as notified", err);
    }
  };

  useEffect(() => {
    if (!bills || bills.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      
      bills.forEach((bill) => {
        if (!bill.notified) {
          try {
            // Parse date and time from stored strings
            const [year, month, day] = bill.dueDate.split('-').map(Number);
            const [hours, minutes] = (bill.dueTime || "09:00").split(':').map(Number);
            
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
                  // Fallback
                }
              }

              // 2. Trigger In-app Toast
              toast({
                title: title,
                description: message,
              });

              // 3. Mark as notified in Firestore
              markBillNotified(bill.id);
            }
          } catch (err) {
            // Malformed data safety
          }
        }
      });
    };

    // Check immediately when bills update
    checkReminders();

    // High-precision check every 30 seconds
    const interval = setInterval(checkReminders, 30000);
    
    return () => clearInterval(interval);
  }, [bills, currency.symbol, db, user?.uid]);

  return null;
}
