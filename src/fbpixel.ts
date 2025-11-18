// Safe FB Pixel integration for React SPA with TypeScript

declare global {
  interface Window {
    fbqInitialized?: boolean;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

let initialized = false;

/**
 * Initialize the Facebook Pixel safely.
 * Ensures single initialization in SPA.
 */
export const initFacebookPixel = (): void => {
  if (typeof window === 'undefined') return;
  if (window.fbqInitialized || initialized) return;

  try {
    (function(f: any, b, e, v, n?, t?, s?) {
      if (typeof f.fbq !== 'undefined') return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (typeof f._fbq === 'undefined') f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode?.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbqInitialized = true;
    initialized = true;

    window.fbq?.('init', '862723852989129'); // Replace with your Pixel ID
    window.fbq?.('track', 'PageView');
  } catch (err) {
    console.error('FB Pixel init failed', err);
  }
};

/**
 * Safely track a Facebook Pixel event.
 */
export const safeFbqTrack = (event: string, params?: Record<string, any>): void => {
  if (typeof window === 'undefined') return;
  try {
    if (window.fbqInitialized) {
      window.fbq?.('track', event, params);
    }
  } catch (err) {
    console.error(`FB Pixel track ${event} failed`, err);
  }
};

/**
 * Track a page view event.
 */
export const pageView = (): void => safeFbqTrack('PageView');

/**
 * Track a custom event with optional parameters.
 */
export const trackEvent = (event: string, params?: Record<string, any>): void => safeFbqTrack(event, params);