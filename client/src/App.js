import React, { createContext, useContext, useEffect, useState, Suspense, lazy } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import api, { errMsg } from './api';
import { translator, languages } from './i18n';
import { Dashboard, Farms, Crops, Shop, Community } from './pages';

const Admin = lazy(() => import('./Admin')); // code-split: only admins download it
const Ctx = createContext();
export const useApp = () => useContext(Ctx);

function Auth() {
  const { login, t } = useApp();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { const { data } = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, f); login(data); }
    catch (x) { setErr(errMsg(x)); }
  };
  return (
    <div className="auth">
      <div className="auth-art">
        <h1>Know your field before the sky changes.</h1>
        <p className="mb-0">Weather, soil health, pest alerts and supplies in one place.</p>
      </div>
      <div className="auth-form">
        <form onSubmit={submit}>
          <h2 className="h3 mb-1">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mb-4">{mode === 'login' ? 'Log in to see today’s conditions.' : 'Free for farmers. It takes a minute.'}</p>
          {mode === 'register' && <div className="mb-3"><label className="form-label" htmlFor="n">{t('Name')}</label>
            <input id="n" className="form-control" required value={f.name} onChange={set('name')} /></div>}
          <div className="mb-3"><label className="form-label" htmlFor="e">{t('Email')}</label>
            <input id="e" type="email" className="form-control" required value={f.email} onChange={set('email')} /></div>
          <div className="mb-3"><label className="form-label" htmlFor="p">{t('Password')}</label>
            <input id="p" type="password" minLength={6} className="form-control" required value={f.password} onChange={set('password')} /></div>
          {err && <div className="text-danger mb-3" role="alert">{err}</div>}
          <button className="btn btn-primary w-100 py-2">{mode === 'login' ? t('Log in') : t('Create account')}</button>
          <button type="button" className="btn btn-link w-100 mt-2" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const nav = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  const login = ({ token, user }) => { localStorage.setItem('token', token); setUser(user); nav('/'); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); nav('/'); };
  const changeLang = (l) => { setLang(l); localStorage.setItem('lang', l); };
  const t = translator(lang);

  if (!ready) return <p className="p-4">Loading…</p>;
  const ctx = { user, login, t };
  if (!user) return <Ctx.Provider value={ctx}><Auth /></Ctx.Provider>;

  const links = [['/', 'Dashboard', '🌤️'], ['/farms', 'My farms', '🌾'], ['/crops', 'Crops', '🌱'], ['/shop', 'Shop', '🛒'], ['/community', 'Community', '💬'],
    ...(user.role === 'admin' ? [['/admin', 'Admin', '⚙️']] : [])];
  return (
    <Ctx.Provider value={ctx}>
      <div className="shell">
        <nav className="side" aria-label="Main">
          <div className="brand"><span aria-hidden="true">🌾</span> Agri-Tech</div>
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'}><span className="ico" aria-hidden="true">{icon}</span>{t(label)}</NavLink>))}
        </nav>
        <div>
          <div className="content">
            <div className="pagebar">
              <span className="who">{user.name}</span>
              <select className="form-select form-select-sm" aria-label="Language" value={lang} onChange={(e) => changeLang(e.target.value)}>
                {Object.entries(languages).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn btn-sm btn-outline-secondary" onClick={logout}>{t('Log out')}</button>
            </div>
            <main>
              <Suspense fallback={<p>Loading…</p>}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/farms" element={<Farms />} />
                  <Route path="/crops" element={<Crops />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/admin" element={user.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}