
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { seedDatabase, migrateDatabase } from './db/seed';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize database and run migrations on load
migrateDatabase();
seedDatabase();
  