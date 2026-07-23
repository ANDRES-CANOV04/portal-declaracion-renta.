/**
 * Authentication Module
 */
import { getStore, saveStore } from './store.js';

const SESSION_KEY = 'tax_portal_session_active_user';

export function getCurrentUser() {
  const sessionStr = sessionStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

export function login(email, password) {
  const store = getStore();
  const foundUser = store.users.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );

  if (!foundUser) {
    return { success: false, message: 'Correo o contraseña incorrectos.' };
  }

  if (foundUser.status === 'suspended') {
    return { success: false, message: '⛔ Tu cuenta se encuentra suspendida o inactiva. Por favor contacta al contador administrador.' };
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(foundUser));
  return { success: true, user: foundUser };
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function switchDemoUser(userId) {
  const store = getStore();
  const targetUser = store.users.find(u => u.id === userId);
  if (targetUser) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(targetUser));
    return targetUser;
  }
  return null;
}
