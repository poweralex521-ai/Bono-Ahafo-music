const bookingsRoot = document.querySelector('#member-bookings');
const bookingsMessage = document.querySelector('#member-bookings-message');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

async function loadBookings() {
  bookingsMessage.textContent = '';
  bookingsRoot.innerHTML = '<p class="ws-empty">Loading your booking requests…</p>';
  try {
    const response = await fetch('/api/member/bookings');
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load booking requests.');
    if (!data.bookings.length) {
      bookingsRoot.innerHTML = '<section class="workspace-empty-card"><div class="empty-art">⇄</div><h2>No booking requests yet</h2><p>Requests from event organizers will appear here after your public talent profile is approved.</p><a class="ws-button ws-button-gold" href="/member-profile.html">Complete your profile <span>→</span></a></section>';
      return;
    }
    bookingsRoot.innerHTML = data.bookings.map((booking) => `<article class="workspace-data-card booking-request-card">
      <div class="booking-request-heading"><div><p class="workspace-eyebrow">${escapeHtml(booking.status.toUpperCase())}</p><h2>${escapeHtml(booking.eventName)}</h2></div><span>${new Date(booking.eventDate).toLocaleDateString()}</span></div>
      <div class="booking-request-details"><p><span>Organizer</span><strong>${escapeHtml(booking.organizerName)}</strong></p><p><span>Email</span><strong>${escapeHtml(booking.organizerEmail)}</strong></p><p><span>Phone</span><strong>${escapeHtml(booking.organizerPhone)}</strong></p><p><span>Location</span><strong>${escapeHtml(booking.location)}</strong></p></div>
      ${booking.details ? `<p class="booking-request-note">${escapeHtml(booking.details)}</p>` : ''}
      ${booking.status === 'pending' ? `<div class="booking-request-actions"><button class="ws-button ws-button-gold" data-booking-action="accepted" data-id="${escapeHtml(booking._id)}">Accept</button><button class="ws-button ws-button-quiet" data-booking-action="rejected" data-id="${escapeHtml(booking._id)}">Decline</button></div>` : ''}
    </article>`).join('');
  } catch (error) {
    bookingsMessage.textContent = error.message;
    bookingsMessage.classList.add('is-error');
  }
}

bookingsRoot.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-booking-action]');
  if (!button) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/member/bookings/${encodeURIComponent(button.dataset.id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: button.dataset.bookingAction }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not update this booking request.');
    await loadBookings();
  } catch (error) {
    bookingsMessage.textContent = error.message;
    bookingsMessage.classList.add('is-error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refresh-bookings').addEventListener('click', loadBookings);
loadBookings();
