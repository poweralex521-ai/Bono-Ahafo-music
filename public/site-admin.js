const siteContentForm = document.querySelector('#site-content-form');

if (siteContentForm) {
  const siteContentStatus = document.querySelector('#site-content-status');
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

  function escapeSiteAdmin(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));
  }

  function showSiteStatus(message, kind = '') {
    siteContentStatus.textContent = message;
    siteContentStatus.className = `form-message${kind ? ` is-${kind}` : ''}`;
  }

  async function getSiteContent(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const result = response.status === 204 ? {} : await response.json();
    if (response.status === 401) {
      window.location.replace('/login.html');
      throw new Error('Your administrator session has expired.');
    }
    if (!response.ok) throw new Error(result.error || 'Website settings could not be saved.');
    return result;
  }

  function renderEditorRows(type, records) {
    const container = document.querySelector(`#${type}-editor`);
    container.innerHTML = records.map((record, index) => {
      const imageUrl = escapeSiteAdmin(record.imageUrl);
      const imageEditor = `
        <label class="site-image-editor">Image or logo
          <input type="file" accept="image/jpeg,image/png,image/webp" data-site-image>
          <input type="hidden" data-image-url value="${imageUrl}">
          <span class="site-image-help">JPG, PNG or WebP; up to 6 MB.</span>
          ${imageUrl
            ? `<img class="site-image-preview" src="${imageUrl}" alt="Current upload preview">`
            : '<span class="site-image-placeholder">Choose an image to upload</span>'}
        </label>`;
      let fields = '';
      if (type === 'directors') {
        fields = `
          <label>Director name<input data-item-field="name" required maxlength="120" value="${escapeSiteAdmin(record.name)}"></label>
          <label>Role or position<input data-item-field="role" required maxlength="120" value="${escapeSiteAdmin(record.role)}"></label>
          <label class="site-editor-wide">Biography<textarea data-item-field="biography" maxlength="1000" rows="3">${escapeSiteAdmin(record.biography)}</textarea></label>
          ${imageEditor}`;
      } else if (type === 'sponsors') {
        fields = `
          <label>Sponsor name<input data-item-field="name" required maxlength="120" value="${escapeSiteAdmin(record.name)}"></label>
          <label>Website (optional)<input data-item-field="website" type="url" maxlength="500" placeholder="https://…" value="${escapeSiteAdmin(record.website)}"></label>
          ${imageEditor}`;
      } else {
        fields = `
          <label>Gallery title<input data-item-field="title" required maxlength="160" value="${escapeSiteAdmin(record.title)}"></label>
          <label class="site-editor-wide">Caption<textarea data-item-field="caption" maxlength="500" rows="2">${escapeSiteAdmin(record.caption)}</textarea></label>
          ${imageEditor}`;
      }
      return `<article class="site-editor-row" data-site-row="${type}">
        <div class="site-editor-row-heading"><strong>${type === 'directors' ? 'Director' : type === 'sponsors' ? 'Sponsor' : 'Gallery image'} ${index + 1}</strong><button class="button button-quiet-dark" type="button" data-remove-site-item>Remove</button></div>
        <div class="site-editor-row-fields">${fields}</div>
      </article>`;
    }).join('');
  }

  function setSiteField(name, value) {
    const field = siteContentForm.querySelector(`[data-site-field="${name}"]`);
    if (field) field.value = value || '';
  }

  async function loadSiteContent() {
    showSiteStatus('Loading saved public website content…');
    const button = document.querySelector('#reload-site-content');
    button.disabled = true;
    try {
      const { content } = await getSiteContent('/api/admin/site-content');
      for (const [group, fields] of Object.entries({
        about: ['heroEyebrow', 'heroTitle', 'heroDescription', 'purposeTitle', 'introduction', 'membershipNote'],
        footer: ['tagline', 'contactUrl', 'poweredBy', 'poweredByUrl'],
        socials: ['facebook', 'instagram', 'youtube', 'tiktok'],
        appLinks: ['googlePlay', 'appleAppStore'],
      })) {
        for (const field of fields) setSiteField(`${group}.${field}`, content[group]?.[field]);
      }
      renderEditorRows('directors', content.directors || []);
      renderEditorRows('sponsors', content.sponsors || []);
      renderEditorRows('gallery', content.gallery || []);
      showSiteStatus('Website settings loaded. Changes are published when you save.');
    } catch (error) {
      showSiteStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  function readRows(type, fields) {
    return [...document.querySelectorAll(`[data-site-row="${type}"]`)].map((row) => {
      const record = {};
      for (const field of fields) {
        record[field] = row.querySelector(`[data-item-field="${field}"]`).value.trim();
      }
      record.imageUrl = row.querySelector('[data-image-url]').value.trim();
      return record;
    });
  }

  siteContentForm.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-site-item]');
    if (addButton) {
      const type = addButton.dataset.addSiteItem;
      const fields = {
        directors: ['directors', { name: '', role: '', biography: '', imageUrl: '' }],
        sponsors: ['sponsors', { name: '', website: '', imageUrl: '' }],
        gallery: ['gallery', { title: '', caption: '', imageUrl: '' }],
      };
      if (!fields[type]) return;
      const container = document.querySelector(`#${fields[type][0]}-editor`);
      const records = readRows(type, fields[type][0] === 'directors'
        ? ['name', 'role', 'biography']
        : type === 'sponsors' ? ['name', 'website'] : ['title', 'caption']);
      if (records.length >= (type === 'gallery' ? 36 : 24)) {
        showSiteStatus(`You can add up to ${type === 'gallery' ? 36 : 24} ${type} items.`, 'error');
        return;
      }
      records.push(fields[type][1]);
      renderEditorRows(type, records);
      container.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const removeButton = event.target.closest('[data-remove-site-item]');
    if (removeButton) {
      const row = removeButton.closest('[data-site-row]');
      const type = row.dataset.siteRow;
      row.remove();
      document.querySelectorAll(`[data-site-row="${type}"]`).forEach((item, index) => {
        item.querySelector('.site-editor-row-heading strong').textContent =
          `${type === 'directors' ? 'Director' : type === 'sponsors' ? 'Sponsor' : 'Gallery image'} ${index + 1}`;
      });
    }
  });

  siteContentForm.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-site-image]');
    if (!input || !input.files?.length) return;
    const file = input.files[0];
    if (!imageTypes.includes(file.type) || file.size > 6 * 1024 * 1024) {
      input.value = '';
      showSiteStatus('Choose a JPG, PNG, or WebP image smaller than 6 MB.', 'error');
      return;
    }

    const row = input.closest('[data-site-row]');
    const oldLabel = input.parentElement.querySelector('.site-image-help');
    oldLabel.textContent = 'Uploading image…';
    input.disabled = true;
    showSiteStatus(`Uploading ${file.name}…`);
    try {
      const data = new FormData();
      data.append('image', file);
      const result = await getSiteContent('/api/admin/site-media', { method: 'POST', body: data });
      row.querySelector('[data-image-url]').value = result.imageUrl;
      let preview = row.querySelector('.site-image-preview');
      if (!preview) {
        preview = document.createElement('img');
        preview.className = 'site-image-preview';
        preview.alt = 'Uploaded image preview';
        row.querySelector('.site-image-placeholder')?.replaceWith(preview);
      }
      preview.src = result.imageUrl;
      oldLabel.textContent = 'Image uploaded. Save & publish to use it on the website.';
      showSiteStatus('Image uploaded. Save & publish to show it on the public website.', 'success');
    } catch (error) {
      oldLabel.textContent = 'Upload failed. Choose an image to try again.';
      showSiteStatus(error.message, 'error');
    } finally {
      input.disabled = false;
      input.value = '';
    }
  });

  siteContentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveButton = document.querySelector('#save-site-content');
    saveButton.disabled = true;
    showSiteStatus('Saving and publishing website content…');
    const value = (name) => siteContentForm.querySelector(`[data-site-field="${name}"]`).value.trim();
    const content = {
      about: {
        heroEyebrow: value('about.heroEyebrow'),
        heroTitle: value('about.heroTitle'),
        heroDescription: value('about.heroDescription'),
        purposeTitle: value('about.purposeTitle'),
        introduction: value('about.introduction'),
        membershipNote: value('about.membershipNote'),
      },
      footer: {
        tagline: value('footer.tagline'),
        contactUrl: value('footer.contactUrl'),
        poweredBy: value('footer.poweredBy'),
        poweredByUrl: value('footer.poweredByUrl'),
      },
      socials: Object.fromEntries(['facebook', 'instagram', 'youtube', 'tiktok']
        .map((name) => [name, value(`socials.${name}`)])),
      appLinks: Object.fromEntries(['googlePlay', 'appleAppStore']
        .map((name) => [name, value(`appLinks.${name}`)])),
      directors: readRows('directors', ['name', 'role', 'biography']),
      sponsors: readRows('sponsors', ['name', 'website']),
      gallery: readRows('gallery', ['title', 'caption']),
    };

    try {
      const { updatedAt } = await getSiteContent('/api/admin/site-content', {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      const savedTime = updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'just now';
      showSiteStatus(`Saved and published successfully at ${savedTime}.`, 'success');
    } catch (error) {
      showSiteStatus(error.message, 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  document.querySelector('#reload-site-content').addEventListener('click', loadSiteContent);
  loadSiteContent();
}
