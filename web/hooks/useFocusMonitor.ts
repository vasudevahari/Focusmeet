"use client";

import { useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { FocusEvent, FocusSnapshot, ParticipantFocusData } from "@/types";

const MAX_TIMELINE_POINTS = 120; // 1 min at 500ms ticks

export function useFocusMonitor(roomCode: string) {
  // Per-participant focus data (host view)
  const [focusData, setFocusData] = useState<Map<string, ParticipantFocusData>>(new Map());
  // Incoming real-time notifications for the host
  const [notifications, setNotifications] = useState<
    Array<{ id: string; userId: string; displayName: string; message: string; eventType: string; timestamp: number }>
  >([]);

  const notifIdRef = useRef(0);

  // Called by host's socket listener (in useRoom) when focus:event arrives
  const handleFocusEvent = useCallback(
    (data: {
      userId: string;
      displayName: string;
      eventType: string;
      message: string;
      timestamp: number;
    }) => {
      setFocusData((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) {
          existing.warningCount += 1;
          existing.events = [
            ...existing.events,
            {
              type: data.eventType as FocusEvent["type"],
              message: data.message,
              timestamp: data.timestamp,
            },
          ].slice(-50);
        }
        return next;
      });

      // Add notification
      const id = `notif_${notifIdRef.current++}`;
      setNotifications((prev) => [
        { id, userId: data.userId, displayName: data.displayName, message: data.message, eventType: data.eventType, timestamp: data.timestamp },
        ...prev,
      ].slice(0, 20));

      // Auto-dismiss after 8s
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 8000);
    },
    []
  );

  // Called when focus:updated comes in (everyone receives this)
  const handleFocusUpdate = useCallback(
    (userId: string, displayName: string, score: number) => {
      setFocusData((prev) => {
        const next = new Map(prev);
        const now = Date.now();
        const existing = next.get(userId);
        if (existing) {
          existing.currentScore = score;
          existing.timeline = [
            ...existing.timeline,
            { timestamp: now, score },
          ].slice(-MAX_TIMELINE_POINTS);
        } else {
          next.set(userId, {
            userId,
            displayName,
            currentScore: score,
            timeline: [{ timestamp: now, score }],
            warningCount: 0,
            events: [],
          });
        }
        return next;
      });
    },
    []
  );

  // Called locally for the current user's own focus score
  const sendFocusScore = useCallback(
    (score: number, userId: string, displayName: string) => {
      getSocket().emit("focus:update", { roomCode, userId, score });
      handleFocusUpdate(userId, displayName, score);
    },
    [roomCode, handleFocusUpdate]
  );

  // Called locally when FocusAIWorker fires an event
  const sendFocusEvent = useCallback(
    (
      event: FocusEvent,
      userId: string,
      displayName: string
    ) => {
      getSocket().emit("focus:event", {
        roomCode,
        userId,
        displayName,
        eventType: event.type,
        message: event.message,
        timestamp: event.timestamp,
      });
    },
    [roomCode]
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Aggregate stats for all participants
  const getAggregateStats = useCallback(() => {
    const all = Array.from(focusData.values());
    if (all.length === 0) return { avg: 0, totalWarnings: 0, focusedCount: 0 };
    const avg = all.reduce((s, d) => s + d.currentScore, 0) / all.length;
    const totalWarnings = all.reduce((s, d) => s + d.warningCount, 0);
    const focusedCount = all.filter((d) => d.currentScore >= 70).length;
    return { avg: Math.round(avg), totalWarnings, focusedCount };
  }, [focusData]);

  return {
    focusData,
    notifications,
    handleFocusEvent,
    handleFocusUpdate,
    sendFocusScore,
    sendFocusEvent,
    dismissNotification,
    getAggregateStats,
  };
}
