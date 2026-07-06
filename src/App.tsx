import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import ErrorBoundary from '~/components/ErrorBoundary';
import AppWithToast from '~/components/ToastProvider';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import { setGlobalNavigate } from './utils/navigation';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    setGlobalNavigate(navigate);
    return () => {
      setGlobalNavigate(null);
    };
  }, [navigate]);

  return (
    <ErrorBoundary>
      <AppWithToast>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AppWithToast>
    </ErrorBoundary>
  );
}

export default App;
