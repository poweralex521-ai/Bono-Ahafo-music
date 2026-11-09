const dashboardMain = document.querySelector('.dashboard-main');
const cardStatus = document.querySelector('#dashboard-error');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function photoUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : '';
  } catch {
    return '';
  }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Not set';
}

async function loadDashboard() {
  const response = await fetch('/api/member/dashboard');
  if (response.status === 401) {
    window.location.replace('/login.html');
    return;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load your dashboard.');

  const { member, statistics, capabilities, membershipCard, featuredTalent } = data;
  document.querySelector('#dashboard-member-name').textContent = member.fullName.split(/\s+/)[0];
  document.querySelector('#card-member-name').textContent = member.fullName;
  document.querySelector('#card-member-profession').textContent = member.profession || 'Bono Musicians Association member';
  document.querySelector('#card-membership-id').textContent = member.membershipId || 'Membership ID pending';
  document.querySelector('#card-member-status').textContent = member.status === 'active' ? 'Active' : member.status;
  document.querySelector('#card-validity').textContent = membershipCard.expiresAt
    ? formatDate(membershipCard.expiresAt)
    : 'No expiry set';

  const photo = photoUrl(member.profilePhotoUrl);
  if (photo) document.querySelector('#member-card-photo').innerHTML = `<img src="${escapeHtml(photo)}" alt="${escapeHtml(member.fullName)}">`;
  if (membershipCard.verificationQr) {
    document.querySelector('#member-qr').innerHTML = `<img src="${escapeHtml(membershipCard.verificationQr)}" alt="QR code to verify membership ${escapeHtml(member.membershipId)}">`;
  } else {
    document.querySelector('#member-qr').innerHTML = '<span>Membership ID required for verification QR.</span>';
  }

  document.querySelector('#stat-members').textContent = statistics.totalMembers.toLocaleString();
  document.querySelector('#stat-talent').textContent = statistics.availableTalent.toLocaleString();
  document.querySelector('#stat-events').textContent = capabilities.events ? statistics.events.toLocaleString() : '—';
  document.querySelector('#stat-bookings').textContent = statistics.bookings.toLocaleString();

  const featureRoot = document.querySelector('#featured-talent');
  if (!featuredTalent.length) {
    featureRoot.innerHTML = '<p class="ws-empty">Approved member profiles will appear here when available.</p>';
  } else {
    featureRoot.innerHTML = featuredTalent.map((talent) => {
      const src = photoUrl(talent.profilePhotoUrl);
      const image = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(talent.fullName)}" loading="lazy">` : '<span class="talent-placeholder">♫</span>';
      const specialties = [...(talent.instruments || []), ...(talent.genres || [])].slice(0, 2);
      const price = Number.isFinite(talent.bookingPrice) ? `GHS ${talent.bookingPrice}/event` : 'Contact for pricing';
      return `<article class="featured-card"><a class="featured-photo" href="/talent.html?id=${encodeURIComponent(talent._id)}">${image}<span class="verified-pill">✓ VERIFIED</span></a><div class="featured-card-info"><p class="featured-profession">${escapeHtml(talent.profession || 'Creative professional')}</p><h3>${escapeHtml(talent.fullName)}</h3><p class="featured-location">${escapeHtml(talent.location || 'Bono Region')}</p><div class="featured-tags">${specialties.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div><strong class="featured-price">${escapeHtml(price)}</strong><a class="featured-view" href="/talent.html?id=${encodeURIComponent(talent._id)}">View Profile</a></div></article>`;
    }).join('');
  }

  if (!capabilities.events) document.querySelector('#stat-events').title = 'Event listings are not connected to the platform yet.';
  document.querySelector('#latest-videos').setAttribute('aria-label', capabilities.videos ? 'Latest approved videos' : 'Video service not connected');
}

dashboardMain.addEventListener('click', (event) => {
  if (!event.target.closest('#download-card')) return;
  window.print();
});

dashboardMain.addEventListener('workspace:ready', (event) => {
  if (event.detail?.user?.role !== 'member') return;
  loadDashboard().catch((error) => {
    cardStatus.textContent = error.message;
    cardStatus.classList.add('is-error');
  });
});
