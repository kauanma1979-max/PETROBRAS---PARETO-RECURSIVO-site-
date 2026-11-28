import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const DRIVE_TOKEN_STORAGE_KEY = 'transpetro_google_drive_oauth_token_v1';
const TOKEN_TTL_MS = 55 * 60 * 1000;

interface StoredDriveToken {
  token: string;
  expiresAt: number;
}

export interface GoogleAuthState {
  user: User | null;
  hasToken: boolean;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

let currentUser: User | null = auth.currentUser;
let cachedToken: StoredDriveToken | null = loadStoredToken();
const listeners = new Set<(state: GoogleAuthState) => void>();

function loadStoredToken(): StoredDriveToken | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDriveToken;
    if (!parsed?.token || !parsed?.expiresAt || Date.now() >= parsed.expiresAt) {
      window.sessionStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistToken(token: string | null): void {
  if (!token) {
    cachedToken = null;
    try {
      window.sessionStorage?.removeItem(DRIVE_TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  cachedToken = {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  try {
    window.sessionStorage?.setItem(DRIVE_TOKEN_STORAGE_KEY, JSON.stringify(cachedToken));
  } catch {
    // ignore
  }
}

function getSnapshot(): GoogleAuthState {
  return {
    user: currentUser,
    hasToken: Boolean(getGoogleDriveAccessToken()),
  };
}

function notifyListeners(): void {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore listener errors
    }
  });
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    persistToken(null);
  }
  notifyListeners();
});

export function getGoogleDriveAccessToken(): string | null {
  if (!cachedToken) {
    cachedToken = loadStoredToken();
  }
  if (!cachedToken || Date.now() >= cachedToken.expiresAt) {
    if (cachedToken) {
      persistToken(null);
    }
    return null;
  }
  return cachedToken.token;
}

export function clearGoogleDriveToken(): void {
  persistToken(null);
  notifyListeners();
}

export function subscribeGoogleAuth(
  callback: (state: GoogleAuthState) => void
): () => void {
  listeners.add(callback);
  callback(getSnapshot());
  return () => {
    listeners.delete(callback);
  };
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive');
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || '';

  if (!accessToken) {
    throw new Error(
      'Permissão de acesso ao Google Drive não foi concedida. Tente conectar novamente.'
    );
  }

  currentUser = result.user;
  persistToken(accessToken);
  notifyListeners();

  return {
    user: result.user,
    accessToken,
  };
}

export async function logoutGoogleDrive(): Promise<void> {
  persistToken(null);
  try {
    await signOut(auth);
  } finally {
    currentUser = null;
    notifyListeners();
  }
}
