const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');

async function checkSession() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) window.location.assign('/portal.html');
  } catch {
    message.textContent = 'Unable to reach the sign-in service. Try again shortly.';
    message.classList.add('is-error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  message.textContent = 'Signing in…';
  message.classList.remove('is-error', 'is-success');
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Sign in failed.');
    window.location.assign('/portal.html');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

checkSession();
