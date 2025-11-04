# Seat Booking Web Application - AI Agent Instructions

## Project Overview
A full-stack seat & parking booking system with real-time updates. Users book office seats and parking slots with time-slot granularity. Frontend (React + Vite) and backend (Express) are deployed separately on Vercel.

## Architecture & Deployment

### Dual-Deployment Structure
- **Frontend**: `src/frontend/` → Vercel static site (dist/)
- **Backend**: `backend/` → Vercel serverless functions
- **Communication**: Frontend calls backend via `VITE_API_BASE_URL` environment variable
- **Database**: Supabase (PostgreSQL) with real-time subscriptions

### Key Environment Variables
Frontend requires in `.env`:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_API_BASE_URL=<backend-api-url>  # e.g., https://your-backend.vercel.app
```

Backend requires:
```
SUPABASE_URL, SUPABASE_ANON_KEY, FRONTEND_URL, NODE_ENV
```

## Data Model & State Management

### Seat Booking Schema
- **Seats table**: `Seat_id` (label), `Seat_Number` (e.g., "A1"), `Status`
- **Bookings table**: `Booking_id`, `Seat_id`, `User_id`, `created_at` (date), `Timeslot` (JSONB)
- **Timeslot Format**: `{ "timeslot": [["09:00", "14:00"], ["15:00", "18:00"]] }`
  - Bookings support **multiple time ranges per day** in a single record
  - Overlap detection happens server-side in `backend/server.js` POST/PUT endpoints

### Real-time Patterns
- **RealtimeContext** (`src/frontend/contexts/RealtimeContext.jsx`) manages Supabase subscriptions
- Subscribe per section/date: `subscribeToBookings(sectionId, date, callback)`
- State structure: `bookingsBySection[sectionId][date][seatNumber][timeslotKey]`
- Normalizes timeslot arrays into keys like `"09:00_14:00"` for lookups
- Falls back to periodic refresh if real-time fails

### Authentication Flow
1. Supabase Auth creates user in `auth.users`
2. **Database trigger** auto-populates `public.Users` table (User_id = auth UID)
3. `App.jsx` implements retry logic (`fetchUserIdWithRetry`) because trigger has slight delay
4. Session persists via Supabase; `onAuthStateChange` listener in `App.jsx`

## Critical Developer Workflows

### Running Locally
```bash
# Frontend (port 5173)
npm run dev

# Backend (port 4000) - in separate terminal
cd backend
npm start
```
**Must run both** for full functionality. Frontend proxies API calls via `VITE_API_BASE_URL`.

### Building & Deploying
```bash
# Frontend build
npm run build              # TypeScript compile + Vite build → dist/

# Deploy (if using Vercel CLI)
npm run deploy:vercel      # Frontend
cd backend && vercel --prod # Backend
```
Both `vercel.json` files configure SPA routing (frontend) and serverless functions (backend).

## Code Patterns & Conventions

### Component Structure
- **Pages**: `ChoicePage.jsx` (dashboard), `FloorLayout.jsx` (section picker), `SectionSeats.jsx` (seat grid), `ParkingBookingRefactored.jsx`
- **Dashboard Layout**: Two-column grid with "My Bookings Today" (left) and "Quick Actions + Recommendations" (right)
- **SVG Overlays**: Section layouts use imported SVGs (e.g., `SectionA.svg`) with overlay coordinates
- **Seat IDs**: Internal format `"Square-A1"` → normalized to `"A1"` for DB queries (strip "Square-" prefix)

### Dashboard Features (ChoicePage)
- **My Bookings Today**: Auto-refreshes every 30s, shows seat + parking bookings for current date
  - Seat bookings have **Edit** and **Cancel** buttons
  - Parking bookings have **Cancel** button only
  - Edit opens `BookingModal` in edit mode with pre-filled timeslots
- **Quick Actions**: Direct navigation buttons to seat/parking booking flows
- **Recommended Bookings**: Real-time availability (refreshes every 45s)
  - Shows 1 random available seat + 1 random available parking slot
  - Clicking seat recommendation → Opens `BookingModal` for instant booking
  - Clicking parking recommendation → Navigates to parking booking page
- **View All Modal**: Opens `UserBookingsModal` with tabbed view (Present/Past bookings)
- **Inline Actions**: Cancel/Edit buttons with instant API calls (no confirmation prompts)

### Booking Flow (Seats)
1. User selects seat(s) + date + time range in `SectionSeats.jsx`
2. `BookingModal.jsx` collects details (single/multiple seats)
3. `bookingService.js` calls `POST /api/bookings` with:
   ```json
   {
     "Seat_id": "A1",
     "created_at": "2025-01-15",
     "Timeslot": { "timeslot": [["09:00", "17:00"]] },
     "User_id": "uuid"
   }
   ```
4. Backend checks overlaps, inserts if free, returns conflicts if any
5. Real-time update broadcasts to all connected clients via `RealtimeContext`

### Parking Booking (Time-Based)
- Separate API in `backend/parking.js` with endpoints:
  - `GET /api/parking/availability?from=<ISO>&to=<ISO>&vehicleType=two|four`
  - `POST /api/parking/book` (validates max 24hr duration, 1-day advance booking limit)
- Parking slots: `parking_slots` table with `vehicle_type` ('two' or 'four')
- Bookings: `parking_bookings` with `start_time`, `end_time` (ISO timestamps)

### Error Handling
- Backend returns structured errors: `{ error: "...", details: "..." }`
- Frontend uses `react-toastify` for user notifications (configured in `App.jsx`)
- Supabase RLS errors bubble up as 403/500 - check Supabase dashboard for RLS policies

### Styling
- **Tailwind CSS 4** (configured in `tailwind.config.js`, imported via `@tailwindcss/postcss`)
- Component-specific CSS in `.css` files (e.g., `SectionSeats.css`)
- Global styles in `src/frontend/index.css`

## Integration Points

### Supabase Client Usage
- **Frontend**: `src/frontend/supabaseClient.js` exports singleton
- **Backend**: `backend/supabaseClient.js` (separate instance with service role key for admin ops)
- **Direct Queries**: Frontend can query Supabase directly for reads; writes go through backend for validation

### API Endpoints (Backend)
Seat Bookings:
- `GET /api/bookings/user/:userId`
- `GET /api/bookings/section/:section/date/:date`
- `POST /api/bookings` (insert with overlap check)
- `PUT /api/bookings/:bookingId` (edit timeslots)
- `DELETE /api/bookings/:bookingId`

Parking Bookings:
- `GET /api/parking/availability`
- `POST /api/parking/book`
- `GET /api/parking/bookings/user/:userId`
- `DELETE /api/parking/bookings/:bookingId`

## Common Pitfalls & Solutions

1. **"User_id not found" after signup**: Normal - retry logic in `App.jsx` handles DB trigger delay
2. **Real-time not working**: Check Supabase dashboard → Database → Replication settings (enable for `Bookings` table)
3. **CORS errors**: Ensure `backend/server.js` `corsOptions.origin` includes your frontend URL
4. **Timeslot conflicts**: Server validates overlaps; client shows conflicts but allows partial booking
5. **Build errors**: Run `npm run build` to catch TypeScript errors before deploying

## Testing & Debugging
- No automated tests currently - manual testing required
- Use browser DevTools Network tab to inspect API calls
- Check Supabase logs for database errors
- Real-time connection status shown via `ConnectionStatusIndicator.jsx`
- Backend logs accessible via Vercel dashboard (Functions → Logs)

## File Navigation Guide
- Routing logic: `src/frontend/App.jsx`
- Seat selection UI: `src/frontend/components/SectionSeats.jsx`
- Real-time state: `src/frontend/contexts/RealtimeContext.jsx`
- API layer: `src/frontend/services/bookingService.js`, `backend/server.js`
- Seat layouts: `src/assets/Section-*.svg`
