import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('tracking_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('tracking_session_id', sessionId);
  }
  return sessionId;
};

// Get user agent
const getUserAgent = (): string => {
  return navigator.userAgent || 'Unknown';
};

// Get IP address
const getIPAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    const trackPageView = async () => {
      try {
        const sessionId = getSessionId();
        const userAgent = getUserAgent();
        const ipAddress = await getIPAddress();

        await supabase.from('user_activity' as any).insert({
          session_id: sessionId,
          user_agent: userAgent,
          ip_address: ipAddress,
          activity_type: 'page_view',
          page_path: location.pathname,
          metadata: {
            referrer: document.referrer || null,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
        // Silently fail - don't interrupt user experience
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(trackPageView, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return <>{children}</>;
};

