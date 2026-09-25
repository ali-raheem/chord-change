import { BUILD } from './version.js';

const panel = document.getElementById('install-panel');
const button = document.getElementById('install-button');
const status = document.getElementById('install-status');
const standalone = window.matchMedia('(display-mode: standalone)');
let installPrompt;

const buildInfo = document.getElementById('build-info');
const buildLabel = BUILD.builtAt ? `Version ${BUILD.commit} · ${BUILD.builtAt.slice(0, 16).replace('T', ' ')} UTC` : 'Development build';
let storageLabel = '';
function renderBuildInfo() { buildInfo.textContent = storageLabel ? `${buildLabel} · ${storageLabel}` : buildLabel; }
renderBuildInfo();

// Ask the browser not to evict the offline cache under storage pressure.
// Chrome decides silently (installed apps are normally granted); Firefox may ask the user.
async function keepOfflineData() {
  if (!navigator.storage?.persist) return;
  try {
    const kept = await navigator.storage.persisted() || await navigator.storage.persist();
    storageLabel = kept ? 'Offline data kept' : 'Offline data may be cleared';
  } catch { storageLabel = ''; }
  renderBuildInfo();
}
keepOfflineData();

function clearPrompt() {
  installPrompt = undefined;
  panel.hidden = true;
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  if (standalone.matches) return;
  installPrompt = event;
  button.disabled = false;
  status.hidden = true;
  panel.hidden = false;
});

button.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  // Each browser event can only be used once, including after dismissal.
  installPrompt = undefined;
  button.disabled = true;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch {
    status.textContent = 'Installation could not start. Try Install from Chrome’s menu.';
    status.hidden = false;
  } finally {
    // Do not discard a fresh event if Chrome supplied one while prompting.
    if (!installPrompt) panel.hidden = true;
    button.disabled = false;
  }
});

window.addEventListener('appinstalled', () => {
  clearPrompt();
  keepOfflineData();
  status.textContent = 'Chord Change is installed. Find it in your app launcher.';
  status.hidden = false;
});
standalone.addEventListener('change', () => {
  if (standalone.matches) clearPrompt();
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  // No forced activation/reload: an update must not interrupt practice.
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { updateViaCache: 'none' }).catch(error => {
    console.warn('Offline practice could not be enabled:', error);
  });
}
