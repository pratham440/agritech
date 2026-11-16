const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { body } = require('express-validator');
const M = require('../models');
const { protect, restrictTo, validate, wrap } = require('../middleware/auth');
const { analyzeSoil, pestAlerts } = require('../utils');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, language: u.language });

/* ---------- Auth ---------- */
router.post('/auth/register', validate([
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password needs 6+ characters'),
]), wrap(async (req, res) => {
  const { name, email, password, language } = req.body; // role is never taken from the client
  const user = await M.User.create({ name, email, language, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: sign(user), user: pub(user) });
}));
router.post('/auth/login', wrap(async (req, res) => {
  const user = await M.User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ message: 'Wrong email or password' });
  res.json({ token: sign(user), user: pub(user) });
}));
router.get('/auth/me', protect, (req, res) => res.json({ user: pub(req.user) }));

/* ---------- Farms & Crops (owner-scoped CRUD) ---------- */
const ownedCrud = (path, Model, fields, populate) => {
  const pick = (b) => Object.fromEntries(fields.filter((f) => b[f] !== undefined).map((f) => [f, b[f]]));
  router.get(path, protect, wrap(async (req, res) =>
    res.json(await Model.find({ owner: req.user._id }).populate(populate || '').sort('-createdAt'))));
  router.post(path, protect, wrap(async (req, res) =>
    res.status(201).json(await Model.create({ ...pick(req.body), owner: req.user._id }))));
  router.put(`${path}/:id`, protect, wrap(async (req, res) => {
    const doc = await Model.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, pick(req.body), { new: true, runValidators: true });
    doc ? res.json(doc) : res.status(404).json({ message: 'Not found' });
  }));
  router.delete(`${path}/:id`, protect, wrap(async (req, res) => {
    const doc = await Model.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (doc && path === '/farms') await M.Crop.deleteMany({ farm: doc._id });
    doc ? res.json({ ok: true }) : res.status(404).json({ message: 'Not found' });
  }));
};
ownedCrud('/farms', M.Farm, ['name', 'village', 'lat', 'lon', 'areaAcres', 'soilType']);
ownedCrud('/crops', M.Crop, ['farm', 'name', 'variety', 'sownOn', 'expectedHarvest', 'stage'], 'farm');

router.post('/crops/:id/soil', protect, validate([body('ph').isFloat({ min: 0, max: 14 }).withMessage('pH must be 0 to 14')]),
  wrap(async (req, res) => {
    const crop = await M.Crop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!crop) return res.status(404).json({ message: 'Not found' });
    const r = Object.fromEntries(['ph', 'n', 'p', 'k', 'moisture'].map((f) => [f, Number(req.body[f])]));
    crop.soilReports.push({ ...r, ...analyzeSoil(r) });
    await crop.save();
    res.status(201).json(crop);
  }));
router.post('/crops/:id/logs', protect, wrap(async (req, res) => {
  const crop = await M.Crop.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $push: { logs: { note: req.body.note } } }, { new: true });
  crop ? res.json(crop) : res.status(404).json({ message: 'Not found' });
}));

/* ---------- Weather & pest alerts (Open-Meteo, no API key) ---------- */
router.get('/weather/:farmId', protect, wrap(async (req, res) => {
  const farm = await M.Farm.findOne({ _id: req.params.farmId, owner: req.user._id });
  if (!farm) return res.status(404).json({ message: 'Farm not found' });
  const cached = await M.WeatherData.findOne({ farm: farm._id, fetchedAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) } });
  if (cached) return res.json(cached);
  const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', { params: {
    latitude: farm.lat, longitude: farm.lon, timezone: 'auto', forecast_days: 7,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum' } });
  await M.WeatherData.deleteMany({ farm: farm._id });
  res.json(await M.WeatherData.create({ farm: farm._id, current: data.current, daily: data.daily, alerts: pestAlerts(data.current, data.daily) }));
}));

/* ---------- Resources & Orders ---------- */
router.get('/resources', protect, wrap(async (_q, res) => res.json(await M.Resource.find().sort('category name'))));
router.post('/resources', protect, restrictTo('admin'), wrap(async (req, res) => res.status(201).json(await M.Resource.create(req.body))));
router.put('/resources/:id', protect, restrictTo('admin'), wrap(async (req, res) => res.json(await M.Resource.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
router.delete('/resources/:id', protect, restrictTo('admin'), wrap(async (req, res) => { await M.Resource.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

router.post('/orders', protect, wrap(async (req, res) => {
  const items = [];
  for (const { resource, qty } of req.body.items || []) {
    const r = await M.Resource.findById(resource);
    if (!r || qty < 1 || r.stock < qty) return res.status(400).json({ message: `${r ? r.name : 'Item'} is out of stock` });
    items.push({ resource: r._id, name: r.name, qty, price: r.price });
  }
  if (!items.length) return res.status(400).json({ message: 'Your cart is empty' });
  for (const i of items) await M.Resource.updateOne({ _id: i.resource }, { $inc: { stock: -i.qty } });
  res.status(201).json(await M.Order.create({ user: req.user._id, items, total: items.reduce((s, i) => s + i.qty * i.price, 0) }));
}));
router.get('/orders', protect, wrap(async (req, res) =>
  res.json(await M.Order.find(req.user.role === 'admin' ? {} : { user: req.user._id }).populate('user', 'name').sort('-createdAt'))));
router.patch('/orders/:id', protect, restrictTo('admin'), wrap(async (req, res) =>
  res.json(await M.Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }))));

/* ---------- Community forum & expert consultation ---------- */
router.get('/posts', protect, wrap(async (req, res) => {
  const q = { hidden: false, ...(req.query.kind && { kind: req.query.kind }) };
  if (req.query.kind === 'consult' && req.user.role !== 'admin') q.author = req.user._id;
  res.json(await M.Post.find(q).sort('-createdAt'));
}));
router.post('/posts', protect, validate([body('title').notEmpty().withMessage('Add a title'), body('body').notEmpty().withMessage('Write your question')]),
  wrap(async (req, res) => res.status(201).json(await M.Post.create({ title: req.body.title, body: req.body.body, kind: req.body.kind, author: req.user._id, authorName: req.user.name }))));
router.post('/posts/:id/replies', protect, wrap(async (req, res) => {
  const post = await M.Post.findByIdAndUpdate(req.params.id,
    { $push: { replies: { author: req.user._id, authorName: req.user.name, body: req.body.body, isExpert: req.user.role === 'admin' } } }, { new: true });
  res.json(post);
}));
router.patch('/posts/:id/hide', protect, restrictTo('admin'), wrap(async (req, res) => res.json(await M.Post.findByIdAndUpdate(req.params.id, { hidden: true }, { new: true }))));

/* ---------- Admin ---------- */
router.get('/admin/stats', protect, restrictTo('admin'), wrap(async (_q, res) => {
  const [users, farms, crops, orders, posts] = await Promise.all([M.User.countDocuments(), M.Farm.countDocuments(), M.Crop.countDocuments(), M.Order.countDocuments(), M.Post.countDocuments()]);
  const byStage = await M.Crop.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]);
  res.json({ users, farms, crops, orders, posts, byStage });
}));
router.get('/admin/users', protect, restrictTo('admin'), wrap(async (_q, res) => res.json(await M.User.find().sort('-createdAt'))));
router.delete('/admin/users/:id', protect, restrictTo('admin'), wrap(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "You can't delete your own account" });
  await M.User.findByIdAndDelete(req.params.id); res.json({ ok: true });
}));

module.exports = router;
