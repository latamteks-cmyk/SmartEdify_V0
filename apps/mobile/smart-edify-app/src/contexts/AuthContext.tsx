import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextData {
  token: string | null;
  user: any; // Se puede definir una interfaz más estricta para el usuario
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const login = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    // Aquí se podría guardar el token en AsyncStorage para persistencia
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Aquí se podría eliminar el token de AsyncStorage
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
