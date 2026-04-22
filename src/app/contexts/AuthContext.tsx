import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../db/types';
import { getCurrentUser, createUser, updateUser, deleteUser, getSetting, setSetting } from '../../db/operations';
import { clearBiometricSettings } from '../../db/operations/biometric';
import { useBiometric, BiometricHook } from '../hooks/useBiometric';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  onboardingComplete: boolean;
  register: (name: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  biometric: BiometricHook;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  const biometric = useBiometric(user?.id ?? '', user?.name ?? '');

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const [currentUser, onboardingSetting] = await Promise.all([
        getCurrentUser(),
        getSetting<boolean>('onboardingComplete'),
      ]);
      setUser(currentUser || null);
      setOnboardingComplete(onboardingSetting ?? false);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function register(name: string) {
    const deviceId = crypto.randomUUID();
    const id = await createUser(name, deviceId);
    await setSetting('onboardingComplete', false);
    const newUser = await getCurrentUser();
    setUser(newUser ?? { id, name, createdAt: Date.now(), deviceId });
    setOnboardingComplete(false);
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) return;
    await updateUser(user.id, updates);
    setUser({ ...user, ...updates });
  }

  async function logout() {
    if (!user) return;
    await clearBiometricSettings();
    await deleteUser(user.id);
    setUser(null);
    setOnboardingComplete(false);
  }

  async function completeOnboarding() {
    await setSetting('onboardingComplete', true);
    setOnboardingComplete(true);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, onboardingComplete, register, updateProfile, logout, completeOnboarding, biometric }}>
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
