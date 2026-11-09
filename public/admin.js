const welcome = document.querySelector('#admin-welcome');
const inviteForm = document.querySelector('#invite-form');
const inviteResult = document.querySelector('#invite-result');
const membersTable = document.querySelector('#members-table');
const coordinatorsTable = document.querySelector('#coordinators-table');
const bookingsTable = document.querySelector('#bookings-table');

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
  const { members } = await api('/api/members');
  membersTable.innerHTML = members.map((member) => `<tr>
    <td>${escapeHtml(member.fullName)}<small>${escapeHtml(member.email)}</small></td>
    <td>${escapeHtml(member.membershipId || '—')}</td><td>${escapeHtml(member.group)}</td>
    <td>${escapeHtml(member.status)}</td><td>${escapeHtml(member.profileApprovalStatus)}</td>
    <td class="table-actions">
      ${member.status === 'pending' || member.status === 'suspended' ? `<button data-action="activate" data-id="${escapeHtml(member._id)}">Activate</button>` : ''}
      ${member.status === 'active' ? `<button data-action="suspend" data-id="${escapeHtml(member._id)}">Suspend</button>` : ''}
      ${member.profileApprovalStatus === 'pending' && member.status === 'active' ? `<button data-action="approve" data-id="${escapeHtml(member._id)}">Approve profile</button>` : ''}
    </td></tr>`).join('') || '<tr><td colspan="6">No members have been invited yet.</td></tr>';
}

async function loadCoordinators() {
  const { coordinators } = await api('/api/admin/coordinators');
  coordinatorsTable.innerHTML = coordinators.map((account) => `<tr>
    <td>${escapeHtml(account.fullName)}</td><td>${escapeHtml(account.email)}</td>
    <td>${escapeHtml(account.coordinatorGroup || '—')}</td><td>${escapeHtml(account.status)}</td>
    <td class="table-actions">${account.status === 'pending' || account.status === 'suspended'
      ? `<button data-action="activate" data-id="${escapeHtml(account._id)}">Activate</button>`
      : account.status === 'active' ? `<button data-action="suspend" data-id="${escapeHtml(account._id)}">Suspend</button>` : 'Invitation pending'}</td>
    </tr>`).join('') || '<tr><td colspan="5">No coordinators have been invited yet.</td></tr>';
}

async function loadBookings() {
  const { bookings } = await api('/api/admin/bookings');
  bookingsTable.innerHTML = bookings.map((booking) => `<tr>
    <td>${escapeHtml(booking.talent?.fullName || 'Former member')}<small>${escapeHtml(booking.talent?.membershipId || '')}</small></td>
    <td>${escapeHtml(booking.eventName)}</td>
    <td>${escapeHtml(booking.organizerName)}<small>${escapeHtml(booking.organizerEmail)}</small></td>
    <td>${new Date(booking.eventDate).toLocaleDateString()}<small>${escapeHtml(booking.location)}</small></td>
    <td>${escapeHtml(booking.status)}</td></tr>`).join('') || '<tr><td colspan="5">No booking requests have been submitted.</td></tr>';
}

async function refreshTables() {
  const message = document.querySelector('#members-message');
  message.textContent = 'Loading accounts…';
  try {
    await Promise.all([loadMembers(), loadCoordinators(), loadBookings()]);
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('is-error');
  }
}

async function initialize() {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'super_admin') {
      window.location.replace(user.role === 'coordinator' ? '/coordinator.html' : '/member.html');
      return;
    }
    welcome.textContent = `Signed in as ${user.fullName}. Membership accounts require invitation and approval.`;
    await Promise.all([
      api('/api/admin/summary').then(({ members, activeMembers, pendingMembers, coordinators, pendingBookings }) => {
        document.querySelector('#admin-total-members').textContent = members.toLocaleString();
        document.querySelector('#admin-active-members').textContent = activeMembers.toLocaleString();
        document.querySelector('#admin-pending-members').textContent = pendingMembers.toLocaleString();
        document.querySelector('#admin-coordinators-count').textContent = coordinators.toLocaleString();
        document.querySelector('#admin-bookings-count').textContent = pendingBookings.toLocaleString();
      }),
      refreshTables(),
    ]);
  } catch (error) {
    welcome.textContent = error.message;
  }
}

inviteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  inviteResult.className = 'form-message';
  inviteResult.textContent = 'Creating invitation…';
  const button = inviteForm.querySelector('button');
  button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(inviteForm));
    const result = await api('/api/invitations', { method: 'POST', body: JSON.stringify(values) });
    inviteResult.innerHTML = `${escapeHtml(result.message)} <a class="invitation-link" href="${escapeHtml(result.invitationUrl)}">${escapeHtml(window.location.origin + result.invitationUrl)}</a> <button type="button" id="copy-invitation">Copy link</button>`;
    document.querySelector('#copy-invitation').addEventListener('click', async () => {
      await navigator.clipboard.writeText(window.location.origin + result.invitationUrl);
      inviteResult.classList.add('is-success');
    });
    inviteForm.reset();
    await refreshTables();
  } catch (error) {
    inviteResult.textContent = error.message;
    inviteResult.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('.admin-main').addEventListener('click', async (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  action.disabled = true;
  try {
    const { id } = action.dataset;
    if (action.dataset.action === 'approve') {
      await api(`/api/admin/members/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ approveProfile: true }),
      });
    } else {
      const status = action.dataset.action === 'activate' ? 'active' : 'suspended';
      const accountType = action.closest('#coordinators-table') ? 'accounts' : 'members';
      const url = accountType === 'accounts'
        ? `/api/admin/accounts/${encodeURIComponent(id)}/status`
        : `/api/admin/members/${encodeURIComponent(id)}`;
      await api(url, { method: 'PATCH', body: JSON.stringify({ status }) });
    }
    await refreshTables();
  } catch (error) {
    document.querySelector('#members-message').textContent = error.message;
  } finally {
    action.disabled = false;
  }
});

document.querySelector('#refresh-members').addEventListener('click', refreshTables);
document.querySelector('#refresh-coordinators').addEventListener('click', refreshTables);
document.querySelector('#refresh-bookings').addEventListener('click', refreshTables);
initialize();
