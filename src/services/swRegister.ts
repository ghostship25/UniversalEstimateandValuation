/**
 * Service Worker & PWA Install Manager for Universal Estimating & Valuation (UEV)
 */

export interface PWAState {
  isRegistered: boolean;
  isOnline: boolean;
  canInstall: boolean;
  isInstalled: boolean;
}

type PWAChangeListener = (state: PWAState) => void;

let deferredPrompt: any = null;
const listeners: Set<PWAChangeListener> = new Set();

let currentState: PWAState = {
  isRegistered: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  canInstall: false,
  isInstalled: false,
};

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...currentState }));
}

export function subscribePWAState(listener: PWAChangeListener) {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // Track Online / Offline status
  window.addEventListener('online', () => {
    currentState.isOnline = true;
    notifyListeners();
  });

  window.addEventListener('offline', () => {
    currentState.isOnline = false;
    notifyListeners();
  });

  // Track PWA Installation capability
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    currentState.canInstall = true;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    currentState.canInstall = false;
    currentState.isInstalled = true;
    notifyListeners();
  });

  // Register Workbox Service Worker
  if ('serviceWorker' in navigator) {
    // Unregister service worker in development mode or inside iframe previews to prevent stale Vite dev cache
    if ((import.meta as any).env?.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('[PWA] Unregistered active dev service worker');
          });
        }
      }).catch((err) => {
        console.warn('[PWA] Service worker cleanup note:', err);
      });
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register(`${(import.meta as any).env?.BASE_URL ?? "./"}sw.js`);
        console.log('[PWA] Service Worker registered successfully:', registration.scope);
        currentState.isRegistered = true;
        notifyListeners();
      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    alert('App is already installed or your browser handles installation via the address bar menu.');
    return false;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  currentState.canInstall = false;
  if (outcome === 'accepted') {
    currentState.isInstalled = true;
  }
  notifyListeners();
  return outcome === 'accepted';
}
