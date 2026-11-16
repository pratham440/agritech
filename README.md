# Agri-Tech: smart farm management (MERN)

Farmers track farms and crops, check soil health, get 7-day weather and pest alerts, order supplies, and ask the community or an expert. Admins manage users, shop stock, orders and content.

## Run it
Needs Node 18+ and MongoDB (local or Atlas).

```bash
# 1. API
cd server && cp .env.example .env     # set MONGO_URI and a long JWT_SECRET
npm install && npm run seed && npm run dev      # http://localhost:5000

# 2. Web app (new terminal)
cd client && npm install && npm start           # http://localhost:3000
```
Seed creates an admin (`admin@agritech.com` / `admin123`, change it) and sample shop items.

## Structure
- `server/models.js`: Users, Farms, Crops, Resources, Orders, WeatherData, Posts (linked by ObjectId refs)
- `server/routes/index.js`: all REST routes; farmers only reach their own data, admin routes use `restrictTo('admin')`
- `server/utils.js`: soil analysis and pest alert rules (edit the thresholds for your region)
- `client/src/pages.js`: farmer screens; `Admin.js` is lazy-loaded; `i18n.js` holds English and Hindi

## Security notes
JWT auth (7-day), bcrypt (12 rounds), helmet, CORS limited to `CLIENT_URL`, input validation with express-validator, and the role is never accepted from the registration request.

## Testing with Postman
Log in at `POST /api/auth/login`, copy the token, then send `Authorization: Bearer <token>` on `/api/farms`, `/api/crops`, `/api/weather/:farmId`, `/api/orders`, `/api/posts`, `/api/admin/stats`.

## Not included yet
Automated tests, rate limiting on login, and password reset. Weather comes from Open-Meteo (free, no key) and is cached for 30 minutes.
