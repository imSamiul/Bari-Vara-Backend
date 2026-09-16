# Bari Vara — Bruno API collection

Open this folder in [Bruno](https://www.usebruno.com/) (**Open Collection** → select `bruno/`).

## Setup

1. Start Redis: `pnpm docker:up` (MongoDB is Atlas or a local `mongod`, not Docker)
2. Seed demo users/flats: `pnpm seed`
3. Start the API: `pnpm --filter bari-vara-api dev` (or `pnpm dev` from the repo root)
4. In Bruno, select the **Local** environment
5. Prefer **Auth → Login** before protected routes so `bv_access` / `bv_refresh` cookies are set

## Cookie auth

The API never accepts bearer tokens. Login and verify-otp set httpOnly cookies. Keep Bruno’s cookie jar enabled so subsequent requests stay authenticated.

## Variables

| Variable        | Purpose                                      |
| --------------- | -------------------------------------------- |
| `baseUrl`       | API host, no trailing slash                  |
| `apiPrefix`     | Usually `/api/v1`                            |
| `flatId`        | Copy from List Flats / Create Flat response  |
| `bookingId`     | Copy from Create Booking response            |
| `userId`        | Copy from admin List Users response          |
| `otp`           | 6-digit code from email or API logs (dev)    |

## Folders

| Folder   | Contents                                      |
| -------- | --------------------------------------------- |
| Health   | Liveness                                      |
| Auth     | Register, OTP, login, Google login, refresh, password reset |
| Users    | Profile, owner request, admin role tools      |
| Flats    | Search, CRUD, owner’s listings                |
| Bookings | Tenant visit requests + owner decisions       |
| Reviews  | List / upsert reviews on a flat               |
| Uploads  | Cloudinary image upload (owner/admin)         |
| Stats    | Admin analytics overview                      |
