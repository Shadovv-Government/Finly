
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { seedDatabase } from './db/seed';

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found in DOM");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize database on load
seedDatabase();
  