# Backend (Express/MongoDB)

## Setup
1. Copy `.env.example` to `.env` and fill in your MongoDB URI and JWT secret.
2. Run `npm install` to install dependencies.
3. Start the server:
   - For development: `npm run dev`
   - For production: `npm start`

## Deployment
- Use Render, Heroku, or similar Node.js host.
- Ensure environment variables are set.
- The server listens on `process.env.PORT` (default 5000).

## API Endpoints
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login, returns JWT

---

Feel free to add more routes and models for your needs!
