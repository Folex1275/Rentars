/**
 * Auth service — wraps Supabase Auth operations.
 *
 * Controllers should call these functions instead of touching Supabase directly.
 */

import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import type { ServiceResponse } from './index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | undefined;
  created_at: string | undefined;
}

export interface RegisterResult {
  user: AuthUser;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Register a new user via Supabase Auth.
 *
 * @param email - User's email address.
 * @param password - Plain-text password (Supabase hashes it).
 * @returns ServiceResponse with the created user on success.
 */
export async function registerUser(
  email: string,
  password: string,
): Promise<ServiceResponse<RegisterResult>> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: 'Registration failed: no user returned' };
  }

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    created_at: data.user.created_at,
  };

  return { success: true, data: { user } };
}

/**
 * Authenticate an existing user and issue a JWT.
 *
 * @param email - User's email address.
 * @param password - Plain-text password.
 * @returns ServiceResponse with a signed JWT and user info on success.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<ServiceResponse<LoginResult>> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: 'Login failed: no user returned' };
  }

  const token = jwt.sign(
    { userId: data.user.id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' },
  );

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    created_at: data.user.created_at,
  };

  return { success: true, data: { token, user } };
}
