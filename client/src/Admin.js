import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api, { errMsg } from './api';
import { useList } from './pages';

const COLORS = ['#2e6b43', '#d99a00', '#2b6c8f', '#8a5a2b', '#6b7f5e'];

export default function Admin() {
  const [stats] = useList('/admin/stats');
  const [users, loadUsers] = useList('/admin/users');
  const [orders, loadOrders] = useList('/orders');
  const [res, loadRes] = useList('/resources');
  const [r, setR] = useState({ name: '', category: 'seed', price: '', stock: '' });
  const [err, setErr] = useState('');
  const add = async (e) => {
    e.preventDefault();
    try { await api.post('/resources', r); setR({ name: '', category: 'seed', price: '', stock: '' }); setErr(''); loadRes(); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <div className="row g-4">
      <div className="col-12"><div className="panel d-flex flex-wrap gap-4 align-items-center">
        {['users', 'farms', 'crops', 'orders', 'posts'].map((k) => <div key={k}><div className="h2 mb-0">{stats[k] ?? '–'}</div>{k}</div>)}
        {stats.byStage?.length > 0 && <div style={{ width: 260, height: 150 }}><ResponsiveContainer><PieChart>
          <Pie data={stats.byStage} dataKey="count" nameKey="_id" outerRadius={55}>{stats.byStage.map((_, i) => <Cell key={i} fill={COLORS[i % 5]} />)}</Pie>
          <Tooltip /><Legend /></PieChart></ResponsiveContainer></div>}
      </div></div>

      <div className="col-md-6"><div className="panel"><h2 className="h5">Orders</h2>
        {orders.length === 0 && <p>No orders yet.</p>}
        {orders.map((o) => <div key={o._id} className="d-flex justify-content-between align-items-center mb-2">
          <span>{o.user?.name}, ₹{o.total}</span>
          <select className="form-select form-select-sm w-auto" aria-label="Order status" value={o.status}
            onChange={async (e) => { await api.patch(`/orders/${o._id}`, { status: e.target.value }); loadOrders(); }}>
            {['placed', 'approved', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></div>)}
      </div></div>

      <div className="col-md-6"><div className="panel"><h2 className="h5">Users</h2>
        {users.map((u) => <div key={u._id} className="d-flex justify-content-between mb-1"><span>{u.name} <small>({u.role})</small></span>
          {u.role !== 'admin' && <button className="btn btn-sm btn-outline-danger" onClick={async () => { if (window.confirm(`Delete ${u.name}?`)) { await api.delete(`/admin/users/${u._id}`); loadUsers(); } }}>Delete</button>}</div>)}
      </div></div>

      <div className="col-12"><div className="panel"><h2 className="h5">Shop items</h2>
        <form className="row g-2 mb-3" onSubmit={add}>
          <div className="col-md-4"><input className="form-control" placeholder="Name" aria-label="Name" required value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></div>
          <div className="col-md-2"><select className="form-select" aria-label="Category" value={r.category} onChange={(e) => setR({ ...r, category: e.target.value })}>
            {['seed', 'fertilizer', 'pesticide', 'tool'].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="col-md-2"><input type="number" min="0" className="form-control" placeholder="Price ₹" aria-label="Price" required value={r.price} onChange={(e) => setR({ ...r, price: e.target.value })} /></div>
          <div className="col-md-2"><input type="number" min="0" className="form-control" placeholder="Stock" aria-label="Stock" required value={r.stock} onChange={(e) => setR({ ...r, stock: e.target.value })} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100">Add item</button></div>
        </form>
        {err && <div className="text-danger" role="alert">{err}</div>}
        {res.map((x) => <div key={x._id} className="d-flex justify-content-between mb-1"><span>{x.name}, ₹{x.price}, {x.stock} left</span>
          <button className="btn btn-sm btn-outline-danger" onClick={async () => { await api.delete(`/resources/${x._id}`); loadRes(); }}>Delete</button></div>)}
      </div></div>
    </div>
  );
}
