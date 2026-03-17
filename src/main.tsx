// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { seedDatabase } from './db/seed'
import App from './App'


// Инициализируем БД перед рендером
seedDatabase().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})