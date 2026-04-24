import React, { createContext, useContext, useEffect, useState } from 'react';
import { localAuth, localDB } from '../services/localDB';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  loginLocally: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = localAuth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const users = localDB.getAll('users');
        const userProfile = users.find((u: any) => u.uid === currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          const newProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'مستخدم',
            email: currentUser.email || '',
            photoURL: '',
            createdAt: new Date().toISOString()
          };
          localDB.add('users', newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    checkAuth();
    window.addEventListener('auth-state-change', checkAuth);
    return () => window.removeEventListener('auth-state-change', checkAuth);
  }, []);

  const signOut = async () => {
    localAuth.logout();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const users = localDB.getAll('users');
    const index = users.findIndex((u: any) => u.uid === user.uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      localDB.setAll('users', users);
      setProfile(users[index]);
    }
  };

  const loginLocally = async (email: string) => {
    const mockUser = {
      uid: 'local-user-123',
      email: email,
      displayName: email.split('@')[0]
    };
    localAuth.setUser(mockUser);
  };

  const uploadAvatar = async (file: File) => {
    // Local path simulation
    const fakeUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`;
    await updateProfile({ photoURL: fakeUrl });
    return fakeUrl;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile, uploadAvatar, loginLocally }}>
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
