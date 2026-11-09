const welcome = document.querySelector('#group-welcome');
const form = document.querySelector('#invite-form');
const inviteResult = document.querySelector('#invite-result');
const table = document.querySelector('#members-table');
let assignedGroup = '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = response.status === 204 ? {} : await response.json();
  if (response.status === 401) {
    window.location.replace('/login.html');
    throw new Error('Sign-in is required.');
  }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

async function loadMembers() {
  try {
    const { members, totalCount, statusCounts } = await api('/api/members');
    document.querySelector('#group-total-members').textContent = totalCount.toLocaleString();
    document.querySelector('#group-active-members').textContent = (statusCounts.active || 0).toLocaleString();
    document.querySelector('#group-pending-members').textContent = ((statusCounts.invited || 0) + (statusCounts.pending || 0)).toLocaleString();
    table.innerHTML = members.map((member) => `<tr><td>${escapeHtml(member.fullName)}<small>${escapeHtml(member.email)}</small></td>
      <td>${escapeHtml(member.membershipId || '—')}</td><td>${escapeHtml(member.status)}</td>
      <td>${escapeHtml(member.profileApprovalStatus)}</td><td>${new Date(member.createdAt).toLocaleDateString()}</td></tr>`)
      .join('') || '<tr><td colspan="5">No members are assigned to your group yet.</td></tr>';
    document.querySelector('#members-message').textContent = '';
  } catch (error) {
    document.querySelector('#members-message').textContent = error.message;
  }
}

async function initialize() {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'coordinator') {
      window.location.replace(user.role === 'super_admin' ? '/admin.html' : '/member.html');
      return;
    }
    if (!user.coordinatorGroup) throw new Error('Your account has no assigned group. Contact a super administrator.');
    assignedGroup = user.coordinatorGroup;
    document.querySelector('#member-group').value = assignedGroup;
    document.querySelector('#group-name').textContent = assignedGroup;
    welcome.textContent = `Signed in as ${user.fullName} · Assigned group: ${assignedGroup}`;
    await loadMembers();
  } catch (error) {
    welcome.textContent = error.message;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  inviteResult.className = 'form-message';
  inviteResult.textContent = 'Creating invitation…';
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const result = await api('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const link = window.location.origin + result.invitationUrl;
    inviteResult.innerHTML = `${escapeHtml(result.message)} <a class="invitation-link" href="${escapeHtml(result.invitationUrl)}">${escapeHtml(link)}</a> <button type="button" id="copy-invitation">Copy link</button>`;
    document.querySelector('#copy-invitation').addEventListener('click', async () => {
      await navigator.clipboard.writeText(link);
      inviteResult.classList.add('is-success');
    });
    form.reset();
    document.querySelector('#member-group').value = assignedGroup;
    await loadMembers();
  } catch (error) {
    inviteResult.textContent = error.message;
    inviteResult.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refresh-members').addEventListener('click', loadMembers);
initialize();
