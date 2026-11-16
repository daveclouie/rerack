"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ClientPreferences = {
  laundryReminder: boolean;
  rotationReminder: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
};

const STORAGE_KEY = "rerack-preferences";
const CHANGE_EVENT = "rerack-preferences-change";
const defaults: ClientPreferences = {
  laundryReminder: false,
  rotationReminder: false,
  highContrast: false,
  reducedMotion: false,
};
const defaultSnapshot = JSON.stringify(defaults);

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? defaultSnapshot;
  } catch (error) {
    console.warn("Preferences could not be loaded.", error);
    return defaultSnapshot;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useClientPreferences() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => defaultSnapshot);
  let preferences: ClientPreferences;
  try {
    const stored: unknown = JSON.parse(snapshot);
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
      preferences = defaults;
    } else {
      const values = stored as Record<string, unknown>;
      preferences = {
        laundryReminder: typeof values.laundryReminder === "boolean" ? values.laundryReminder : defaults.laundryReminder,
        rotationReminder: typeof values.rotationReminder === "boolean" ? values.rotationReminder : defaults.rotationReminder,
        highContrast: typeof values.highContrast === "boolean" ? values.highContrast : defaults.highContrast,
        reducedMotion: typeof values.reducedMotion === "boolean" ? values.reducedMotion : defaults.reducedMotion,
      };
    }
  } catch (error) {
    console.warn("Saved preferences were invalid and were reset.", error);
    preferences = defaults;
  }

  useEffect(() => {
    document.documentElement.dataset.contrast = preferences.highContrast ? "high" : "normal";
    document.documentElement.dataset.motion = preferences.reducedMotion ? "reduced" : "normal";
  }, [preferences.highContrast, preferences.reducedMotion]);

  function update(key: keyof ClientPreferences, value: boolean) {
    const next = { ...preferences, [key]: value };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("Preference could not be saved.", error);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { preferences, update };
}
