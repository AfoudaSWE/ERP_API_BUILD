import { useEffect, useLayoutEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Renders Google's native Sign-In button. Silently renders nothing if
 * VITE_GOOGLE_CLIENT_ID isn't configured, so the surrounding auth pages
 * work identically before and after Google sign-in is wired up.
 */
export function GoogleSignInButton({
  onCredential,
  ar,
  locale,
  disabled,
  disabledHint,
}: {
  onCredential: (idToken: string) => void;
  ar: boolean;
  locale?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onCredentialRef = useRef(onCredential);
  useLayoutEffect(() => { onCredentialRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    void loadGoogleScript().then(() => {
      if (cancelled || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.google) return;
    containerRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 320,
      shape: 'pill',
      text: 'continue_with',
      locale: locale ?? (ar ? 'ar' : 'en'),
    });
  }, [ready, ar, locale]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="relative">
      <div ref={containerRef} className={disabled ? 'pointer-events-none opacity-40' : ''} />
      {disabled && disabledHint && (
        <p className="mt-2 text-center text-xs text-navy-500">{disabledHint}</p>
      )}
    </div>
  );
}
