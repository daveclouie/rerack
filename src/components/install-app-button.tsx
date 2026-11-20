"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [serviceWorkerError, setServiceWorkerError] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setMessage("ReRack is installed on this device.");
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => setServiceWorkerError(true));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (isInstalled) return;
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      setMessage("ReRack is installed on this device.");
      return;
    }

    const userAgent = navigator.userAgent;
    const isAppleDevice = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    if (isAppleDevice) {
      setMessage("On iPhone or iPad, open this page in Safari, tap Share, then choose Add to Home Screen.");
      return;
    }
    if (!installPrompt) {
      setMessage(serviceWorkerError
        ? "Install support could not start. Use a secure connection and a supported browser, then try again."
        : "Open your browser menu and choose Install ReRack or Add to Home screen.");
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setMessage("ReRack is installed on this device.");
      } else {
        setMessage("Installation was canceled.");
      }
    } catch {
      setMessage("Your browser could not start installation. Use its menu and choose Install ReRack or Add to Home screen.");
    }
  }

  return (
    <div className="install-action">
      <button className="button button-quiet" type="button" onClick={installApp} disabled={isInstalled}>
        {isInstalled ? "Installed" : "Install ReRack"}
      </button>
      <p className="install-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
