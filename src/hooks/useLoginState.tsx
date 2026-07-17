import { useEffect, useState } from 'react';
import { LOGIN_CHANGE_EVENT } from '~/context/AuthContext';

export function useLoginChange() {
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const handleLoginChange = (event: CustomEvent<{ state: 'login' | 'logout' }>) => {
      if (event.detail?.state === 'login' || event.detail?.state === 'logout') {
        setTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener(LOGIN_CHANGE_EVENT, handleLoginChange as EventListener);

    return () => {
      window.removeEventListener(LOGIN_CHANGE_EVENT, handleLoginChange as EventListener);
    };
  }, []);

  return trigger;
}
