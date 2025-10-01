'use client';

import { ReactNode } from "react";
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import BootstrapClient from './components/BootstrapClient';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BootstrapClient />
      <AuthProvider>
        <Header />
        <main className="flex-grow-1">{children}</main>
        <Footer />
      </AuthProvider>
    </>
  );
}