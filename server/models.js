const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
}, { timestamps: true }));

const Farm = mongoose.model('Farm', new Schema({
  owner: { ...ref('User'), required: true, index: true },
  name: { type: String, required: true },
  village: String,
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  areaAcres: { type: Number, min: 0 },
  soilType: { type: String, enum: ['alluvial', 'black', 'red', 'sandy', 'loamy'], default: 'loamy' },
}, { timestamps: true }));

const Crop = mongoose.model('Crop', new Schema({
  owner: { ...ref('User'), required: true, index: true },
  farm: { ...ref('Farm'), required: true },
  name: { type: String, required: true },
  variety: String,
  sownOn: Date,
  expectedHarvest: Date,
  stage: { type: String, enum: ['sowing', 'vegetative', 'flowering', 'maturity', 'harvested'], default: 'sowing' },
  soilReports: [{ ph: Number, n: Number, p: Number, k: Number, moisture: Number,
    score: Number, advice: [String], takenAt: { type: Date, default: Date.now } }],
  logs: [{ note: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true }));

const Resource = mongoose.model('Resource', new Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['seed', 'fertilizer', 'pesticide', 'tool'], required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
}));

const Order = mongoose.model('Order', new Schema({
  user: { ...ref('User'), index: true },
  items: [{ resource: ref('Resource'), name: String, qty: Number, price: Number }],
  total: Number,
  status: { type: String, enum: ['placed', 'approved', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
}, { timestamps: true }));

const WeatherData = mongoose.model('WeatherData', new Schema({
  farm: { ...ref('Farm'), index: true },
  fetchedAt: { type: Date, default: Date.now },
  current: Object, daily: Object, alerts: [Object],
}));

const Post = mongoose.model('Post', new Schema({
  author: ref('User'), authorName: String,
  kind: { type: String, enum: ['forum', 'consult'], default: 'forum' },
  title: { type: String, required: true }, body: { type: String, required: true },
  hidden: { type: Boolean, default: false },
  replies: [{ author: ref('User'), authorName: String, body: String, isExpert: Boolean, at: { type: Date, default: Date.now } }],
}, { timestamps: true }));

module.exports = { User, Farm, Crop, Resource, Order, WeatherData, Post };
