import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../db/types';
import { getCurrentUser, createUser, updateUser, deleteUser } from '../../db/operations';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  register: (name: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser || null);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function register(name: string) {
    const deviceId = navigator.userAgent; // простой идентификатор устройства
    const id = await createUser(name, deviceId);
    const newUser: User = {
      id,
      name,
      createdAt: Date.now(),
      deviceId,
    };
    setUser(newUser);
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) return;
    await updateUser(user.id, updates);
    setUser({ ...user, ...updates });
  }

  async function logout() {
    if (!user) return;
    await deleteUser(user.id);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
