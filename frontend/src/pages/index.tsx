import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_25%),#020617] text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex rounded-full bg-cyan-500/10 px-4 py-1 text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              PlayasOnTech • Automatización social
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-white sm:text-6xl">
                Tu panel de redes sociales para programar, publicar y escalar como una ola.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Conecta múltiples cuentas de X, Instagram, Facebook y LinkedIn desde un solo flujo. Agenda campañas, administra estados y publica automáticamente sin herramientas externas.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-7 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                Iniciar sesión
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-7 py-3 text-sm font-semibold text-white transition hover:border-cyan-400">
                Crear cuenta
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-8 shadow-[0_35px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="space-y-6">
              <div className="rounded-3xl bg-slate-950/80 p-7">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Resumen rápido</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-900 p-4 text-white">
                    <p className="text-sm text-slate-400">Cuentas soportadas</p>
                    <p className="mt-3 text-2xl font-semibold">4+</p>
                  </div>
                  <div className="rounded-3xl bg-slate-900 p-4 text-white">
                    <p className="text-sm text-slate-400">Estados de publicación</p>
                    <p className="mt-3 text-2xl font-semibold">Draft / Scheduled / Published</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-7">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Características</p>
                <ul className="mt-5 space-y-3 text-slate-300">
                  <li>• Conexión OAuth para redes sociales</li>
                  <li>• Colas de publicación y scheduler</li>
                  <li>• Upload de imágenes y vista previa</li>
                  <li>• Historial y analytics básicos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
