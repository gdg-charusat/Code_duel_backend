## Team Number : Team 153

## Description
Implements Role-Based Access Control (RBAC) for the backend. A `Role` enum (`USER`, `ADMIN`) is added to the Prisma schema and `User` model. New middleware (`requireRole`, `requireAdmin`) enforces role checks on protected routes. A dedicated `/api/admin` route group exposes admin-only operations (user management, challenge management, platform stats). All existing users default to the `USER` role — fully backward compatible.

## Related Issue
Closes #81

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Style/UI improvement

## Changes Made
- **`prisma/schema.prisma`** — Added `Role` enum (`USER`, `ADMIN`) and `role Role @default(USER)` field to the `User` model
- **`prisma/migrations/20260228000000_add_role_rbac/migration.sql`** — Migration SQL: creates `Role` enum and adds `role` column with `DEFAULT 'USER'`
- **`src/middlewares/auth.middleware.js`** — Added `requireRole(...roles)` middleware factory and `requireAdmin` shorthand; `authenticate` now selects and attaches `role` to `req.user`
- **`src/controllers/admin.controller.js`** *(new)* — Admin-only handlers: `getAllUsers`, `updateUserRole`, `deleteUser`, `getAllChallenges`, `deleteChallenge`, `getPlatformStats`
- **`src/routes/admin.routes.js`** *(new)* — All routes under `/api/admin` protected by `authenticate + requireAdmin`
- **`src/app.js`** — Registered admin routes at `/api/admin`
- **`src/services/auth.service.js`** — `register`, `login`, `getProfile` responses now include `role`
- **`prisma/seed.js`** — Added a dedicated `ADMIN` user (`admin` / `Admin@1234`) created at seed time

## Screenshots (if applicable)
N/A — backend API changes only.

## API Endpoints Added

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/admin/stats` | Admin only |
| GET | `/api/admin/users` | Admin only |
| PATCH | `/api/admin/users/:id/role` | Admin only |
| DELETE | `/api/admin/users/:id` | Admin only |
| GET | `/api/admin/challenges` | Admin only |
| DELETE | `/api/admin/challenges/:id` | Admin only |

## Error Responses
- `401 Unauthorized` — no token or invalid token
- `403 Forbidden` — authenticated but insufficient role (`"Access denied: insufficient permissions"`)

## Testing
- [ ] Tested on Desktop (Chrome/Firefox/Safari)
- [ ] Tested on Mobile (iOS/Android)
- [ ] Tested responsive design (different screen sizes)
- [x] No console errors or warnings
- [x] Code builds successfully (`npm run build`)

**Manual test scenarios:**
- Regular `USER` token hitting `/api/admin/*` → receives `403`
- `ADMIN` token hitting `/api/admin/*` → receives correct data
- Unauthenticated request → receives `401`
- Existing users without `role` field → default to `USER` (backward compatible)

## Checklist
- [x] My code follows the project's code style guidelines
- [x] I have performed a self-review of my code
- [x] I have commented my code where necessary
- [x] My changes generate no new warnings
- [x] I have tested my changes thoroughly
- [ ] All TypeScript types are properly defined
- [ ] Tailwind CSS classes are used appropriately (no inline styles)
- [ ] Component is responsive across different screen sizes
- [x] I have read and followed the [CONTRIBUTING.md](CONTRIBUTING.md) guidelines

## Additional Notes
- Roles are defined as a Prisma `enum` (not hard-coded strings) for scalability
- `requireRole` is a generic factory — new roles can be added to the enum and used instantly without changing the middleware
- Admin seed credentials: `admin` / `Admin@1234` — **change before production**
- Migration must be applied with `npx prisma migrate deploy` after configuring `DATABASE_URL` in `.env`
