import { supabase } from './supabase';

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Initiates GitHub OAuth flow via Supabase.
 * Redirects user to GitHub's authorization page.
 */
export async function loginWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
  return data;
}

/**
 * Initiates Google OAuth flow via Supabase.
 * Redirects user to Google's authorization page.
 */
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
  return data;
}

// ─── Email OTP ────────────────────────────────────────────────────────────────

/**
 * Send a numeric OTP to the given email for signup or login.
 * @param {string} email
 * @param {boolean} [shouldCreateUser=true]
 */
export async function sendEmailOtp(email, shouldCreateUser = true) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser },
  });
  if (error) throw error;
}

/**
 * Verify the numeric OTP code.
 * @param {string} email
 * @param {string} token
 */
export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data;
}

/**
 * Update the current (just-verified) user's password.
 * @param {string} newPassword
 */
export async function setUserPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// ─── Email + Password login ────────────────────────────────────────────────────

/**
 * Authenticate with email and password.
 * @param {string} email
 * @param {string} password
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Signs out from Supabase.
 */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Retrieves the current session if one exists.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

