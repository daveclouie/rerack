"use client";

import { useEffect, useState } from "react";
import { useClientPreferences } from "@/lib/client-preferences";

export function ClosetReminders({ laundryCount, unwornDates }: { laundryCount: number; unwornDates: string[] }) {
  const { preferences } = useClientPreferences();
  const [unwornCount, setUnwornCount] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      setUnwornCount(unwornDates.filter((date) => new Date(date).getTime() < cutoff).length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [unwornDates]);
  const messages = [
    preferences.laundryReminder && laundryCount > 0 ? `${laundryCount} ${laundryCount === 1 ? "piece is" : "pieces are"} in the laundry.` : null,
    preferences.rotationReminder && unwornCount > 0 ? `${unwornCount} clean ${unwornCount === 1 ? "piece has" : "pieces have"} been waiting over 60 days.` : null,
  ].filter((message): message is string => Boolean(message));
  if (!messages.length) return null;
  return <aside className="reminder-panel" aria-label="Wardrobe reminders"><p className="eyebrow">A GENTLE REMINDER</p>{messages.map((message) => <p key={message}>{message}</p>)}</aside>;
}
