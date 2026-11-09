const profileRoot = document.querySelector('#talent-profile');
const profileMessage = document.querySelector('#talent-message');
const profileBookingForm = document.querySelector('#booking-form');
const profileBookingMessage = document.querySelector('#booking-message');
const talentId = new URLSearchParams(window.location.search).get('id');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function safePortfolioUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

async function loadProfile() {
  if (!talentId) {
    profileMessage.textContent = 'No talent profile was selected.';
    profileBookingForm.remove();
    return;
  }
  try {
    const response = await fetch(`/api/talents/${encodeURIComponent(talentId)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load this profile.');
    const { talent } = result;
    document.title = `${talent.fullName} | BOMA Talent`;
    profileBookingForm.elements.talentId.value = talent._id;
    profileMessage.textContent = '✓ BOMA VERIFIED PROFESSIONAL';
    const specialties = [...(talent.instruments || []), ...(talent.genres || [])];
    const portfolio = safePortfolioUrl(talent.portfolioUrl);
    profileRoot.innerHTML = `
      ${talent.profilePhotoUrl ? `<img class="profile-photo" src="${escapeHtml(talent.profilePhotoUrl)}" alt="">` : '<div class="profile-photo profile-photo-empty">♫</div>'}
      <div class="profile-details"><div class="section-kicker">${escapeHtml(talent.profession || 'Creative professional')}</div>
      <h1>${escapeHtml(talent.fullName)}</h1><p class="talent-location">${escapeHtml(talent.location || 'Bono Region')}</p>
      <p>${escapeHtml(talent.biography || '')}</p>
      <p class="profile-facts">${talent.yearsExperience !== undefined ? `${escapeHtml(talent.yearsExperience)} years of experience · ` : ''}${escapeHtml(talent.availability || '')}</p>
      <div class="talent-tags">${specialties.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
      ${talent.bookingPrice !== undefined ? `<p class="talent-price">FROM GHS ${escapeHtml(talent.bookingPrice)}</p>` : ''}
      ${portfolio ? `<a class="text-link" href="${escapeHtml(portfolio)}" target="_blank" rel="noopener noreferrer">View portfolio <span>↗</span></a>` : ''}
      ${talent.membershipId ? `<p class="member-ident">BOMA member · ${escapeHtml(talent.membershipId)}</p>` : ''}
      </div>`;
  } catch (error) {
    profileMessage.textContent = error.message;
    profileBookingForm.remove();
  }
}

profileBookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = profileBookingForm.querySelector('button');
  button.disabled = true;
  profileBookingMessage.textContent = 'Sending your request…';
  profileBookingMessage.className = 'form-message';
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(profileBookingForm))),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not submit the request.');
    profileBookingForm.reset();
    profileBookingMessage.textContent = result.message;
    profileBookingMessage.classList.add('is-success');
  } catch (error) {
    profileBookingMessage.textContent = error.message;
    profileBookingMessage.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

loadProfile();
