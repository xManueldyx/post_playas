import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import '../styles/globals.css';
import { setAuthToken } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

export default function App({ Component, pageProps }: AppProps) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
