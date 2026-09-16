const panel = document.getElementById('install-panel');
const button = document.getElementById('install-button');
const status = document.getElementById('install-status');
const standalone = window.matchMedia('(display-mode: standalone)');
let installPrompt;

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
