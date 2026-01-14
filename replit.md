# SkyPath UAV Service - Frontend

## Overview
This is a React/TypeScript frontend application built with Vite and Material-UI. It appears to be a dashboard for managing UAV (drone) flight schemes and quadcopter data.

## Project Structure
- `front-koks/` - Main frontend application
  - `src/` - React source code
  - `public/` - Static assets
  - `vite.config.ts` - Vite configuration
  - `package.json` - Dependencies and scripts

## Tech Stack
- React (latest)
- TypeScript
- Vite (build tool)
- Material-UI (MUI) components
- React Router
- Day.js (date handling)
- xlsx (spreadsheet handling)

## Running the Application
The frontend runs on port 5000 using:
```bash
cd front-koks && npm run dev
```

## Notes
- The original docker-compose.yml references a backend service (`back-koks`) and PostgreSQL database that are not included in this repository
- The frontend shows "Failed to fetch" errors when trying to connect to the missing backend API
- The app is in Russian language

## Recent Changes
- 2026-01-14: Initial Replit setup
  - Configured Vite to run on port 5000 with `0.0.0.0` host
  - Enabled all hosts for Replit proxy compatibility
