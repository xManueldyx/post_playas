import { FormEvent, useState } from 'react';
import Link from 'next/link';
import api, { setAuthToken } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      const token = response.data.token as string;
      setAuthToken(token);
      localStorage.setItem('token', token);
      useAuthStore.getState().setToken(token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error de inicio de sesión');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl">
        <h1 className="text-3xl font-semibold">Iniciar sesión</h1>
        <p className="mt-3 text-slate-400">Accede a tu panel y gestiona tus publicaciones automatizadas.</p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Correo electrónico
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Contraseña
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </label>
          {error && <div className="rounded-2xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>}
          <button className="w-full rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
            Iniciar sesión
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-400">
          ¿Aún no tienes cuenta?{' '}
          <a href="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Regístrate aquí
          </a>
        </div>
      </div>
    </div>
  );
}
