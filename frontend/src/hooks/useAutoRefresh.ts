import { useEffect, useRef, useState } from "react";

/**
 * Hook to auto-refresh data every N milliseconds
 * @param callback Function to call on refresh
 * @param interval Refresh interval in milliseconds (default: 3 minutes)
 * @param enabled Whether auto-refresh is enabled
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  interval: number = 3 * 60 * 1000, // 3 minutes
  enabled: boolean = true
) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Manual refresh function
  const refresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await callbackRef.current();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh timer
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      refresh();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled]);

  return {
    lastUpdated,
    isRefreshing,
    refresh
  };
}
