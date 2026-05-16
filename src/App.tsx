/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }: { children: ReactNode }) {
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

// Error Boundary Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ErrorBoundary extends Component<any, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Critical UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-8 flex-col text-center" dir="rtl">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mb-8">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-3xl font-black mb-4">حدث خطأ في النظام</h1>
          <p className="text-slate-400 mb-8 max-w-md">نعتذر عن الإزعاج. واجه التطبيق مشكلة تقنية مفاجئة.</p>
          <pre className="p-4 bg-white/5 border border-white/10 rounded-xl text-[10px] text-red-400 mb-8 max-w-full overflow-auto text-left whitespace-pre-wrap" dir="ltr">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-brand-primary text-brand-dark font-black rounded-2xl hover:scale-105 transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </Router>
  );
}

