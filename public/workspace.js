const workspace = document.querySelector('#workspace-app');

if (workspace) {
  const role = workspace.dataset.workspaceRole;
  const currentPage = workspace.dataset.workspacePage;
  const destinations = {
    member: '/member.html',
    coordinator: '/coordinator.html',
    super_admin: '/admin.html',
  };
  const navigation = {
    member: [
      ['Dashboard', '/member.html', '⌂', 'dashboard'],
      ['My Profile', '/member-profile.html', '♙', 'profile'],
      ['My Membership', '/my-membership.html', '▣', 'membership'],
      ['My Payments', '/my-payments.html', '＄', 'payments'],
      ['Find Talent', '/directory.html', '⌕', 'talent'],
      ['Book a Band', '/bands.html', '♫', 'bands'],
      ['Booking Requests', '/member-bookings.html', '⇄', 'booking-requests'],
      ['Videos & Media', '/member-media.html', '▷', 'media'],
      ['Events', '/member-events.html', '▦', 'events'],
      ['Announcements', '/member-announcements.html', '◉', 'announcements'],
      ['Reports', '/member-reports.html', '▤', 'reports'],
      ['Settings', '/member-settings.html', '⚙', 'settings'],
    ],
    coordinator: [
      ['Dashboard', '/coordinator.html', '⌂', 'dashboard'],
      ['Register Member', '/coordinator.html#invite', '＋', 'register'],
      ['My Members', '/coordinator.html#members', '♙', 'members'],
      ['Membership Invitations', '/coordinator.html#invite', '✉', 'invitations'],
      ['Group Management', '/coordinator.html#group', '⌂', 'group'],
      ['Member Status', '/coordinator.html#members', '◉', 'status'],
      ['Dues Information', '/coordinator.html#group', '＄', 'dues'],
      ['Reports', '/coordinator.html#members', '▤', 'reports'],
      ['Profile Settings', '/coordinator.html#group', '⚙', 'settings'],
    ],
    super_admin: [
      ['Dashboard', '/admin.html', '⌂', 'dashboard'],
      ['Members', '/admin.html#members', '♙', 'members'],
      ['Coordinators', '/admin.html#coordinators', '♧', 'coordinators'],
      ['Membership Invitations', '/admin.html#invite', '✉', 'invitations'],
      ['Membership Cards', '/admin.html#platform-status', '▣', 'cards'],
      ['QR Verification', '/verify.html', '▦', 'verification'],
      ['Talent Directory', '/directory.html', '♫', 'talent'],
      ['Bands & Groups', '/bands.html', '♬', 'bands'],
      ['Media Moderation', '/admin.html#platform-status', '▷', 'media'],
      ['Booking Requests', '/admin.html#booking-requests', '⇄', 'bookings'],
      ['Website & Content', '/admin.html#website-content', '◇', 'website-content'],
      ['Monthly Dues', '/admin.html#finance-status', '＄', 'dues'],
      ['Payments', '/admin.html#finance-status', '▣', 'payments'],
      ['Paystack Settings', '/admin.html#finance-status', '⚙', 'paystack'],
      ['Welfare & Donations', '/admin.html#finance-status', '♡', 'welfare'],
      ['Expenses & Reports', '/admin.html#finance-status', '▤', 'reports'],
      ['Events', '/admin.html#platform-status', '▦', 'events'],
      ['Announcements', '/announcements.html', '◉', 'announcements'],
      ['Email Management', '/admin.html#platform-status', '✉', 'email'],
      ['Website Management', '/admin.html#platform-status', '◇', 'website'],
      ['Audit & Security', '/admin.html#platform-status', '⌑', 'audit'],
      ['System Settings', '/admin.html#platform-status', '⚙', 'settings'],
    ],
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));
  }

  function safePhoto(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : '';
    } catch {
      return '';
    }
  }

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/login.html');
    }
  }

  async function mountWorkspace() {
    const response = await fetch('/api/auth/me');
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    if (!response.ok) throw new Error('Unable to verify your account.');
    const { user } = await response.json();
    if (user.role !== role) {
      window.location.replace(destinations[user.role] || '/login.html');
      return;
    }

    const main = workspace.querySelector('.workspace-main');
    const initials = user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const photo = safePhoto(user.profilePhotoUrl);
    const items = navigation[role] || [];
    workspace.insertAdjacentHTML('afterbegin', `
      <header class="workspace-header">
        <button class="mobile-menu-toggle" id="workspace-menu-toggle" aria-label="Open navigation" aria-expanded="false">☰</button>
        <a class="workspace-brand" href="${destinations[role]}"><span class="workspace-brand-mark">𝄞</span><span class="workspace-brand-name"><strong>BMA</strong><b>Bono Musicians Association</b><small>Talent <i>•</i> Unity <i>•</i> Progress</small></span></a>
        <form class="workspace-search" id="workspace-search"><input name="q" placeholder="Search musicians, bands, or services…" aria-label="Search talent"><button aria-label="Search">⌕</button></form>
        <div class="workspace-tools">
          <div class="workspace-popover-wrap"><button class="workspace-icon-button" id="notifications-button" aria-label="Notifications">♧</button><div class="workspace-popover notification-popover" id="notifications-popover" hidden><strong>Notifications</strong><p>Notifications are not connected yet.</p></div></div>
          <div class="workspace-popover-wrap"><button class="workspace-profile-button" id="profile-menu-button" aria-expanded="false">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : `<span>${escapeHtml(initials)}</span>`}<span class="workspace-profile-name">${escapeHtml(user.fullName)}</span><b>⌄</b></button><div class="workspace-popover profile-popover" id="profile-popover" hidden><a href="${role === 'member' ? '/member-profile.html' : role === 'coordinator' ? '/coordinator.html#group' : '/admin.html#members'}">Account</a><button type="button" id="workspace-logout">Sign out</button></div></div>
        </div>
      </header>
      <div class="workspace-backdrop" id="workspace-backdrop"></div>`);

    const frame = document.createElement('div');
    frame.className = 'workspace-frame';
    const sidebar = document.createElement('aside');
    sidebar.className = 'workspace-sidebar';
    sidebar.id = 'workspace-sidebar';
    const roleLabel = role === 'member' ? 'MEMBER MENU' : role === 'coordinator' ? 'COORDINATOR MENU' : 'ADMIN MENU';
    sidebar.innerHTML = `<p class="sidebar-label">${roleLabel}</p><nav aria-label="${roleLabel}">${items.map(([label, href, icon, key]) => `<a class="sidebar-link ${currentPage === key ? 'is-active' : ''}" href="${href}"><span class="sidebar-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('')}<button class="sidebar-link sidebar-logout" type="button" id="sidebar-logout"><span class="sidebar-icon" aria-hidden="true">↪</span><span>Logout</span></button></nav><div class="sidebar-message"><span>♫</span><p>Together We Make<br>Music Stronger!</p></div>`;
    workspace.insertBefore(frame, main);
    frame.append(sidebar, main);

    const search = document.querySelector('#workspace-search');
    search.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = search.elements.q.value.trim();
      window.location.assign(query ? `/directory.html?q=${encodeURIComponent(query)}` : '/directory.html');
    });

    const toggle = document.querySelector('#workspace-menu-toggle');
    const backdrop = document.querySelector('#workspace-backdrop');
    const closeSidebar = () => {
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('is-open');
      backdrop.classList.toggle('is-visible', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    backdrop.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeSidebar));
    document.querySelector('#workspace-logout').addEventListener('click', signOut);
    document.querySelector('#sidebar-logout').addEventListener('click', signOut);

    const notificationButton = document.querySelector('#notifications-button');
    const notificationPopover = document.querySelector('#notifications-popover');
    const notificationContent = notificationPopover.querySelector('p');
    if (role === 'member') {
      fetch('/api/member/bookings')
        .then(async (bookingsResponse) => {
          if (!bookingsResponse.ok) throw new Error('Booking requests are unavailable.');
          const { bookings } = await bookingsResponse.json();
          const pending = bookings.filter((booking) => booking.status === 'pending');
          if (pending.length) {
            notificationContent.innerHTML = `${pending.length} pending booking request${pending.length === 1 ? '' : 's'}. <a href="/member-bookings.html">Review requests</a>`;
            notificationButton.insertAdjacentHTML('beforeend', `<span class="notification-count">${pending.length}</span>`);
          } else {
            notificationContent.textContent = 'No pending booking requests.';
          }
        })
        .catch(() => {
          notificationContent.textContent = 'Booking updates are temporarily unavailable.';
        });
    }
    notificationButton.addEventListener('click', () => {
      notificationPopover.hidden = !notificationPopover.hidden;
    });
    const profileButton = document.querySelector('#profile-menu-button');
    const profilePopover = document.querySelector('#profile-popover');
    profileButton.addEventListener('click', () => {
      profilePopover.hidden = !profilePopover.hidden;
      profileButton.setAttribute('aria-expanded', String(!profilePopover.hidden));
    });

    main.dispatchEvent(new CustomEvent('workspace:ready', { detail: { user } }));
  }

  mountWorkspace().catch((error) => {
    const status = document.querySelector('#workspace-error') || document.querySelector('.workspace-error');
    if (status) status.textContent = error.message;
    else console.error(error);
  });
}
