import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import SplashScreen from './screens/SplashScreen';

const App = () => {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
};

const Root = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return token ? <DashboardScreen /> : <LoginScreen />;
};

export default App;
