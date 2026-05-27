import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import '../styles/globals.css';
import { setAuthToken } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

export default function App({ Component, pageProps }: AppProps) {
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      setAuthToken(token);
      setToken(token);
    }
  }, [setToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
