import { useEffect, useState, useCallback } from 'react';
import { Download, X, Waves } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const diff = Date.now() - Number(raw);
  return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as any).standalone) return;
    if (wasDismissedRecently()) return;

    // Detect iOS Safari (no beforeinstallprompt on iOS)
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);

    if (isiOS && isSafari) {
      setIsIOS(true);
      // Delay showing on iOS so it doesn't appear instantly
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome — capture the native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Hide when app gets installed
  useEffect(() => {
    const handler = () => {
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
    } catch {
      /* user cancelled */
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] p-3 sm:p-4 lg:hidden">
      <div
        className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-brand/20 bg-surface shadow-2xl shadow-black/20 dark:shadow-black/50"
        style={{ animation: 'slideUp .4s cubic-bezier(.16,1,.3,1)' }}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 rounded-full p-1.5 text-text-secondary hover:bg-surface-dim transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5 p-4">
          {/* App icon */}
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
            <Waves size={26} className="text-white" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-bold text-text-primary">Install Becool Surf</h3>
            <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
              {isIOS
                ? <>Tap <span className="inline-flex items-center font-semibold">Share <svg className="inline w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></span> then <span className="font-semibold">"Add to Home Screen"</span></>
                : 'Add to your home screen for quick access & offline mode.'
              }
            </p>

            {!isIOS && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand/25 hover:bg-brand/90 active:scale-95 transition-all disabled:opacity-60"
              >
                <Download size={14} />
                {installing ? 'Installing...' : 'Install App'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar accent */}
        <div className="h-1 bg-gradient-to-r from-brand/60 via-brand to-brand/60" />
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
