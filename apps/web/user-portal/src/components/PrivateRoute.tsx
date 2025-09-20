import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
