# RESCUENet

A privacy-preserving, browser-first emergency communication and disaster-management platform designed to operate when conventional cellular/internet infrastructure is unavailable or unreliable.

## Architecture

Please see [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Running Locally

1. Create a `.env` file based on `.env.example`.
2. Run `npm install` at the root.
3. Build the shared packages: `npm run build -w packages/shared`.
4. Run all applications in development mode: `npm run dev`.

The frontend will start on port 5173, the backend on port 3000, and the gateway on port 3001 (configurable via `.env`).
