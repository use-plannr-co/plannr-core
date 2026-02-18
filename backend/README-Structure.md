# Plannr Backend - Modular Structure

## Project Structure

```
src/
├── server.js                 # Main server entry point
├── config/                   # Configuration files
│   ├── cron.js
│   ├── db.js
│   └── env.js
├── db/                       # Database schema
│   └── schema.js
├── middleware/               # Express middleware
│   ├── auth.js
│   ├── error.js              # Error handling
│   └── validate.js
├── routes/                   # Main route organizer
│   └── index.js              # Imports and organizes all module routes
└── modules/                  # Feature-based modules
    ├── users/                # User management
    │   ├── users.controllers.js
    │   ├── users.repo.js
    │   ├── users.routes.js
    │   └── users.validators.js
    ├── schedules/            # Schedule management
    │   ├── schedules.controllers.js
    │   ├── schedules.repo.js
    │   ├── schedules.routes.js
    │   └── schedules.validators.js
    ├── preferences/          # User preferences
    │   ├── preferences.controllers.js
    │   ├── preferences.repo.js
    │   ├── preferences.routes.js
    │   └── preferences.validators.js
    ├── ai/                   # AI features (Planzo)
    ├── co-plan/              # Collaboration features
    └── productivity-analytics/ # Analytics features
```

## Current API Endpoints

### Health Check

- `GET /api/health` - Server health check

### Users (`/api/users`)

- `POST /users` - Create new user (registration)
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `DELETE /users/profile` - Delete user account
- `POST /users/auth/login` - User login
- `POST /users/auth/logout` - User logout
- `POST /users/auth/refresh` - Refresh auth token

### Schedules (`/api/schedules`)

- `POST /schedules` - Create new schedule
- `GET /schedules` - Get list of schedules (with query params: since, limit, cursor)
- `GET /schedules/:id` - Get full schedule by id
- `PUT /schedules/:id` - Update schedule (metadata or bulk replace blocks)
- `DELETE /schedules/:id` - Soft delete schedule
- `POST /schedules/:id/blocks` - Add one or more blocks to a schedule
- `PUT /schedules/:id/blocks/:blockId` - Update a specific block
- `DELETE /schedules/:id/blocks/:blockId` - Soft delete a specific block
- `POST /schedules/:id/ops` - Apply diff ops (add/update/delete multiple blocks)

### Preferences (`/api/preferences`)

- `GET /preferences` - Get user preferences
- `PUT /preferences` - Update user preferences
- `POST /preferences/reset` - Reset preferences to default

## How It Works

1. **server.js** - Main entry point that sets up Express, middleware, and routes
2. **routes/index.js** - Central route organizer that imports all module routes
3. **modules/[feature]/[feature].routes.js** - Defines routes for each feature
4. **modules/[feature]/[feature].controllers.js** - Contains business logic for each endpoint
5. **modules/[feature]/[feature].repo.js** - Database operations (to be implemented)
6. **modules/[feature]/[feature].validators.js** - Request validation (to be implemented)

## Next Steps

1. **Implement Repository Layer**: Add database operations in `.repo.js` files
2. **Add Validation**: Implement Zod schemas in `.validators.js` files
3. **Add Authentication**: Implement auth middleware for protected routes
4. **Add More Modules**: Create modules for AI, co-plan, and analytics features
5. **Database Integration**: Connect the repo layer with your Drizzle ORM setup

## Testing

The server is running on port 5001 (or your configured PORT).

Test endpoints:

- Health: `curl http://localhost:5001/api/health`
- Create schedule: `curl -X POST http://localhost:5001/api/schedules -H "Content-Type: application/json" -d '{"title":"Test","periodStart":"2024-01-01","periodEnd":"2024-01-31","isActive":true}'`

All endpoints currently return placeholder responses - implement the actual logic in the controller and repository files.
