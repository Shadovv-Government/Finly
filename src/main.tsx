
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { seedDatabase } from './db/seed';
import { bootstrapApp } from './bootstrap';

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found in DOM");

bootstrapApp({
  root: createRoot(rootElement),
  App,
  seedDatabase,
}).catch((error) => {
  console.error('Failed to bootstrap app:', error);
});
  
