import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function PWAUpdatePrompt() {
  const [offlineReady, setOfflineReady] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, reg) {
      if (!reg) return;

      const check = async () => {
        if (!('navigator' in window) || !navigator.onLine) return;
        try {
          const res = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          });
          if (res?.ok) await reg.update();
        } catch {
          /* offline — ignore */
        }
      };

      setInterval(check, CHECK_INTERVAL_MS);
      setTimeout(check, 5000);
    },
    onOfflineReady() {
      setOfflineReady(true);
      setTimeout(() => setOfflineReady(false), 4000);
    },
    onRegisterError(err) {
      console.warn('SW registration failed:', err);
    },
  });

  useEffect(() => {
    const onFocus = () => {
      navigator.serviceWorker?.getRegistration().then((r) => r?.update());
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}
    >
      <div className="p-4">
        {needRefresh ? (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              New version available
            </div>
            <p className="mt-1 text-xs text-white/70">
              A newer version of Becool is ready. Reload to apply the update.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20"
              >
                Later
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            App ready to work offline
          </div>
        )}
      </div>
    </div>
  );
}
