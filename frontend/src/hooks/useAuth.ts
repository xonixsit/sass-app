import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token in localStorage
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      try {
        // Decode JWT to get user info (in production, verify signature)
        const parts = savedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          
          // Check if token is expired
          if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            console.log('Token expired, removing');
            localStorage.removeItem('auth_token');
            setIsLoading(false);
            return;
          }
          
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.roles?.[0] || 'user',
            tenantId: payload.tenantId
          });
          setToken(savedToken);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, tenantId: string) => {
    setIsLoading(true);
    try {
      // In production, call your auth API
      // For demo, create a mock JWT with proper roles
      const isAdmin = email.includes('admin') || email.includes('founder');
      const userId = `user_${Date.now()}`;
      
      const mockPayload = {
        sub: userId,
        email,
        name: email.split('@')[0].replace(/\./g, ' '),
        tenantId: tenantId,
        roles: isAdmin ? ['admin'] : ['user'],
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      };

      const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
      
      localStorage.setItem('auth_token', mockToken);
      setToken(mockToken);
      setUser({
        id: mockPayload.sub,
        email: mockPayload.email,
        name: mockPayload.name,
        role: mockPayload.roles[0],
        tenantId: mockPayload.tenantId
      });
    } catch (error) {
      throw new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setToken(null);
  };

  return {
    user,
    token,
    login,
    logout,
    isLoading
  };
};