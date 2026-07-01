# RTV Geolocation Tracker

## Original Repository

Forked from [vilalali/RTVGeolocationTracker](https://github.com/vilalali/RTVGeolocationTracker).  
All added features and bug fixes are documented above.

A full-stack vehicle tracking system built with a Node.js/Express backend, MySQL database via Sequelize ORM, and a React Native mobile frontend. This project extends the original [RTVGeolocationTracker](https://github.com/vilalali/RTVGeolocationTracker) with live ETA tracking, a citizen-facing map screen, and a monorepo structure.

---

## What the Original Repo Did

| Feature              | Status |
| -------------------- | ------ |
| Register truck       | ✅     |
| Login truck driver   | ✅     |
| Save GPS coordinates | ✅     |
| Retrieve coordinates | ✅     |

The original mobile app displayed raw latitude/longitude as plain text. No map, no real-time updates, no citizen-facing interface.

---

## What Was Added

### Bug Fix — `GET /api/locations/locations` (Sequelize Alias Error)

**Root cause:** `models/location.js` defines the association with an alias:

```js
LocationHistory.belongsTo(User, {
  foreignKey: "vehicleId",
  targetKey: "vehicleId",
  as: "user", // ← alias defined here
});
```

But `routes/locationRoutes.js` didn't pass `as` in the `include`, causing Sequelize to throw:

```
User is associated to LocationHistory using an alias.
You must use the 'as' keyword to specify the alias within your include statement.
```

**Fix** (`routes/locationRoutes.js`):

```js
// Before (broken)
include: { model: User, attributes: ['vehicleId', 'vehicleType'] }

// After (fixed)
include: { model: User, as: 'user', attributes: ['vehicleId', 'vehicleType'] }
```

---

### New API Endpoint — `GET /api/locations/vehicle/:vehicleId`

Powers the citizen map screen. Returns vehicle info, the latest position, and up to 50 historical points (oldest → newest, ready for a `<Polyline />`).

```
GET /api/locations/vehicle/VH-001?limit=50
```

```json
{
  "vehicle": { "vehicleId": "VH-001", "vehicleType": "Truck", "username": "driver1" },
  "latest":  { "latitude": 12.97, "longitude": 77.59, "timestamp": "..." },
  "history": [ ... ]
}
```

---

### ETA Tracking (`src/utils/eta.js`)

Dependency-free helpers shared across both screens:

- `getDistanceMeters(lat1, lon1, lat2, lon2)` — Haversine formula
- `getSpeedFromPoints(point1, point2)` — derives m/s from two timestamped locations
- `calculateETA(currentLat, currentLon, destLat, destLon, speedMps)` — returns seconds, or `null` if vehicle is stationary
- `formatETA(seconds)` — `"<1 min"` / `"12m"` / `"1h 5m"`

**Driver screen** (`TrackerDashboard.js`) uses `coords.speed` from the device GPS for higher accuracy.  
**Citizen screen** (`CitizenTrackerScreen.js`) derives speed from the last two backend history points.

---

### Citizen Tracker Screen (`CitizenTrackerScreen.js`)

A public-facing screen — no login required. Citizens enter any registered vehicle ID and see:

- Live position as a marker on a Google Map
- Route history as a blue polyline
- Optional destination pin + ETA display
- Auto-refreshes every 5 seconds

Entry point: **"Track a Vehicle"** button (green) on `HomeScreen`.

---

### Monorepo Structure

The React Native app is merged into the backend folder using `merge-mobile.sh` (rsync, excluding `node_modules` and `.expo`):

```
rtv-geo-location-tracker/
├── merge-mobile.sh                       ← run once to sync mobile into backend
├── .gitignore
├── geo-location-tracker-app/             ← mobile app source (edit here)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── CitizenTrackerScreen.js   ← NEW
│   │   │   ├── TrackerDashboard.js       ← UPDATED (ETA added)
│   │   │   └── HomeScreen.js             ← UPDATED (Track a Vehicle button)
│   │   ├── navigation/
│   │   │   └── MainStack.js              ← UPDATED (CitizenTracker registered)
│   │   └── utils/
│   │       └── eta.js                    ← NEW
│   ├── app.json                          ← UPDATED (maps + location plugins)
│   └── package.json                      ← UPDATED (react-native-maps added)
└── geo-location-tracker-backend/         ← backend
    ├── models/
    │   ├── user.js
    │   └── location.js
    ├── routes/
    │   └── locationRoutes.js             ← BUG FIXED + new /vehicle/:id endpoint
    ├── config/db.js
    ├── server.js
    ├── package.json                      ← UPDATED (moment added, start script)
    ├── .env.example                      ← NEW (commit this, not .env)
    └── mobile-app/                       ← synced copy (rsync output, don't edit here)
```

---

## API Endpoints

| Method | Endpoint                            | Description                            |
| ------ | ----------------------------------- | -------------------------------------- |
| `POST` | `/api/register/user-signup`         | Register a new truck/driver            |
| `POST` | `/api/login/user-login`             | Login and receive JWT token            |
| `POST` | `/api/locations/new_location_add`   | Save GPS coordinates                   |
| `GET`  | `/api/locations/locations`          | All location records (alias bug fixed) |
| `GET`  | `/api/locations/vehicle/:vehicleId` | History + latest for one vehicle (NEW) |

---

## Tech Stack

| Layer    | Technology               |
| -------- | ------------------------ |
| Backend  | Node.js, Express         |
| ORM      | Sequelize ^6.37.5        |
| Database | MySQL                    |
| Mobile   | React Native, Expo ~52   |
| Maps     | react-native-maps 1.18.0 |

---

## Setup

### Prerequisites

- Node.js v18+
- MySQL running locally
- Google Maps API key (for `app.json`)
- Expo CLI: `npm install -g expo-cli`

### Backend

```bash
cd geo-location-tracker-backend
npm install

# Copy env template and fill in your values
cp .env.example .env

npm run dev        # nodemon (development)
# or
npm start          # plain node
```

### Mobile App

```bash
cd geo-location-tracker-app
npm install
# Edit creds.js — set API_URL to your machine's local IP, e.g. http://192.168.1.x:3001
npx expo start
```

### Monorepo Merge (optional)

After editing the mobile app source, sync it into the backend folder:

```bash
bash merge-mobile.sh
```

---

## Environment Variables

Create `.env` in `geo-location-tracker-backend/` (never commit it):

```env
MYSQL_HOST=localhost
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password
MYSQL_DATABASE=rtv_tracker
JWT_SECRET=replace_with_a_strong_random_secret
PORT=3001
```

---

## .gitignore

Excluded from version control:

```
node_modules/
.expo/
.env
mobile-app/node_modules/
mobile-app/.expo/
mobile-app/creds.js
creds.js
```

---
