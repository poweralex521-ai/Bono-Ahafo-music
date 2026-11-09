const form = document.querySelector('#invite-form');
const message = document.querySelector('#invite-message');
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  form.querySelector('button').disabled = true;
  message.textContent = 'This invitation link is missing its token. Ask your coordinator for a new invitation.';
  message.classList.add('is-error');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = form.elements.password.value;
  if (password !== form.elements.confirmPassword.value) {
    message.textContent = 'The passwords do not match.';
    message.classList.add('is-error');
    return;
  }
  const button = form.querySelector('button');
  button.disabled = true;
  message.textContent = 'Verifying your invitation…';
  message.classList.remove('is-error', 'is-success');
  try {
    const response = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not accept this invitation.');
    form.reset();
    message.textContent = `${result.message} You can sign in once approved.`;
    message.classList.add('is-success');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});
