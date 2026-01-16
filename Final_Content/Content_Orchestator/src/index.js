
// src/index.jsx (or src/main.jsx)
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';            // <-- import your App component
import 'bootstrap/dist/css/bootstrap.min.css'; // optional if you use Bootstrap
import './App.css';                 // optional if you want global CSS here

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
