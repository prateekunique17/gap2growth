import { supabase } from './supabase';

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Initiates GitHub OAuth flow via Supabase.
 * Redirects user to GitHub's authorization page.
 */
export async function loginWithGitHub(redirectTo = `${window.location.origin}/dashboard`) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo },
  });
  if (error) throw error;
  return data;
}

/**
 * Initiates Google OAuth flow via Supabase.
 * Redirects user to Google's authorization page.
 */
export async function loginWithGoogle(redirectTo = `${window.location.origin}/dashboard`) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  return data;
}

// ─── Email + Password ──────────────────────────────────────────────────────────

/**
 * Signs up a new user with email, password, and metadata.
 */
export async function signUpWithPassword(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

/**
 * Authenticates an existing user with email and password.
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─── Email OTP ────────────────────────────────────────────────────────────────

/**
 * Send a numeric OTP to the given email for signup or login.
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
 */
export async function setUserPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
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

