import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api, { setAuthToken } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

const providers = [
  { id: 'X', label: 'X' },
  { id: 'FACEBOOK', label: 'Facebook / Instagram' },
  { id: 'LINKEDIN', label: 'LinkedIn' },
];

interface SocialAccount {
  id: string;
  provider: string;
  providerAccountId: string;
  status: string;
}

interface PostDestination {
  id: string;
  provider: string;
  status: string;
  errorMessage?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string | null;
  destinations: PostDestination[];
}

export default function Dashboard() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});
  const [postTemplate, setPostTemplate] = useState<Record<string, string> | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const tokenState = useAuthStore((s) => s.token);

  const loadData = async () => {
    try {
      const [accountsRes, postsRes] = await Promise.all([
        api.get('/socials'),
        api.get('/posts', {
          params: {
            status: filterStatus !== 'ALL' ? filterStatus : undefined,
            fromDate: filterFrom || undefined,
            toDate: filterTo || undefined,
          },
        }),
      ]);
      setAccounts(accountsRes.data.accounts);
      setPosts(postsRes.data.posts);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error cargando datos. Asegúrate de haber iniciado sesión.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    console.log('[Dashboard] useEffect running');

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      console.log('[Dashboard] Token from URL, saving');
      useAuthStore.getState().setToken(urlToken);
    }

    if (params.get('connected') === 'true') {
      const provider = params.get('provider');
      setMessage(`✓ ${provider} conectado correctamente.`);
      window.history.replaceState({}, '', '/dashboard');
    }

    const currentToken = useAuthStore.getState().token || localStorage.getItem('token');
    console.log('[Dashboard] Token check:', currentToken ? 'FOUND' : 'NOT FOUND');
    if (!currentToken) {
      console.log('[Dashboard] No token, redirecting to login');
      window.location.href = '/login';
      return;
    }

    setAuthToken(currentToken);
    console.log('[Dashboard] Loading data...');
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const saved = localStorage.getItem('postTemplate');
    if (saved) {
      try {
        setPostTemplate(JSON.parse(saved));
      } catch {
        setPostTemplate(null);
      }
    }
  }, []);

  const handleConnect = async (provider: string) => {
    setMessage('');
    setError('');
    const token = tokenState ?? useAuthStore.getState().token;
    if (!token) {
      setError('Debes iniciar sesión para conectar una cuenta.');
      window.location.href = '/login';
      return;
    }
    setConnecting((c) => ({ ...c, [provider]: true }));
    setMessage(`Redirigiendo a ${provider}...`);
    try {
      // Redirect to OAuth authorization endpoint with token in query string
      window.location.href = `/api/auth/authorize/${provider}?token=${encodeURIComponent(token)}`;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error conectando la cuenta.');
      setConnecting((c) => ({ ...c, [provider]: false }));
    }
  };

  const handleDisconnect = async (accountId: string, provider: string) => {
    setMessage('');
    setError('');
    if (!window.confirm(`¿Desconectar ${provider}?`)) {
      return;
    }
    setDisconnecting((d) => ({ ...d, [accountId]: true }));
    try {
      await api.delete(`/socials/${accountId}`);
      setMessage(`${provider} desconectado.`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error desconectando la cuenta.');
    }
    setDisconnecting((d) => ({ ...d, [accountId]: false }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage('');
    setError('');
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/', 'video/'];
    if (!allowedTypes.some((type) => file.type.startsWith(type))) {
      setError('Solo se permiten imágenes y videos, no PDF ni otros archivos.');
      return;
    }

    const formData = new FormData();
    formData.append('media', file);
    setMediaUploading(true);

    try {
      const response = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(response.data.url);
      setMessage('Archivo multimedia cargado correctamente.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error subiendo el archivo.');
    }

    setMediaUploading(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (selectedAccounts.length === 0) {
      setError('Selecciona al menos una cuenta para publicar.');
      return;
    }

    try {
      await api.post('/posts', {
        title,
        content,
        mediaUrl: mediaUrl || imageUrl,
        scheduledAt: scheduledAt || null,
        destinations: selectedAccounts.map((accountId) => {
          const account = accounts.find((item) => item.id === accountId);
          return {
            provider: account?.provider,
            socialAccountId: accountId,
          };
        }),
      });
      setMessage('Post creado correctamente. Si está programado, se publicará automáticamente.');
      setTitle('');
      setContent('');
      setImageUrl('');
      setMediaUrl('');
      setScheduledAt('');
      setSelectedAccounts([]);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creando el post.');
    }
  };

  const handlePublish = async (postId: string) => {
    setMessage('');
    setError('');
    try {
      await api.post(`/posts/${postId}/publish`);
      setMessage('Post enviado al scheduler.');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error enviando post.');
    }
  };

  const handleDelete = async (postId: string) => {
    setMessage('');
    setError('');
    if (!window.confirm('¿Eliminar este post? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.delete(`/posts/${postId}`);
      setMessage('Post eliminado.');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error eliminando el post.');
    }
  };

  const startEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditMediaUrl(post.imageUrl || '');
    setEditScheduledAt(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '');
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditTitle('');
    setEditContent('');
    setEditMediaUrl('');
    setEditScheduledAt('');
  };

  const handleSaveEdit = async () => {
    if (!editingPostId) {
      return;
    }
    setError('');
    setMessage('');
    setEditSaving(true);
    try {
      await api.put(`/posts/${editingPostId}`, {
        title: editTitle,
        content: editContent,
        mediaUrl: editMediaUrl,
        scheduledAt: editScheduledAt || null,
      });
      setMessage('Post actualizado correctamente.');
      cancelEdit();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error actualizando el post.');
    }
    setEditSaving(false);
  };

  const formatDate = (value?: string) => {
    if (!value) return 'No programado';
    const date = new Date(value);
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-8 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-300">Panel de publicaciones</p>
            <h1 className="mt-2 text-3xl font-semibold">Dashboard de redes sociales</h1>
          </div>
          <Link href="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-8 py-10 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div className="text-sm uppercase tracking-[0.16em] text-slate-500">Cuentas sociales</div>
          <div className="space-y-4">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                disabled={!!connecting[provider.id]}
                className={`w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-400 ${
                  connecting[provider.id] ? 'opacity-60 cursor-wait' : ''
                }`}
                onClick={() => handleConnect(provider.id)}
                aria-busy={!!connecting[provider.id]}
              >
                {connecting[provider.id] ? `Conectando ${provider.label}...` : `Conectar ${provider.label}`}
              </button>
            ))}
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">Cuentas conectadas</p>
            <div className="mt-3 space-y-3">
              {accounts.length === 0 ? (
                <div className="rounded-2xl bg-slate-900 p-3 text-sm text-slate-400">No hay cuentas conectadas aún.</div>
              ) : (
                accounts.map((account) => (
                  <div key={account.id} className="rounded-2xl bg-slate-900 p-3 text-sm text-slate-200">
                  <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-white">{account.provider}</div>
                        <div className="text-slate-400">{account.providerAccountId}</div>
                        <div className="mt-1 text-xs text-slate-500">Estado: {account.status}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(account.id, account.provider)}
                        disabled={!!disconnecting[account.id]}
                        className={`text-red-400 hover:text-red-300 transition ${disconnecting[account.id] ? 'opacity-50 cursor-wait' : ''}`}
                        title="Desconectar"
                      >
                        {disconnecting[account.id] ? '…' : '✕'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Crear nuevo post</h2>
            <p className="mt-1 text-sm text-slate-400">Selecciona las cuentas y programa tu publicación.</p>
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Título
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Fecha y hora (opcional)
                  <input
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    type="datetime-local"
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </label>
              </div>
              <label className="block text-sm text-slate-300">
                Contenido
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  required
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Archivo multimedia (imagen o video)
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none file:bg-slate-800 file:border-0 file:px-4 file:py-2 file:text-slate-200 file:bg-cyan-600 file:rounded-xl file:hover:bg-cyan-500"
                />
                {mediaUploading && <p className="mt-2 text-sm text-slate-400">Subiendo archivo...</p>}
                {mediaUrl && (
                  <p className="mt-2 text-sm text-slate-400">
                    Archivo cargado: <a className="text-cyan-300" href={mediaUrl} target="_blank" rel="noreferrer">ver</a>
                  </p>
                )}
              </label>
              <label className="block text-sm text-slate-300">
                Estilo del post
                <Link href="/templates" className="ml-2 text-cyan-300 hover:text-cyan-200 text-sm">
                  Crear formato personalizado
                </Link>
              </label>
              <div className="rounded-3xl bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Selecciona destinos</p>
                <div className="mt-3 grid gap-3">
                  {accounts.map((account) => (
                    <label key={account.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={() => {
                          setSelectedAccounts((current) =>
                            current.includes(account.id)
                              ? current.filter((id) => id !== account.id)
                              : [...current, account.id]
                          );
                        }}
                      />
                      <span>{account.provider} ({account.providerAccountId})</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <div className="rounded-2xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>}
              {message && <div className="rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm text-emerald-200">{message}</div>}
              <button className="w-full rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                Crear post
              </button>
            </form>
          </div>

          {editingPostId && (
            <div className="rounded-3xl border border-yellow-700 bg-yellow-950/20 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-yellow-200">Editar post</h2>
                  <p className="mt-1 text-sm text-slate-400">Actualiza el contenido o la programación del post.</p>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400"
                >
                  Cancelar edición
                </button>
              </div>
              <div className="mt-6 space-y-4">
                <label className="block text-sm text-slate-300">
                  Título
                  <input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Contenido
                  <textarea
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  URL de imagen/video
                  <input
                    value={editMediaUrl}
                    onChange={(event) => setEditMediaUrl(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Fecha y hora de publicación
                  <input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={(event) => setEditScheduledAt(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="rounded-full border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    {editSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Posts creados</h2>
                <p className="mt-1 text-sm text-slate-400">Revisa tus publicaciones y envíalas al scheduler.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Todos</option>
                  <option value="DRAFT">Borrador</option>
                  <option value="SCHEDULED">Programados</option>
                  <option value="PUBLISHING">Enviado</option>
                  <option value="PUBLISHED">Publicados</option>
                  <option value="FAILED">Fallidos</option>
                </select>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400"
                  onClick={loadData}
                >
                  Aplicar filtros
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {posts.length === 0 ? (
                <div className="rounded-2xl bg-slate-950/80 p-4 text-sm text-slate-400">Aún no hay posts creados.</div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-3xl border p-5"
                    style={{
                      background: postTemplate?.background || 'rgba(15, 23, 42, 0.8)',
                      borderColor: postTemplate?.cardBorder || 'rgb(148 163 184 / 1)',
                      color: postTemplate?.textColor || 'rgb(226 232 240 / 1)',
                    }}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                        <p className="text-sm text-slate-400">Estado: {post.status}</p>
                        <p className="text-sm text-slate-400">Programado para: {formatDate(post.scheduledAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/20"
                          onClick={() => handlePublish(post.id)}
                        >
                          Enviar ahora
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400"
                          onClick={() => startEdit(post)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-500 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                          onClick={() => handleDelete(post.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-slate-300">
                      <p>{post.content}</p>
                      {post.imageUrl && (
                        <div className="mt-3 rounded-2xl bg-slate-900 p-3">
                          <div className="text-slate-300">Archivo multimedia:</div>
                          <a className="text-cyan-300" href={post.imageUrl} target="_blank" rel="noreferrer">ver</a>
                        </div>
                      )}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {post.destinations.map((destination) => (
                          <div key={destination.id} className="rounded-2xl bg-slate-900 p-3 text-sm text-slate-200">
                            <div className="font-semibold">{destination.provider}</div>
                            <div className="text-slate-400">{destination.status}</div>
                            {destination.errorMessage && destination.status === 'FAILED' && (
                              <div className="mt-1 text-xs text-red-400 break-all">{destination.errorMessage}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
