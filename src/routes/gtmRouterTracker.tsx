import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '~/utils/gtm';

export default function GtmRouterTracker() {
  const location = useLocation();

  useEffect(() => {
    // 推送事件到 GTM
    trackEvent('pageview', {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}
