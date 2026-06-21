/**
 * Substack feed renderer
 * -----------------------
 * Fetches a Substack publication's RSS feed and renders post cards into a
 * container. Substack's feed sends no CORS headers, so we go through a
 * CORS-enabled RSS->JSON service (rss2json) with a raw-XML proxy as fallback.
 *
 * Usage:
 *   SubstackFeed.render({
 *     publication: 'pixelsbypavan',   // -> https://pixelsbypavan.substack.com
 *     containerId: 'substack-posts',
 *     layout: 'list',                 // 'list' (blog cards) | 'gallery' (image grid)
 *     limit: 30
 *   });
 */
const SubstackFeed = (() => {
  'use strict';

  const escapeHtml = (s = '') =>
    s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function stripHtml(html = '') {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function firstImage(html = '') {
    const m = html.match(/<img[^>]+src="([^"]+)"/i);
    return m ? m[1] : '';
  }

  function fmtDate(s) {
    const d = new Date((s || '').replace(' ', 'T'));
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Posts whose title begins with one of these markers are treated as photo posts.
  // Tag a post on Substack by starting its title with "📷" or "[photo]".
  const PHOTO_MARKER = /^\s*(?:📷|\[photos?\]|\[photography\])\s*/i;

  // category: 'photo'   -> only tagged posts, with the marker stripped from the title
  //           'writing' -> only untagged posts
  //           undefined -> everything
  function applyCategory(items, category) {
    if (category === 'photo') {
      return items
        .filter(p => PHOTO_MARKER.test(p.title))
        .map(p => ({ ...p, title: p.title.replace(PHOTO_MARKER, '').trim() }));
    }
    if (category === 'writing') {
      return items.filter(p => !PHOTO_MARKER.test(p.title));
    }
    return items;
  }

  // --- fetch strategies -------------------------------------------------

  async function viaRss2Json(feedUrl) {
    // Note: the keyless rss2json endpoint rejects the `count` param (422),
    // so we fetch the default set and slice client-side.
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('rss2json HTTP ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('rss2json status ' + data.status);
    return data.items.map(it => ({
      title: it.title || '',
      link: it.link || '',
      date: it.pubDate || '',
      image: (it.enclosure && it.enclosure.link) || it.thumbnail || firstImage(it.content || it.description),
      excerpt: stripHtml(it.description || it.content || '')
    }));
  }

  async function viaXmlProxy(feedUrl) {
    // allorigins returns the raw body with permissive CORS
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('proxy HTTP ' + res.status);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parse error');
    return Array.from(doc.querySelectorAll('item')).map(item => {
      const get = sel => (item.querySelector(sel)?.textContent || '').trim();
      const content = item.getElementsByTagName('content:encoded')[0]?.textContent || get('description');
      return {
        title: get('title'),
        link: get('link'),
        date: get('pubDate'),
        image: item.querySelector('enclosure')?.getAttribute('url') || firstImage(content),
        excerpt: stripHtml(get('description') || content)
      };
    });
  }

  async function loadItems(feedUrl) {
    try {
      return await viaRss2Json(feedUrl);
    } catch (e) {
      console.warn('SubstackFeed: rss2json failed, trying proxy —', e.message);
      return await viaXmlProxy(feedUrl);
    }
  }

  // --- rendering --------------------------------------------------------

  function clamp(text, n) {
    return text.length > n ? escapeHtml(text.slice(0, n)) + '…' : escapeHtml(text);
  }

  function listCard(p) {
    return `
      <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener"
         class="block border-l-2 border-gray-200 hover:border-blue-400 pl-6 pb-6 transition-colors group">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-2 h-2 bg-blue-500 rounded-full -ml-7 border-2 border-white"></div>
          <span class="text-sm text-gray-500">${fmtDate(p.date)}</span>
          <span class="text-sm text-gray-400">•</span>
          <span class="text-sm text-gray-400">Substack</span>
        </div>
        <div class="flex gap-4">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy"
               class="w-28 h-20 object-cover rounded-md flex-shrink-0 hidden sm:block">` : ''}
          <div>
            <h3 class="font-medium text-gray-900 mb-1 group-hover:text-blue-600">${escapeHtml(p.title)}</h3>
            <p class="text-gray-600 text-sm leading-relaxed">${clamp(p.excerpt, 200)}</p>
          </div>
        </div>
      </a>`;
  }

  function galleryCard(p) {
    return `
      <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="group block">
        <div class="overflow-hidden rounded-lg bg-gray-100 aspect-[4/3]">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">` : ''}
        </div>
        <h3 class="mt-3 font-medium text-gray-900 text-sm group-hover:text-blue-600">${escapeHtml(p.title)}</h3>
        <p class="text-gray-500 text-xs mt-1">${fmtDate(p.date)}</p>
      </a>`;
  }

  async function render({ publication, containerId, layout = 'list', limit = 30, category, emptyMessage }) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const pubUrl = `https://${publication}.substack.com`;
    el.innerHTML = `<p class="text-gray-400 text-sm">Loading posts from Substack…</p>`;

    // Unconfigured placeholder -> show a friendly link instead of erroring.
    if (!publication || /your[-_]|replace/i.test(publication)) {
      el.innerHTML = `<p class="text-gray-500 text-sm">Coming soon on Substack.</p>`;
      return;
    }

    try {
      const items = applyCategory(await loadItems(`${pubUrl}/feed`), category).slice(0, limit);
      if (!items.length) {
        el.innerHTML = `<p class="text-gray-500 text-sm">${escapeHtml(emptyMessage || 'No posts yet.')}
          <a class="text-blue-600 hover:underline" href="${pubUrl}" target="_blank" rel="noopener">Visit on Substack →</a></p>`;
        return;
      }
      const card = layout === 'gallery' ? galleryCard : listCard;
      el.innerHTML = layout === 'gallery'
        ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${items.map(card).join('')}</div>`
        : `<div class="space-y-6">${items.map(card).join('')}</div>`;
    } catch (e) {
      console.error('SubstackFeed:', e);
      el.innerHTML = `<p class="text-gray-500 text-sm">Couldn't load posts right now.
        <a class="text-blue-600 hover:underline" href="${pubUrl}" target="_blank" rel="noopener">Read on Substack →</a></p>`;
    }
  }

  return { render };
})();
