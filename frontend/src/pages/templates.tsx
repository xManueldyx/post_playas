import { useEffect, useState } from 'react';
import Link from 'next/link';

const defaultTemplate = {
  titleColor: '#ffffff',
  background: '#0f172a',
  cardBorder: '#334155',
  accent: '#38bdf8',
  textColor: '#cbd5e1',
  buttonColor: '#22d3ee',
  buttonTextColor: '#0f172a',
};

type TemplateConfig = typeof defaultTemplate;

export default function TemplatesPage() {
  const [template, setTemplate] = useState<TemplateConfig>(defaultTemplate);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('postTemplate') : null;
    if (saved) {
      try {
        setTemplate(JSON.parse(saved));
      } catch {
        setTemplate(defaultTemplate);
      }
    }
  }, []);

  const handleChange = (key: keyof TemplateConfig, value: string) => {
    setTemplate((current) => ({ ...current, [key]: value }));
  };

  const saveTemplate = () => {
    localStorage.setItem('postTemplate', JSON.stringify(template));
    setMessage('Plantilla guardada. Se aplicará en tu dashboard.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-cyan-300">Personaliza tu formato</p>
              <h1 className="text-3xl font-semibold">Editor de plantilla de post</h1>
              <p className="mt-2 text-slate-400">Crea un estilo propio para tus publicaciones y guárdalo para usarlo en el dashboard.</p>
            </div>
            <Link href="/dashboard" className="rounded-full border border-slate-700 px-5 py-3 text-sm text-slate-200 hover:border-cyan-400">
              Volver al dashboard
            </Link>
          </div>
        </header>

        {message && <div className="rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm text-emerald-200">{message}</div>}

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Ajustes de estilo</h2>
            <div className="mt-6 space-y-5">
              {(
                Object.keys(template) as Array<keyof TemplateConfig>
              ).map((key) => (
                <label key={key} className="block text-sm text-slate-300">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  <input
                    type="color"
                    value={template[key]}
                    onChange={(event) => handleChange(key, event.target.value)}
                    className="mt-2 block h-12 w-20 rounded-2xl border border-slate-700 bg-slate-950 p-1"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={saveTemplate}
              className="mt-8 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Guardar plantilla
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Vista previa</h2>
            <div
              className="mt-6 rounded-3xl border p-6 shadow-xl"
              style={{
                background: template.background,
                borderColor: template.cardBorder,
              }}
            >
              <h3 style={{ color: template.titleColor }} className="text-2xl font-semibold">
                Título del post
              </h3>
              <p style={{ color: template.textColor }} className="mt-4 text-sm leading-6">
                Este es un ejemplo de cómo se verá tu publicación con el estilo seleccionado. Cambia los colores para personalizarlo.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span
                  style={{ background: template.accent, color: template.buttonTextColor }}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                >
                  Etiqueta
                </span>
                <a
                  style={{ background: template.buttonColor, color: template.buttonTextColor }}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                >
                  Ver publicación
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
