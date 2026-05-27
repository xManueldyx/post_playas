import { FormEvent, useState } from 'react';
import Link from 'next/link';
import api from '../lib/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/register', { email, password });
      setSuccess('Usuario registrado correctamente. Ya puedes iniciar sesión.');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el usuario');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/90 p-10 shadow-[0_25px_80px_rgba(15,23,42,0.75)] backdrop-blur-xl">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Regístrate en PlayasOnTech</p>
          <h1 className="text-3xl font-semibold text-white">Crea tu cuenta y automatiza tus publicaciones</h1>
          <p className="text-sm leading-6 text-slate-400">
            Conecta X, Instagram, Facebook y LinkedIn desde un solo dashboard moderno.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Correo electrónico
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Contraseña
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={8}
              className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </label>

          {error && <div className="rounded-3xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>}
          {success && <div className="rounded-3xl bg-emerald-500/20 px-4 py-3 text-sm text-emerald-200">{success}</div>}

          <button className="w-full rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
            Crear cuenta
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
