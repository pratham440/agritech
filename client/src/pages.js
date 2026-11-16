import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from './api';
import { useApp } from './App';

export function useList(url) {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(() => api.get(url).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))), [url]);
  useEffect(() => { load(); }, [load]);
  return [data, load, error];
}
const Err = ({ m }) => (m ? <div className="text-danger my-2" role="alert">{m}</div> : null);
const Field = ({ label, ...p }) => (
  <div className="mb-3"><label className="form-label">{label}<input className="form-control" {...p} /></label></div>
);

/* ---------------- Dashboard ---------------- */
const verdict = (w) => {
  if (w.daily.precipitation_sum[0] >= 2) return 'Rain today. Hold off on spraying and fertiliser.';
  if (w.current.wind_speed_10m > 20) return 'Windy. Spray would drift, so wait for a calmer hour.';
  if (w.current.relative_humidity_2m > 85) return 'Very humid. Watch your leaves for fungus before spraying.';
  return 'Good conditions for field work and spraying today.';
};
const STAGES = ['sowing', 'vegetative', 'flowering', 'maturity', 'harvested'];

export function Dashboard() {
  const { t, user } = useApp();
  const [farms] = useList('/farms');
  const [crops] = useList('/crops');
  const [id, setId] = useState('');
  const [w, setW] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (!id && farms[0]) setId(farms[0]._id); }, [farms, id]);
  useEffect(() => {
    if (!id) return;
    setW(null); setErr('');
    api.get(`/weather/${id}`).then((r) => setW(r.data)).catch((e) => setErr(errMsg(e)));
  }, [id]);

  if (farms.length === 0) return (
    <div className="empty">
      <svg viewBox="0 0 320 150" role="img" aria-label="A sunny field">
        <rect width="320" height="150" fill="#eef5d6" />
        <circle cx="250" cy="42" r="24" fill="#f2a900" />
        <path d="M0 150V92Q160 58 320 96V150Z" fill="#2f7a46" />
        <path d="M0 150V112Q160 80 320 118V150Z" fill="#276a3c" />
        <path d="M0 150V132Q160 106 320 136V150Z" fill="#1f5236" />
      </svg>
      <div>
        <h1 className="h3">Add your first farm</h1>
        <p>Give it a location and you will see today’s weather, a 7-day forecast and pest alerts here.</p>
        <Link className="btn btn-primary" to="/farms">Add a farm</Link>
      </div>
    </div>
  );
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const farm = farms.find((f) => f._id === id);
  const d = w?.daily;
  const lo = d ? Math.min(...d.temperature_2m_min) : 0;
  const hi = d ? Math.max(...d.temperature_2m_max) : 1;
  const span = Math.max(hi - lo, 1);
  const maxRain = d ? Math.max(...d.precipitation_sum, 1) : 1;
  const here = crops.filter((c) => (c.farm?._id || c.farm) === id);

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <h1 className="h2 mb-0 me-auto">{greet}, {user.name.split(' ')[0]}</h1>
        <select className="form-select w-auto" aria-label="Farm" value={id} onChange={(e) => setId(e.target.value)}>
          {farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
      </div>
      <Err m={err} />
      {!w && !err && <div className="hero"><p className="mb-0">Loading the forecast for {farm?.name}…</p></div>}
      {w && <>
        <section className="hero" aria-label="Current conditions">
          <div className="hero-temp">{Math.round(w.current.temperature_2m)}<span>°C</span></div>
          <div>
            <p className="hero-verdict">{verdict(w)}</p>
            <p className="hero-meta mb-0">{farm?.village || farm?.name} · {t('Humidity')} {w.current.relative_humidity_2m}% · {t('Wind')} {w.current.wind_speed_10m} km/h</p>
          </div>
        </section>

        <div className="row g-4 mt-0">
          <div className="col-lg-7"><div className="panel h-100">
            <h2 className="h5">{t('Next 7 days')}</h2>
            <div className="ribbon">
              {d.time.map((day, i) => (
                <div className="ribbon-row" key={day}>
                  <span className="ribbon-day">{i === 0 ? 'Today' : new Date(day).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="ribbon-lo">{Math.round(d.temperature_2m_min[i])}°</span>
                  <span className="ribbon-track"><span className="ribbon-bar" style={{ left: `${((d.temperature_2m_min[i] - lo) / span) * 100}%`, width: `${Math.max(((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / span) * 100, 4)}%` }} /></span>
                  <span className="ribbon-hi">{Math.round(d.temperature_2m_max[i])}°</span>
                  <span className="ribbon-rain" title="Rainfall"><span style={{ width: `${(d.precipitation_sum[i] / maxRain) * 100}%` }} />{d.precipitation_sum[i] > 0 ? `${d.precipitation_sum[i]} mm` : ''}</span>
                </div>))}
            </div>
          </div></div>
          <div className="col-lg-5"><div className="panel h-100">
            <h2 className="h5">{t('Pest alerts')}</h2>
            {w.alerts.length === 0 && <p className="calm">No pest or weather risks this week.</p>}
            {w.alerts.map((a, i) => <div key={i} className={`field-note alert-${a.level}`}><b>{a.title}</b><br />{a.detail}</div>)}
            <h2 className="h5 mt-4">On this farm</h2>
            {here.length === 0 && <p className="calm">No crops yet. Add one under Crops.</p>}
            {here.map((c) => (
              <div key={c._id} className="crop-line">
                <div className="d-flex justify-content-between"><b>{c.name}</b><span>{c.stage}</span></div>
                <div className="stage-track"><span style={{ width: `${((STAGES.indexOf(c.stage) + 1) / STAGES.length) * 100}%` }} /></div>
              </div>))}
          </div></div>
        </div>
      </>}
    </>
  );
}

/* ---------------- Farms ---------------- */
export function Farms() {
  const { t } = useApp();
  const [farms, load, error] = useList('/farms');
  const blank = { name: '', village: '', lat: '', lon: '', areaAcres: '', soilType: 'loamy' };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { await api.post('/farms', f); setF(blank); setErr(''); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setF((s) => ({ ...s, lat: p.coords.latitude.toFixed(4), lon: p.coords.longitude.toFixed(4) })));
  return (
    <div className="row g-4">
      <form className="col-md-5" onSubmit={save}><div className="panel">
        <h1 className="h4">{t('Add farm')}</h1>
        <Field label="Farm name" required value={f.name} onChange={set('name')} />
        <Field label="Village" value={f.village} onChange={set('village')} />
        <div className="row"><div className="col"><Field label="Latitude" type="number" step="any" required value={f.lat} onChange={set('lat')} /></div>
          <div className="col"><Field label="Longitude" type="number" step="any" required value={f.lon} onChange={set('lon')} /></div></div>
        <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={locate}>Use my location</button>
        <Field label="Area (acres)" type="number" min="0" step="any" value={f.areaAcres} onChange={set('areaAcres')} />
        <label className="form-label">Soil type
          <select className="form-select" value={f.soilType} onChange={set('soilType')}>
            {['alluvial', 'black', 'red', 'sandy', 'loamy'].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <Err m={err} />
        <button className="btn btn-primary d-block mt-3">{t('Save')}</button>
      </div></form>
      <div className="col-md-7">
        <Err m={error} />
        {farms.length === 0 && <div className="panel">No farms yet. Add one to see its weather.</div>}
        {farms.map((x) => (
          <div key={x._id} className="panel mb-3 d-flex justify-content-between align-items-center">
            <div><b className="h5">{x.name}</b><br />{x.village || 'No village'}, {x.areaAcres || '?'} acres, {x.soilType} soil</div>
            <button className="btn btn-outline-danger btn-sm" onClick={async () => { if (window.confirm(`Delete ${x.name} and its crops?`)) { await api.delete(`/farms/${x._id}`); load(); } }}>{t('Delete')}</button>
          </div>))}
      </div>
    </div>
  );
}

/* ---------------- Crops ---------------- */
function SoilCheck({ crop, reload }) {
  const { t } = useApp();
  const [s, setS] = useState({ ph: '', n: '', p: '', k: '', moisture: '' });
  const [err, setErr] = useState('');
  const last = crop.soilReports[crop.soilReports.length - 1];
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post(`/crops/${crop._id}/soil`, s); setS({ ph: '', n: '', p: '', k: '', moisture: '' }); setErr(''); reload(); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <div className="mt-3">
      <form className="row g-2 align-items-end" onSubmit={submit}>
        {[['ph', 'pH'], ['n', 'N kg/ha'], ['p', 'P kg/ha'], ['k', 'K kg/ha'], ['moisture', 'Moisture %']].map(([k, l]) => (
          <div className="col-4 col-md" key={k}><label className="form-label small mb-0">{l}</label>
            <input type="number" step="any" required className="form-control form-control-sm" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>))}
        <div className="col-12 col-md-auto"><button className="btn btn-sm btn-primary">{t('Check soil')}</button></div>
      </form>
      <Err m={err} />
      {last && <div className="mt-3"><span className="soil-score">{last.score}/100</span> soil health
        <ul className="mb-0">{last.advice.map((a) => <li key={a}>{a}</li>)}</ul></div>}
    </div>
  );
}
export function Crops() {
  const { t } = useApp();
  const [crops, load, error] = useList('/crops');
  const [farms] = useList('/farms');
  const [f, setF] = useState({ farm: '', name: '', variety: '', sownOn: '', stage: 'sowing' });
  const [open, setOpen] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { await api.post('/crops', { ...f, farm: f.farm || farms[0]?._id }); setF({ ...f, name: '', variety: '' }); setErr(''); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const stage = async (c, s) => { await api.put(`/crops/${c._id}`, { stage: s }); load(); };
  return (
    <div className="row g-4">
      <form className="col-md-4" onSubmit={save}><div className="panel">
        <h1 className="h4">{t('Add crop')}</h1>
        {farms.length === 0 ? <p>Add a farm first.</p> : <>
          <label className="form-label">Farm<select className="form-select mb-3" value={f.farm || farms[0]._id} onChange={set('farm')}>
            {farms.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select></label>
          <Field label="Crop" required value={f.name} onChange={set('name')} />
          <Field label="Variety" value={f.variety} onChange={set('variety')} />
          <Field label="Sown on" type="date" value={f.sownOn} onChange={set('sownOn')} />
          <Err m={err} /><button className="btn btn-primary">{t('Save')}</button></>}
      </div></form>
      <div className="col-md-8">
        <Err m={error} />
        {crops.length === 0 && <div className="panel">No crops yet. Add one to track growth and soil health.</div>}
        {crops.map((c) => (
          <div key={c._id} className="panel mb-3">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div><b className="h5">{c.name}</b> {c.variety && `(${c.variety})`}<br /><small>{c.farm?.name}{c.sownOn && `, sown ${c.sownOn.slice(0, 10)}`}</small></div>
              <div className="d-flex gap-2 align-items-start">
                <select className="form-select form-select-sm" aria-label="Stage" value={c.stage} onChange={(e) => stage(c, e.target.value)}>
                  {STAGES.map((s) => <option key={s}>{s}</option>)}</select>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(open === c._id ? '' : c._id)}>Soil</button>
                <button className="btn btn-sm btn-outline-danger" onClick={async () => { await api.delete(`/crops/${c._id}`); load(); }}>{t('Delete')}</button>
              </div>
            </div>
            <div className="stage-track"><span style={{ width: `${((STAGES.indexOf(c.stage) + 1) / STAGES.length) * 100}%` }} /></div>
            {open === c._id && <SoilCheck crop={c} reload={load} />}
          </div>))}
      </div>
    </div>
  );
}

/* ---------------- Shop ---------------- */
const CAT = { seed: ['🌱', '#f3e6a6'], fertilizer: ['🧪', '#cde5f1'], pesticide: ['🛡️', '#e2d6f0'], tool: ['🧰', '#d9ddd0'] };
export function Shop() {
  const { t } = useApp();
  const [items] = useList('/resources');
  const [orders, loadOrders] = useList('/orders');
  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState('');
  const lines = items.filter((i) => cart[i._id]);
  const total = lines.reduce((s, i) => s + i.price * cart[i._id], 0);
  const add = (i) => setCart((c) => ({ ...c, [i._id]: Math.min((c[i._id] || 0) + 1, i.stock) }));
  const order = async () => {
    try { await api.post('/orders', { items: lines.map((i) => ({ resource: i._id, qty: cart[i._id] })) }); setCart({}); setMsg(''); loadOrders(); }
    catch (x) { setMsg(errMsg(x)); }
  };
  return (
    <div className="row g-4">
      <div className="col-lg-8"><h1 className="h2 mb-3">{t('Shop')}</h1>
        <div className="products">
          {items.map((i) => { const [ic, bg] = CAT[i.category] || ['📦', '#eee']; return (
            <div key={i._id} className="product">
              <div className="thumb" style={{ background: bg }} aria-hidden="true">{ic}</div>
              <div className="product-body">
                <b>{i.name}</b>
                <small>{i.category}, {i.stock} in stock</small>
                <div className="d-flex justify-content-between align-items-center mt-auto pt-2">
                  <span className="price">₹{i.price}</span>
                  <button className="btn btn-sm btn-primary" disabled={!i.stock} onClick={() => add(i)}>Add</button>
                </div>
              </div>
            </div>); })}
        </div>
      </div>
      <div className="col-lg-4"><div className="cart-sticky">
        <div className="panel mb-3"><h2 className="h5">Cart</h2>
          {lines.length === 0 ? <p className="mb-0">Your cart is empty.</p> : <>
            {lines.map((i) => <div key={i._id} className="d-flex justify-content-between"><span>{cart[i._id]} × {i.name}</span><span>₹{cart[i._id] * i.price}</span></div>)}
            <hr /><div className="d-flex justify-content-between"><b>Total</b><b className="price">₹{total}</b></div>
            <Err m={msg} /><button className="btn btn-primary mt-3 w-100" onClick={order}>{t('Place order')}</button></>}
        </div>
        <div className="panel"><h2 className="h5">Your orders</h2>
          {orders.length === 0 && <p className="mb-0">No orders yet.</p>}
          {orders.map((o) => <div key={o._id} className="mb-2"><b>₹{o.total}</b>, {o.items.length} item(s), {o.createdAt.slice(0, 10)}<br />
            <span className={`pill pill-${o.status}`}>{o.status}</span></div>)}
        </div>
      </div></div>
    </div>
  );
}

/* ---------------- Community ---------------- */
export function Community() {
  const { t, user } = useApp();
  const [kind, setKind] = useState('forum');
  const [posts, load, error] = useList(`/posts?kind=${kind}`);
  const [f, setF] = useState({ title: '', body: '' });
  const [reply, setReply] = useState({});
  const [err, setErr] = useState('');
  const post = async (e) => {
    e.preventDefault();
    try { await api.post('/posts', { ...f, kind }); setF({ title: '', body: '' }); setErr(''); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const send = async (id) => { if (!reply[id]) return; await api.post(`/posts/${id}/replies`, { body: reply[id] }); setReply({ ...reply, [id]: '' }); load(); };
  return (
    <>
      <div className="btn-group mb-3" role="group">
        {[['forum', 'Forum'], ['consult', 'Ask an expert']].map(([k, l]) => (
          <button key={k} className={`btn ${kind === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setKind(k)}>{t(l)}</button>))}
      </div>
      <form className="panel mb-4" onSubmit={post}>
        <Field label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <label className="form-label w-100">{kind === 'consult' ? 'Describe the problem (only you and experts can see it)' : 'Your question or tip'}
          <textarea className="form-control" rows="3" required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
        <Err m={err} /><button className="btn btn-primary mt-2">Post</button>
      </form>
      <Err m={error} />
      {posts.length === 0 && <div className="panel">Nothing here yet. Be the first to post.</div>}
      {posts.map((p) => (
        <div key={p._id} className="panel mb-3">
          <b className="h5">{p.title}</b> <small>by {p.authorName}</small>
          {user.role === 'admin' && <button className="btn btn-sm btn-link text-danger" onClick={async () => { await api.patch(`/posts/${p._id}/hide`); load(); }}>Hide</button>}
          <p className="mb-1">{p.body}</p>
          {p.replies.map((r, i) => <div key={i} className={`reply ${r.isExpert ? 'expert' : ''}`}><small><b>{r.authorName}</b>{r.isExpert && ' (expert)'}</small><br />{r.body}</div>)}
          <div className="input-group mt-2">
            <input className="form-control" aria-label="Reply" placeholder="Write a reply" value={reply[p._id] || ''} onChange={(e) => setReply({ ...reply, [p._id]: e.target.value })} />
            <button className="btn btn-outline-primary" onClick={() => send(p._id)}>{t('Reply')}</button>
          </div>
        </div>))}
    </>
  );
}