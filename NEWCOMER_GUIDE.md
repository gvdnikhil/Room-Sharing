# Room-Sharing Newcomer Guide

## What this project is
Room-Sharing is a full-stack roommate coordination app for shared supplies and chores:
- Users register/login
- Users create or join a room via invite code
- Room members add items (e.g., groceries, supplies)
- Members log consumption against an item (optionally on behalf of another member)
- Members log chores
- The app shows activity and usage summaries

## High-level architecture
- **Backend**: FastAPI + SQLAlchemy async + PostgreSQL + Alembic migrations.
- **Frontend**: React + TypeScript + Vite + Zustand + TanStack Query.

## Backend map
- `backend/app/main.py`: app startup, CORS, router registration, health endpoint.
- `backend/app/core/`: environment config and JWT/password utilities.
- `backend/app/db/`: async engine/session and model registration for metadata.
- `backend/app/models/`: SQLAlchemy entities (users, rooms, membership, items, consumptions, chores).
- `backend/app/schemas/schemas.py`: request/response validation models.
- `backend/app/api/deps.py`: auth dependency + room membership guard.
- `backend/app/api/v1/*.py`: route handlers by domain.

### Domain model in one sentence
A `User` belongs to `Room`s through `RoomMember`; each `Room` has `Item`s and `Chore`s; each `Item` has `Consumption` records.

## Frontend map
- `frontend/src/App.tsx`: routing shell + protected pages + global chore modal wiring.
- `frontend/src/pages/`: page-level feature screens.
- `frontend/src/components/`: reusable UI widgets/modals.
- `frontend/src/services/api.ts`: axios client with auth + 401 handling.
- `frontend/src/store/`: persisted Zustand stores for auth and room state.
- `frontend/src/types/index.ts`: shared TypeScript DTOs.

## Important implementation details
1. **Auth flow**
   - Backend issues JWT in register/login.
   - Frontend stores token in localStorage + Zustand.
   - Axios interceptor attaches `Authorization: Bearer <token>` automatically.

2. **Authorization checks**
   - Many room-level APIs depend on `require_room_member` to prevent cross-room access.

3. **Inventory correctness**
   - Consumption endpoint uses `SELECT ... FOR UPDATE` to lock an item row before decrementing stock.

4. **Migrations vs startup table creation**
   - App startup calls `Base.metadata.create_all()` for convenience.
   - README also expects Alembic migrations for production-grade schema management.

5. **WebSocket status**
   - Frontend includes a `useWebSocket` hook and docs mention websocket endpoints.
   - Current backend code in this repository does not implement websocket routes.

## Suggested learning path for a newcomer
1. Read backend route files in this order:
   1) `auth.py` 2) `rooms.py` 3) `items.py` 4) `activity.py` 5) `chores.py`
2. Trace one complete user story end-to-end:
   - login -> create room -> add item -> consume item -> view activity/summary.
3. Study `schemas.py` and `frontend/src/types/index.ts` side-by-side to understand contracts.
4. Learn the frontend data flow:
   - React Query fetch/mutation + cache invalidation
   - Zustand persistent auth/room stores
5. Then choose a starter improvement:
   - add tests for permission checks,
   - implement websocket backend support (or remove hook/docs),
   - tighten CORS/env defaults for deployment safety.

## Practical first tasks
- Add backend unit/integration tests around `require_room_member` and `consume_item` edge cases.
- Add API error-state UI polish on dashboard/activity pages.
- Reconcile README websocket claims with current backend capabilities.
