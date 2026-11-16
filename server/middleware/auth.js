const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');

exports.protect = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Please log in' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: 'Account no longer exists' });
    next();
  } catch { res.status(401).json({ message: 'Session expired, log in again' }); }
};
exports.restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Admins only' });

exports.validate = (rules) => [...rules, (req, res, next) => {
  const e = validationResult(req);
  e.isEmpty() ? next() : res.status(400).json({ message: e.array()[0].msg });
}];
exports.wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
exports.errorHandler = (err, req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'Already exists' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
};
