"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth-context";

interface CreditsInfo {
  total_credits: number;
  used_credits: number;
  remaining: number;
}

export function useCredits() {
  const { getToken, user } = useAuth();
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setCredits(null);
        return;
      }

      const res = await fetch("/api/credits", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch credits");
      }

      const data = await res.json();
      setCredits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    if (user && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchCredits();
    }
    if (!user) {
      fetchedRef.current = false;
      setCredits(null);
    }
  }, [user, fetchCredits]);

  const deductCredits = useCallback(async (pages: number = 1): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = await getToken();
      if (!token) return { success: false, error: "Not authenticated" };

      const res = await fetch("/api/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "deduct", pages }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to deduct credits" };
      }

      // Refresh credits
      setCredits(prev => prev ? {
        ...prev,
        used_credits: prev.used_credits + pages,
        remaining: prev.remaining - pages,
      } : null);

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }, [getToken]);

  return { credits, loading, error, fetchCredits, deductCredits };
}