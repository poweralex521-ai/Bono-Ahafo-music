const welcome = document.querySelector('#member-welcome');
const form = document.querySelector('#profile-form');
const message = document.querySelector('#profile-message');
const ident = document.querySelector('#member-ident');
const profilePhoto = document.querySelector('#profile-photo');

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json();
  if (response.status === 401) {
    window.location.replace('/login.html');
    throw new Error('Sign-in is required.');
  }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function list(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function initialize() {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'member') {
      window.location.replace(user.role === 'super_admin' ? '/admin.html' : '/coordinator.html');
      return;
    }
    const { profile } = await api('/api/member/profile');
    welcome.textContent = `Signed in as ${profile.fullName} · Group: ${profile.group || 'Pending assignment'}`;
    const summaryName = document.querySelector('#profile-summary-name');
    if (summaryName) summaryName.textContent = profile.fullName;
    ident.textContent = `Membership ID: ${profile.membershipId || 'Pending'} · Account: ${profile.status} · Profile review: ${profile.profileApprovalStatus}`;
    if (profilePhoto && profile.profilePhotoUrl) {
      try {
        const url = new URL(profile.profilePhotoUrl, window.location.origin);
        if (url.protocol === 'https:' || url.origin === window.location.origin) {
          profilePhoto.src = url.href;
          profilePhoto.hidden = false;
          const placeholder = document.querySelector('#profile-photo-placeholder');
          if (placeholder) placeholder.hidden = true;
        }
      } catch {
        profilePhoto.hidden = true;
      }
    }
    form.elements.profession.value = profile.profession || '';
    form.elements.location.value = profile.location || '';
    form.elements.phone.value = profile.phone || '';
    form.elements.yearsExperience.value = profile.yearsExperience ?? '';
    form.elements.instruments.value = (profile.instruments || []).join(', ');
    form.elements.genres.value = (profile.genres || []).join(', ');
    form.elements.bookingPrice.value = profile.bookingPrice ?? '';
    form.elements.availability.value = profile.availability || '';
    form.elements.portfolioUrl.value = profile.portfolioUrl || '';
    form.elements.biography.value = profile.biography || '';
  } catch (error) {
    welcome.textContent = error.message;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  message.textContent = 'Saving your profile…';
  message.className = 'form-message';
  const bookingPrice = form.elements.bookingPrice.value;
  const body = {
    profession: form.elements.profession.value,
    location: form.elements.location.value,
    phone: form.elements.phone.value,
    yearsExperience: form.elements.yearsExperience.value === '' ? undefined : Number(form.elements.yearsExperience.value),
    instruments: list(form.elements.instruments.value),
    genres: list(form.elements.genres.value),
    biography: form.elements.biography.value,
    bookingPrice: bookingPrice === '' ? null : Number(bookingPrice),
    availability: form.elements.availability.value,
    portfolioUrl: form.elements.portfolioUrl.value,
  };
  try {
    const result = await api('/api/member/profile', { method: 'PUT', body: JSON.stringify(body) });
    message.textContent = result.message;
    message.classList.add('is-success');
    await initialize();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

initialize();
