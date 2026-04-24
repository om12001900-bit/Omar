import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { UserSettings } from '../types';

interface UIContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const defaultSettings: UserSettings = {
  themeColor: '#4ade80',
  darkMode: true,
  fontSize: 'medium',
  borderRadius: 'none'
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  useEffect(() => {
    if (profile?.settings) {
      setSettings(profile.settings);
      applySettingsToDOM(profile.settings);
    } else {
      setSettings(defaultSettings);
      applySettingsToDOM(defaultSettings);
    }
  }, [profile?.settings]);

  const applySettingsToDOM = (s: UserSettings) => {
    const root = document.documentElement;
    
    // Apply Dark/Light mode
    root.setAttribute('data-theme', s.darkMode ? 'dark' : 'light');
    
    // Apply Primary Color
    root.style.setProperty('--brand-primary', s.themeColor);
    
    // Apply Primary Color RGB for translucency
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };
    root.style.setProperty('--brand-primary-rgb', hexToRgb(s.themeColor));
    
    // Apply Font Size
    root.setAttribute('data-font-size', s.fontSize);
    
    // Apply Border Radius
    let radius = '0px';
    if (s.borderRadius === 'small') radius = '4px';
    if (s.borderRadius === 'medium') radius = '12px';
    if (s.borderRadius === 'full') radius = '9999px';
    root.style.setProperty('--radius', radius);
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    applySettingsToDOM(updated);
    
    if (profile) {
      await updateProfile({ settings: updated });
    }
  };

  return (
    <UIContext.Provider value={{ settings, updateSettings }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
