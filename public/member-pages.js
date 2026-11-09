function showMemberPageError(error) {
  const target = document.querySelector('#member-page-message');
  if (target) {
    target.textContent = error.message;
    target.classList.add('is-error');
  }
}

function safeProfilePhoto(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : '';
  } catch {
    return '';
  }
}

async function getDashboard() {
  const response = await fetch('/api/member/dashboard');
  if (response.status === 401) {
    window.location.replace('/login.html');
    return null;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load member information.');
  return data;
}

async function loadMemberPage() {
  const page = document.querySelector('#workspace-app')?.dataset.workspacePage;
  if (!page || !['membership', 'payments', 'reports', 'settings'].includes(page)) return;
  try {
    const data = await getDashboard();
    if (!data) return;
    if (page === 'membership') {
      const { member, membershipCard } = data;
      document.querySelector('#card-name').textContent = member.fullName;
      document.querySelector('#card-profession').textContent = member.profession || 'Bono Musicians Association member';
      document.querySelector('#card-id').textContent = member.membershipId || 'Membership ID pending';
      document.querySelector('#card-status').textContent = member.status === 'active' ? 'Active' : member.status;
      document.querySelector('#member-since').textContent = member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Not recorded';
      document.querySelector('#card-expiry').textContent = membershipCard.expiresAt ? new Date(membershipCard.expiresAt).toLocaleDateString() : 'No expiry set';
      if (membershipCard.verificationQr) document.querySelector('#card-qr').innerHTML = `<img src="${membershipCard.verificationQr}" alt="Membership verification QR code">`;
      const photoUrl = safeProfilePhoto(member.profilePhotoUrl);
      if (photoUrl) {
        const photo = document.querySelector('#card-photo');
        photo.replaceChildren();
        const image = document.createElement('img');
        image.src = photoUrl;
        image.alt = member.fullName;
        photo.append(image);
      }
      const status = member.membershipId && member.status === 'active'
        ? 'Your membership ID is available for public verification.'
        : 'An active membership ID is required for public verification.';
      document.querySelector('#membership-verification-status').textContent = status;
      document.querySelector('#print-membership').addEventListener('click', () => window.print());
    }
    if (page === 'reports') {
      document.querySelector('#report-bookings').textContent = data.statistics.bookings.toLocaleString();
      document.querySelector('#report-members').textContent = data.statistics.totalMembers.toLocaleString();
      document.querySelector('#report-talent').textContent = data.statistics.availableTalent.toLocaleString();
    }
    if (page === 'settings') {
      const fields = {
        'setting-name': data.member.fullName,
        'setting-email': data.member.email,
        'setting-role': 'Member',
        'setting-status': data.member.status,
        'setting-group': data.member.group || 'Not assigned',
        'setting-id': data.member.membershipId || 'Pending',
      };
      for (const [id, value] of Object.entries(fields)) document.getElementById(id).textContent = value;
      document.querySelector('#settings-logout').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.replace('/login.html');
      });
    }
  } catch (error) {
    showMemberPageError(error);
  }
}

loadMemberPage();
