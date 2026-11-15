import { createAction } from '@reduxjs/toolkit';

// Dispatched automatically on any 401 response
export const sessionExpired = createAction('auth/sessionExpired');
