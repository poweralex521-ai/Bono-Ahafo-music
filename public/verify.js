const form = document.querySelector('#verify-form');
const message = document.querySelector('#verify-message');
const resultRoot = document.querySelector('#verify-result');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

async function verifyMembership(id) {
  message.textContent = 'Checking membership status…';
  message.className = 'form-message';
  resultRoot.innerHTML = '';
  try {
    const response = await fetch(`/api/verify/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Membership could not be verified.');
    message.textContent = 'This membership is active and verified.';
    message.classList.add('is-success');
    resultRoot.innerHTML = `<div class="verification-result"><strong>${escapeHtml(data.member.fullName)}</strong><span>${escapeHtml(data.member.membershipId)}</span><span>${escapeHtml(data.member.profession || 'BOMA member')}</span><span>${escapeHtml(data.member.status)}</span></div>`;
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('is-error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await verifyMembership(form.elements.membershipId.value.trim());
});

const initialMembershipId = new URLSearchParams(window.location.search).get('membershipId');
if (initialMembershipId) {
  form.elements.membershipId.value = initialMembershipId;
  verifyMembership(initialMembershipId);
}
