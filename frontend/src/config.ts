/**
 * Central configuration for the BrainDesk AI frontend.
 * Uses Vite environment variables with safe fallbacks.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
