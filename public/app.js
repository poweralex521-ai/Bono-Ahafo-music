const menuToggle = document.querySelector('#menu-toggle');
const navigation = document.querySelector('#main-nav');
const navigationBackdrop = document.querySelector('#nav-backdrop');
const navigationClose = document.querySelector('#nav-close');
const mobileNavigation = window.matchMedia('(max-width: 850px)');

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

if (menuToggle && navigation && document.body.classList.contains('home-page')) {
  const setNavigationOpen = (open, returnFocus = false) => {
    const isOpen = open && mobileNavigation.matches;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    menuToggle.classList.toggle('is-open', isOpen);
    navigation.classList.toggle('is-open', isOpen);
    navigation.inert = mobileNavigation.matches && !isOpen;
    document.body.classList.toggle('nav-open', isOpen);
    if (navigationBackdrop) {
      navigationBackdrop.classList.toggle('is-open', isOpen);
      navigationBackdrop.tabIndex = isOpen ? 0 : -1;
    }
    if (isOpen) {
      window.setTimeout(() => {
        if (menuToggle.getAttribute('aria-expanded') === 'true') navigationClose?.focus();
      }, 0);
    } else if (returnFocus) {
      window.setTimeout(() => {
        if (menuToggle.getAttribute('aria-expanded') === 'false') menuToggle.focus();
      }, 0);
    }
  };

  setNavigationOpen(false);
  menuToggle.addEventListener('click', () => {
    setNavigationOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  navigationClose?.addEventListener('click', () => setNavigationOpen(false, true));
  navigationBackdrop?.addEventListener('click', () => setNavigationOpen(false, true));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setNavigationOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      setNavigationOpen(false, true);
      return;
    }
    if (event.key === 'Tab' && menuToggle.getAttribute('aria-expanded') === 'true') {
      const focusable = [...navigation.querySelectorAll('a[href], button:not([disabled])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  mobileNavigation.addEventListener('change', () => setNavigationOpen(false));
}

const talentGrid = document.querySelector('#talent-grid');
const resultCount = document.querySelector('#result-count');
const searchForm = document.querySelector('#search-form');
const talentPagination = document.querySelector('#talent-pagination');
const bookingDialog = document.querySelector('#booking-dialog');
const bookingForm = document.querySelector('#booking-form');
const bookingMessage = document.querySelector('#booking-message');

if (talentGrid && resultCount && searchForm) {
  let latestTalentRequest = 0;

  function renderTalents(talents, pagination) {
    resultCount.textContent = pagination
      ? `SHOWING ${talents.length} OF ${pagination.total} APPROVED PROFILES`
      : `${talents.length} APPROVED ${talents.length === 1 ? 'PROFILE' : 'PROFILES'}`;
    if (!talents.length) {
      talentGrid.innerHTML = '<p class="empty-state">No approved profiles match those filters yet. Try a different search.</p>';
    } else {
      talentGrid.innerHTML = talents.map((talent) => {
        const specialties = [...(talent.instruments || []), ...(talent.genres || [])].slice(0, 3);
        const photo = talent.profilePhotoUrl
          ? `<img src="${escapeHtml(talent.profilePhotoUrl)}" alt="" loading="lazy">`
          : '<span aria-hidden="true">♫</span>';
        const price = Number.isFinite(talent.bookingPrice)
          ? `<p class="talent-price">FROM GHS ${escapeHtml(talent.bookingPrice)}</p>`
          : '';
        return `<article class="talent-card">
          <div class="talent-photo">${photo}<span class="talent-note" aria-hidden="true">♫</span><span class="verified">✓ BOMA VERIFIED</span></div>
          <div class="talent-info">
            <p class="talent-profession">${escapeHtml(talent.profession || 'Creative professional')}</p>
            <h3>${escapeHtml(talent.fullName)}</h3>
            <p class="talent-location">${escapeHtml(talent.location || 'Bono Region')}</p>
            <p class="talent-bio">${escapeHtml(talent.biography || 'An approved member of the Bono Musicians Association.')}</p>
            <div class="talent-tags">${specialties.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
            ${price}
            <div class="talent-actions">
              <a class="text-link" href="/talent.html?id=${encodeURIComponent(talent._id)}">View full profile <span>→</span></a>
              ${bookingDialog ? `<button class="text-link booking-trigger" data-id="${escapeHtml(talent._id)}" data-name="${escapeHtml(talent.fullName)}">Request a booking <span>→</span></button>` : ''}
            </div>
          </div>
        </article>`;
      }).join('');
    }

    if (talentPagination && pagination) {
      talentPagination.innerHTML = pagination.pages > 1
        ? `<button class="talent-page-button" type="button" data-page="${pagination.page - 1}"${pagination.hasPrevious ? '' : ' disabled'}>← Previous</button>
           <span>PAGE ${pagination.page} OF ${pagination.pages}</span>
           <button class="talent-page-button" type="button" data-page="${pagination.page + 1}"${pagination.hasNext ? '' : ' disabled'}>Next →</button>`
        : '';
    }
  }

  function setSearchForm(parameters) {
    searchForm.reset();
    for (const [key, value] of parameters) {
      const field = searchForm.elements.namedItem(key);
      if (field && 'value' in field) field.value = value;
    }
  }

  function updateDirectoryUrl(parameters, replace = false) {
    if (!talentPagination) return;
    const urlParameters = new URLSearchParams(parameters);
    urlParameters.delete('limit');
    const query = urlParameters.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  async function loadTalents(parameters = new URLSearchParams()) {
    const requestId = ++latestTalentRequest;
    const requestParameters = new URLSearchParams(parameters);
    if (talentPagination) requestParameters.set('limit', '12');
    else requestParameters.set('limit', '4');
    talentGrid.innerHTML = '<p class="empty-state">Loading the BOMA talent directory…</p>';
    try {
    const query = requestParameters.toString();
    const response = await fetch(`/api/talents${query ? `?${query}` : ''}`);
    if (!response.ok) throw new Error('Directory is temporarily unavailable.');
    const data = await response.json();
    if (requestId !== latestTalentRequest) return;
    renderTalents(data.talents, talentPagination ? data.pagination : null);
    if (talentPagination && data.pagination) {
      const pageParameters = new URLSearchParams(parameters);
      if (data.pagination.page > 1) pageParameters.set('page', String(data.pagination.page));
      else pageParameters.delete('page');
      updateDirectoryUrl(pageParameters, true);
    }
    } catch (error) {
    if (requestId !== latestTalentRequest) return;
    resultCount.textContent = 'DIRECTORY STATUS';
    talentGrid.innerHTML = `<p class="empty-state">${escapeHtml(error.message)} Please try again shortly.</p>`;
    if (talentPagination) talentPagination.replaceChildren();
    }
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const parameters = new URLSearchParams();
    for (const [key, value] of new FormData(searchForm)) {
    if (String(value).trim()) parameters.set(key, String(value).trim());
    }
    if (talentPagination) updateDirectoryUrl(parameters);
    loadTalents(parameters);
  });

  talentPagination?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    const parameters = new URLSearchParams(window.location.search);
    parameters.set('page', button.dataset.page);
    updateDirectoryUrl(parameters);
    loadTalents(parameters);
    talentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const clearSearch = document.querySelector('#clear-search');
  if (clearSearch) {
    clearSearch.addEventListener('click', (event) => {
    event.preventDefault();
    searchForm.reset();
    if (talentPagination) updateDirectoryUrl(new URLSearchParams());
    loadTalents();
    });
  }

  window.addEventListener('popstate', () => {
    const parameters = new URLSearchParams(window.location.search);
    setSearchForm(parameters);
    loadTalents(parameters);
  });

  if (bookingDialog && bookingForm && bookingMessage) {
    talentGrid.addEventListener('click', (event) => {
    const trigger = event.target.closest('.booking-trigger');
    if (!trigger) return;
    bookingForm.reset();
    bookingForm.elements.talentId.value = trigger.dataset.id;
    bookingMessage.textContent = `Booking request for ${trigger.dataset.name}.`;
    bookingMessage.classList.remove('is-error', 'is-success');
    bookingDialog.showModal();
  });

  document.querySelector('#close-booking').addEventListener('click', () => bookingDialog.close());

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    bookingMessage.textContent = 'Sending your request…';
    bookingMessage.classList.remove('is-error', 'is-success');
    try {
      const formData = new FormData(bookingForm);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit the request.');
      bookingForm.reset();
      bookingMessage.textContent = result.message;
      bookingMessage.classList.add('is-success');
    } catch (error) {
      bookingMessage.textContent = error.message;
      bookingMessage.classList.add('is-error');
    } finally {
      submitButton.disabled = false;
    }
  });
  }

  const initialParameters = new URLSearchParams(window.location.search);
  setSearchForm(initialParameters);
  loadTalents(initialParameters);
}
