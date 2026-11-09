async function openRoleWorkspace() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    if (!response.ok) throw new Error('Unable to load your account.');
    const { user } = await response.json();
    const workspace = {
      super_admin: '/admin.html',
      coordinator: '/coordinator.html',
      member: '/member.html',
    }[user.role];
    if (!workspace) throw new Error('This account does not have a supported workspace.');
    window.location.replace(workspace);
  } catch (error) {
    document.querySelector('#portal-welcome').textContent = error.message;
  }
}

document.querySelector('#logout-button').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.replace('/login.html');
  }
});

openRoleWorkspace();
