// Gestione account multipli salvati (stile Instagram)
const KEY = 'sp-saved-accounts';

export function getSavedAccounts() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function upsertSavedAccount({ userId, email, refreshToken, studioId, studioName }) {
  if (!userId || !email) return;
  const accounts = getSavedAccounts().filter(a => a.userId !== userId);
  accounts.unshift({ userId, email, refreshToken, studioId: studioId || null, studioName: studioName || null, savedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(accounts.slice(0, 5)));
}

export function updateSavedAccountStudio(userId, studioId, studioName) {
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === userId);
  if (idx >= 0) {
    accounts[idx].studioId  = studioId;
    accounts[idx].studioName = studioName;
    localStorage.setItem(KEY, JSON.stringify(accounts));
  }
}

export function updateSavedAccountRefreshToken(userId, refreshToken) {
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === userId);
  if (idx >= 0) {
    accounts[idx].refreshToken = refreshToken;
    accounts[idx].savedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(accounts));
  }
}
