const siteEscapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const siteNavItems = [
  ['About', '/about.html'],
  ['Find talent', '/directory.html'],
  ['Events', '/events.html'],
  ['Bands', '/bands.html'],
  ['Leadership', '/leadership.html'],
  ['Gallery', '/gallery.html'],
  ['Membership', '/membership.html'],
  ['Contact', '/contact.html'],
];

function installPublicHeader() {
  if (!document.body.classList.contains('content-page')) return;
  const header = document.querySelector('.site-header');
  if (!header) return;
  const currentPath = window.location.pathname;
  header.innerHTML = `
    <a class="brand" href="/" aria-label="BMA home">
      <span class="brand-mark" aria-hidden="true">𝄞</span>
      <span class="brand-copy"><strong>BMA</strong><span>Bono Musicians Association</span><small>Talent • Unity • Progress</small></span>
    </a>
    <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Open navigation" aria-controls="main-nav" aria-expanded="false">
      <span class="menu-toggle-icon" aria-hidden="true"><i></i><i></i><i></i></span><span class="menu-toggle-label">MENU</span>
    </button>
    <button class="site-mobile-backdrop" id="site-nav-backdrop" type="button" aria-label="Close navigation" tabindex="-1"></button>
    <nav class="main-nav" id="main-nav" aria-label="Main navigation">
      <div class="site-mobile-nav-heading"><span>Explore BMA</span><button class="site-nav-close" id="site-nav-close" type="button" aria-label="Close navigation">×</button></div>
      ${siteNavItems.map(([label, href]) => `<a href="${href}"${currentPath === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      <a class="nav-login" href="/login.html">Member login <span aria-hidden="true">↗</span></a>
    </nav>`;
}

function installContentPageNavigation() {
  if (!document.body.classList.contains('content-page')) return;
  const toggle = document.querySelector('#menu-toggle');
  const navigation = document.querySelector('#main-nav');
  const closeButton = document.querySelector('#site-nav-close');
  const backdrop = document.querySelector('#site-nav-backdrop');
  if (!toggle || !navigation) return;

  const mobileQuery = window.matchMedia('(max-width: 850px)');
  const setOpen = (open, restoreFocus = false) => {
    const expanded = open && mobileQuery.matches;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('is-open', expanded);
    navigation.inert = mobileQuery.matches && !expanded;
    document.body.classList.toggle('nav-open', expanded);
    backdrop?.classList.toggle('is-open', expanded);
    if (backdrop) backdrop.tabIndex = expanded ? 0 : -1;
    if (expanded) {
      window.setTimeout(() => {
        if (toggle.getAttribute('aria-expanded') === 'true') closeButton?.focus();
      }, 0);
    } else if (restoreFocus) {
      window.setTimeout(() => {
        if (toggle.getAttribute('aria-expanded') === 'false') toggle.focus();
      }, 0);
    }
  };

  setOpen(false);
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  closeButton?.addEventListener('click', () => setOpen(false, true));
  backdrop?.addEventListener('click', () => setOpen(false, true));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
      return;
    }
    if (event.key === 'Tab' && toggle.getAttribute('aria-expanded') === 'true') {
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
  mobileQuery.addEventListener('change', () => setOpen(false));
}

function socialIcon(name) {
  const icons = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.6 1.6-1.6h1.7V3.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.3-3.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 6.2a5.5 5.5 0 0 1-3.4-3.5A7.6 7.6 0 0 1 16 1h-4v14.2a3.3 3.3 0 1 1-2.3-3.1V8a7.2 7.2 0 1 0 6.3 7.1V8a9.5 9.5 0 0 0 5 1.5v-4a5.7 5.7 0 0 1-1.4-.3Z"/></svg>',
  };
  return icons[name];
}

function safeExternalLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function renderSiteFooter(content) {
  const oldFooter = document.querySelector('footer');
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  const socialLinks = ['facebook', 'instagram', 'youtube', 'tiktok']
    .map((name) => {
      const href = safeExternalLink(content.socials?.[name]);
      return href
        ? `<a class="site-social-link" href="${siteEscapeHtml(href)}" aria-label="${name}" target="_blank" rel="noopener noreferrer">${socialIcon(name)}</a>`
        : `<span class="site-social-link is-unconfigured" aria-label="${name} link not configured" title="${name} link not configured">${socialIcon(name)}</span>`;
    }).join('');
  const appLinks = [
    ['googlePlay', 'Google Play', 'GET IT ON', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34a853" d="M3 2.5v19l10.2-9.5L3 2.5Z"/><path fill="#4285f4" d="m3 2.5 13.1 7.8-2.9 1.7L3 2.5Z"/><path fill="#fbbc04" d="m3 21.5 13.1-7.8-2.9-1.7L3 21.5Z"/><path fill="#ea4335" d="m16.1 10.3 4.3 2.5c.8.5.8 1.9 0 2.4l-4.3 2.5-3.6-5.3 3.6-2.1Z"/></svg>'],
    ['appleAppStore', 'App Store', 'DOWNLOAD ON THE', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.8c0-2 1.6-3 1.7-3.1a3.8 3.8 0 0 0-3-1.6c-1.3-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8a4.1 4.1 0 0 0-3.4 2.1c-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2.1 1 0 1.4-.6 2.7-.6s1.6.6 2.8.6 1.9-1 2.6-2a9 9 0 0 0 1.2-2.3 3.5 3.5 0 0 1-2-3.2ZM14.2 6.7a3.8 3.8 0 0 0 .9-2.7 4 4 0 0 0-2.6 1.3 3.5 3.5 0 0 0-.9 2.6 3.3 3.3 0 0 0 2.6-1.2Z"/></svg>'],
  ].map(([key, label, prefix, icon]) => {
    const href = safeExternalLink(content.appLinks?.[key]);
    const badge = `${icon}<span><small>${href ? prefix : 'COMING SOON'}</small>${label}</span>`;
    return href
      ? `<a class="site-app-badge" href="${siteEscapeHtml(href)}" target="_blank" rel="noopener noreferrer">${badge}</a>`
      : `<span class="site-app-badge is-unconfigured" aria-label="${label} link not configured">${badge}</span>`;
  }).join('');
  const contactUrl = typeof content.footer?.contactUrl === 'string'
    && content.footer.contactUrl.startsWith('/')
    && !content.footer.contactUrl.startsWith('//')
    ? content.footer.contactUrl : '/contact.html';
  const poweredBy = safeExternalLink(content.footer?.poweredByUrl);

  footer.innerHTML = `
    <div class="site-footer-inner">
      <div class="site-footer-main">
        <div>
          <a class="site-footer-brand" href="/" aria-label="BMA home">
            <span class="site-footer-brand-mark" aria-hidden="true">𝄞</span>
            <span class="site-footer-brand-copy"><strong>BMA</strong><span>Bono Musicians Association</span><small>Talent • Unity • Progress</small></span>
          </a>
          <p class="site-footer-tagline">${siteEscapeHtml(content.footer?.tagline || '')}</p>
        </div>
        <div class="site-footer-column">
          <h2>FOLLOW THE MUSIC</h2>
          <div class="site-social-links">${socialLinks}</div>
        </div>
        <div class="site-footer-column">
          <h2>GET THE BMA APP</h2>
          <div class="site-app-links">${appLinks}</div>
          <a class="site-footer-contact" href="${siteEscapeHtml(contactUrl)}">Contact the association <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div class="site-footer-bottom">
        <span>© ${new Date().getFullYear()} Bono Musicians Association</span>
        <span class="site-powered-by">Powered by ${poweredBy ? `<a href="${siteEscapeHtml(poweredBy)}" target="_blank" rel="noopener noreferrer">${siteEscapeHtml(content.footer?.poweredBy || 'OTWOTECH')}</a>` : siteEscapeHtml(content.footer?.poweredBy || 'OTWOTECH')}</span>
      </div>
    </div>`;
  if (oldFooter) oldFooter.replaceWith(footer);
  else document.body.append(footer);
}

function renderParagraphs(container, text) {
  if (!container) return;
  container.innerHTML = String(text || '').split(/\n{2,}/).filter(Boolean)
    .map((paragraph) => `<p>${siteEscapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

function renderDirectors(directors) {
  const grid = document.querySelector('#directors-grid');
  if (!grid) return;
  grid.innerHTML = directors.length ? directors.map((director) => `
    <article class="site-person-card">
      ${director.imageUrl ? `<img src="${siteEscapeHtml(director.imageUrl)}" alt="${siteEscapeHtml(director.name)}" loading="lazy">` : '<div class="site-person-placeholder" aria-hidden="true">♫</div>'}
      <div><p>${siteEscapeHtml(director.role)}</p><h2>${siteEscapeHtml(director.name)}</h2>${director.biography ? `<p>${siteEscapeHtml(director.biography)}</p>` : ''}</div>
    </article>`).join('') : '<p class="empty-state">The public leadership roster has not been published yet.</p>';
}

function renderSponsors(sponsors) {
  const grid = document.querySelector('#sponsors-grid');
  if (!grid) return;
  grid.innerHTML = sponsors.length ? sponsors.map((sponsor) => {
    const href = safeExternalLink(sponsor.website);
    const image = sponsor.imageUrl
      ? `<img src="${siteEscapeHtml(sponsor.imageUrl)}" alt="${siteEscapeHtml(sponsor.name)}" loading="lazy">`
      : `<span>${siteEscapeHtml(sponsor.name)}</span>`;
    return `<article class="site-sponsor-card">${href ? `<a href="${siteEscapeHtml(href)}" target="_blank" rel="noopener noreferrer">${image}</a>` : image}</article>`;
  }).join('') : '<p class="empty-state">Our sponsor community will be shared here.</p>';
}

function renderGallery(gallery) {
  const grid = document.querySelector('#site-gallery-grid');
  if (!grid) return;
  const items = grid.dataset.limit ? gallery.slice(0, Number(grid.dataset.limit)) : gallery;
  grid.innerHTML = items.length ? items.map((item) => `
    <figure class="site-gallery-item">
      <img src="${siteEscapeHtml(item.imageUrl)}" alt="${siteEscapeHtml(item.title)}" loading="lazy">
      <figcaption><strong>${siteEscapeHtml(item.title)}</strong>${item.caption ? `<span>${siteEscapeHtml(item.caption)}</span>` : ''}</figcaption>
    </figure>`).join('') : '<p class="empty-state">BMA community photos will be shared here.</p>';
}

function applySiteContent(content) {
  const about = content.about || {};
  const textTargets = {
    '#about-hero-eyebrow': about.heroEyebrow,
    '#about-hero-title': about.heroTitle,
    '#about-hero-description': about.heroDescription,
    '#about-purpose-title': about.purposeTitle,
  };
  for (const [selector, value] of Object.entries(textTargets)) {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  }
  renderParagraphs(document.querySelector('#about-introduction'), about.introduction);
  renderParagraphs(document.querySelector('#about-membership-note'), about.membershipNote);
  renderDirectors(content.directors || []);
  renderSponsors(content.sponsors || []);
  renderGallery(content.gallery || []);
  renderSiteFooter(content);
}

function initializeSite() {
  installPublicHeader();
  installContentPageNavigation();
  fetch('/api/site-content', { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error('Public website settings could not be loaded.');
      const { content } = await response.json();
      applySiteContent(content);
    })
    .catch((error) => {
      console.error(error);
      renderSiteFooter({
        socials: {},
        appLinks: {},
        footer: { tagline: 'Celebrating the people and sounds of Bono, Ghana.', poweredBy: 'OTWOTECH' },
      });
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSite, { once: true });
} else {
  initializeSite();
}
