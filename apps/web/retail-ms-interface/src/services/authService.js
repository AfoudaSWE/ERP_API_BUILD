const PERSISTENT_SESSION_KEY = 'retail-twin-auth-session';
const TAB_SESSION_KEY = 'retail-twin-auth-tab-session';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password. Please try again.';

const MOCK_ADMIN = Object.freeze({
  id: 'usr_retail_admin',
  email: 'admin@retail.com',
  password: 'Admin@123',
  displayName: 'Retail Administrator',
  role: 'ADMIN',
  permissions: [
    'retail.dashboard.view',
    'retail.stores.manage',
    'retail.sales.view',
    'retail.inventory.manage',
    'retail.operations.manage',
    'retail.workflows.manage',
    'automation:read',
    'automation:execute',
    'automation:manage',
  ],
});

/**
 * @typedef {Object} AuthenticatedUser
 * @property {string} id
 * @property {string} email
 * @property {string} displayName
 * @property {'ADMIN'} role
 * @property {string[]} permissions
 */

const safeUser = () => ({
  id: MOCK_ADMIN.id,
  email: MOCK_ADMIN.email,
  displayName: MOCK_ADMIN.displayName,
  role: MOCK_ADMIN.role,
  permissions: [...MOCK_ADMIN.permissions],
});

const parseSession = (value) => {
  try {
    const session = JSON.parse(value || 'null');
    if (!session?.user?.id || session.user.role !== 'ADMIN') return null;
    if (session.user.id === MOCK_ADMIN.id) {
      return { ...session, user: safeUser() };
    }
    return session;
  } catch {
    return null;
  }
};

export const DEMO_ADMIN = Object.freeze({
  email: MOCK_ADMIN.email,
  password: MOCK_ADMIN.password,
  role: MOCK_ADMIN.role,
  displayName: MOCK_ADMIN.displayName,
});

export async function authenticate(credentials) {
  await new Promise(resolve => setTimeout(resolve, 550));
  const email = credentials.email.trim().toLowerCase();
  if (email !== MOCK_ADMIN.email || credentials.password !== MOCK_ADMIN.password) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }
  return { user: safeUser(), authenticatedAt: new Date().toISOString() };
}

export function saveSession(session, remember) {
  if (typeof window === 'undefined') return;
  clearSession();
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(remember ? PERSISTENT_SESSION_KEY : TAB_SESSION_KEY, JSON.stringify(session));
}

export function readSession() {
  if (typeof window === 'undefined') return null;
  return parseSession(window.sessionStorage.getItem(TAB_SESSION_KEY))
    || parseSession(window.localStorage.getItem(PERSISTENT_SESSION_KEY));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TAB_SESSION_KEY);
  window.localStorage.removeItem(PERSISTENT_SESSION_KEY);
}

export { INVALID_CREDENTIALS_MESSAGE };
