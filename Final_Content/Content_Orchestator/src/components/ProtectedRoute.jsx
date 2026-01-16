
// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * Wrap any element to enforce authentication.
 * - If authenticated, renders children.
 * - If not, redirects to /auth and preserves the intended path in state.
 */
export default function ProtectedRoute({ children }) {
  // TODO: Replace with your real auth logic (context, cookie, MSAL, etc.)
  const isAuthenticated = Boolean(localStorage.getItem('token'));
   const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to /auth and keep where user wanted to go
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
}