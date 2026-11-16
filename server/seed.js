require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Resource } = require('./models');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteOne({ email: 'admin@agritech.com' });
  await User.create({ name: 'Admin', email: 'admin@agritech.com', role: 'admin', password: await bcrypt.hash('admin123', 12) });
  if (!(await Resource.countDocuments())) await Resource.insertMany([
    { name: 'Wheat seed (HD-2967), 10 kg', category: 'seed', price: 450, stock: 100 },
    { name: 'Urea, 45 kg bag', category: 'fertilizer', price: 270, stock: 200 },
    { name: 'DAP, 50 kg bag', category: 'fertilizer', price: 1350, stock: 80 },
    { name: 'Neem oil, 1 L', category: 'pesticide', price: 320, stock: 60 },
    { name: 'Hand sprayer, 16 L', category: 'tool', price: 1100, stock: 30 },
  ]);
  console.log('Seeded. Admin login: admin@agritech.com / admin123 (change it after first login)');
  process.exit(0);
})();
