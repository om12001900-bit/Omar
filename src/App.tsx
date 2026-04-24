/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="relative mb-8"
        >
          <div className="w-20 h-20 border-2 border-brand-primary/20 rounded-none animate-[spin_3s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-10 h-10 bg-brand-primary rounded-none shadow-[0_0_20px_rgba(74,222,128,0.5)] flex items-center justify-center text-brand-dark font-black text-xl">
               O
             </div>
          </div>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary"
        >
          Strategic Initializing...
        </motion.p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <UIProvider>
          <div className="min-h-screen selection:bg-brand-primary/30 selection:text-brand-primary">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard/*" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </UIProvider>
      </AuthProvider>
    </Router>
  );
}

