import { escapeHTML, sanitizeUrl } from '../utils/html.js';
import { normalizeSortOrder } from '../utils/sort.js';
import { isSubmissionEnabled } from '../admin/auth.js';
import frontendTemplate from '../templates/frontend.html';

export async function handleFrontendRequest(request, env, ctx) {
  const url = new URL(request.url);
  const catalog = url.searchParams.get('catalog');

  let sites = [];
  try {
    const { results } = await env.NAV_DB.prepare('SELECT * FROM sites ORDER BY sort_order ASC, create_time DESC').all();
    sites = results;
  } catch (e) {
    return new Response(`Failed to fetch data: ${e.message}`, { status: 500 });
  }

  if (!sites || sites.length === 0) {
    return new Response('No site configuration found.', { status: 404 });
  }

  const totalSites = sites.length;

  // Build category data
  const categoryMinSort = new Map();
  const categorySet = new Set();
  sites.forEach((site) => {
    const name = (site.catelog || '').trim() || '未分类';
    categorySet.add(name);
    const raw = Number(site.sort_order);
    const normalized = Number.isFinite(raw) ? raw : 9999;
    if (!categoryMinSort.has(name) || normalized < categoryMinSort.get(name)) {
      categoryMinSort.set(name, normalized);
    }
  });

  const categoryOrderMap = new Map();
  try {
    const { results: orderRows } = await env.NAV_DB.prepare('SELECT catelog, sort_order FROM category_orders').all();
    orderRows.forEach(row => categoryOrderMap.set(row.catelog, normalizeSortOrder(row.sort_order)));
  } catch (error) {
    if (!/no such table/i.test(error.message || '')) {
      return new Response(`Failed to fetch category orders: ${error.message}`, { status: 500 });
    }
  }

  const catalogsWithMeta = Array.from(categorySet).map((name) => {
    const fallbackSort = categoryMinSort.has(name) ? normalizeSortOrder(categoryMinSort.get(name)) : 9999;
    const order = categoryOrderMap.has(name) ? categoryOrderMap.get(name) : fallbackSort;
    return { name, order, fallback: fallbackSort };
  });

  catalogsWithMeta.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.fallback !== b.fallback) return a.fallback - b.fallback;
    return a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' });
  });

  const catalogs = catalogsWithMeta.map(item => item.name);

  const requestedCatalog = (catalog || '').trim();
  const catalogExists = Boolean(requestedCatalog && catalogs.includes(requestedCatalog));
  const currentCatalog = catalogExists ? requestedCatalog : catalogs[0];
  const currentSites = catalogExists
    ? sites.filter(s => ((s.catelog || '').trim() || '未分类') === currentCatalog)
    : sites;

  const catalogLinkMarkup = catalogs.map((cat) => {
    const safeCat = escapeHTML(cat);
    const encodedCat = encodeURIComponent(cat);
    const isActive = catalogExists && cat === currentCatalog;
    const itemClass = isActive ? 'active' : '';
    return `<li class="nav-item ${itemClass}">
      <a href="?catalog=${encodedCat}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        ${safeCat}
      </a>
    </li>`;
  }).join('');

  const datalistOptions = catalogs.map(cat => `<option value="${escapeHTML(cat)}">`).join('');
  const headingPlainText = catalogExists
    ? `${currentCatalog} · ${currentSites.length} 个网站`
    : `全部收藏 · ${sites.length} 个网站`;
  const headingText = escapeHTML(headingPlainText);
  const headingDefaultAttr = escapeHTML(headingPlainText);
  const headingActiveAttr = catalogExists ? escapeHTML(currentCatalog) : '';
  const submissionEnabled = isSubmissionEnabled(env);

  // Render site cards
  const siteCardsHtml = currentSites.map((site) => {
    const rawName = site.name || '未命名';
    const rawDesc = site.desc || '暂无描述';
    const normalizedUrl = sanitizeUrl(site.url);
    const hrefValue = escapeHTML(normalizedUrl || '#');
    const displayUrlText = normalizedUrl || site.url || '';
    const safeDisplayUrl = displayUrlText ? escapeHTML(displayUrlText) : '未提供链接';
    const dataUrlAttr = escapeHTML(normalizedUrl || '');
    const logoUrl = sanitizeUrl(site.logo);
    const cardInitial = escapeHTML((rawName.trim().charAt(0) || '站').toUpperCase());
    const safeName = escapeHTML(rawName);
    const safeCatalog = escapeHTML(site.catelog || '未分类');
    const safeDesc = escapeHTML(rawDesc);
    const safeDataName = escapeHTML(site.name || '');
    const safeDataCatalog = escapeHTML(site.catelog || '');
    const hasValidUrl = Boolean(normalizedUrl);
    return `<a href="${hrefValue}" ${hasValidUrl ? 'target="_blank" rel="noopener noreferrer"' : ''} class="site-card" data-id="${site.id}" data-name="${safeDataName}" data-url="${dataUrlAttr}" data-catalog="${safeDataCatalog}">
      <div class="site-card-header">
        ${logoUrl
          ? `<img src="${escapeHTML(logoUrl)}" alt="${safeName}" class="site-logo">`
          : `<div class="site-logo-placeholder">${cardInitial}</div>`
        }
        <div class="site-info">
          <div class="site-name" title="${safeName}">${safeName}</div>
          <span class="site-category">${safeCatalog}</span>
        </div>
      </div>
      <p class="site-desc" title="${safeDesc}">${safeDesc}</p>
      <div class="site-footer">
        <span class="site-url" title="${safeDisplayUrl}">${safeDisplayUrl}</span>
        <button class="copy-btn" data-url="${dataUrlAttr}" ${hasValidUrl ? '' : 'disabled'}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          复制
        </button>
      </div>
    </a>`;
  }).join('');

  const html = buildPageHtml({
    totalSites, catalogs, catalogExists, catalogLinkMarkup,
    datalistOptions, headingText, headingDefaultAttr, headingActiveAttr,
    submissionEnabled, siteCardsHtml
  });

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function buildPageHtml({ totalSites, catalogs, catalogExists, catalogLinkMarkup, datalistOptions, headingText, headingDefaultAttr, headingActiveAttr, submissionEnabled, siteCardsHtml }) {
  return renderTemplate(frontendTemplate, {
    ALL_LINK_CLASS: catalogExists ? '' : 'active',
    CATALOG_LINKS: catalogLinkMarkup,
    SUBMISSION_ACTION: buildSubmissionActionHtml(submissionEnabled),
    TOTAL_SITES: String(totalSites),
    CATALOG_COUNT: String(catalogs.length),
    HEADING_DEFAULT_ATTR: headingDefaultAttr,
    HEADING_ACTIVE_ATTR: headingActiveAttr,
    HEADING_TEXT: headingText,
    SITE_CARDS: siteCardsHtml,
    CURRENT_YEAR: String(new Date().getFullYear()),
    ADD_SITE_MODAL: buildAddSiteModalHtml(submissionEnabled, datalistOptions),
  });
}

function buildSubmissionActionHtml(submissionEnabled) {
  return submissionEnabled ? `<button id="addSiteBtnSidebar" class="btn-submit">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          添加新书签
        </button>` : `<div style="padding: 12px 16px; font-size: 0.8125rem; color: var(--color-text-muted); background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md);">访客书签提交功能已关闭</div>`;
}

function buildAddSiteModalHtml(submissionEnabled, datalistOptions) {
  if (!submissionEnabled) return '';
  return `<div id="addSiteModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">添加新书签</h2>
        <button id="closeModal" class="modal-close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form id="addSiteForm">
        <div class="modal-body">
          <div class="form-group">
            <label for="addSiteName" class="form-label">名称</label>
            <input type="text" id="addSiteName" class="form-input" required>
          </div>
          <div class="form-group">
            <label for="addSiteUrl" class="form-label">网址</label>
            <input type="text" id="addSiteUrl" class="form-input" required>
          </div>
          <div class="form-group">
            <label for="addSiteLogo" class="form-label">Logo（可选）</label>
            <input type="text" id="addSiteLogo" class="form-input">
          </div>
          <div class="form-group">
            <label for="addSiteDesc" class="form-label">描述（可选）</label>
            <textarea id="addSiteDesc" class="form-textarea" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label for="addSiteCatelog" class="form-label">分类</label>
            <input type="text" id="addSiteCatelog" class="form-input" required list="catalogList">
            <datalist id="catalogList">${datalistOptions}</datalist>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="cancelAddSite" class="btn btn-secondary">取消</button>
          <button type="submit" class="btn btn-primary">提交</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderTemplate(template, values) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
  });
}
