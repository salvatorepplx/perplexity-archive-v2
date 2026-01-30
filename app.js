// The Perplexity Archive - Application
let archiveData = null;
let allArticles = [];

document.addEventListener('DOMContentLoaded', () => initApp());

async function initApp() {
    initSearch();
    await loadArchiveData();
}

async function loadArchiveData() {
    try {
        const [indexRes, statsRes] = await Promise.all([
            fetch('./api/articles/index.json').catch(() => null),
            fetch('./api/stats.json').catch(() => null)
        ]);
        
        if (indexRes?.ok && statsRes?.ok) {
            const indexData = await indexRes.json();
            const stats = await statsRes.json();
            
            archiveData = { stats, articles: indexData.articles };
            allArticles = indexData.articles;
            
            console.log(`Loaded ${allArticles.length} articles`);
            updateStats(stats);
            updateCategoryCounts(stats.categories || []);
            
            if (allArticles.length > 0) {
                const featured = allArticles.reduce((best, curr) => 
                    (curr.confidence_score || 0) > (best.confidence_score || 0) ? curr : best
                , allArticles[0]);
                renderFeatured(featured);
            }
        }
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

function updateStats(stats) {
    if (!stats) return;
    document.querySelectorAll('.stat-number').forEach(el => {
        const type = el.dataset.stat;
        let value = 0;
        if (type === 'articles') value = stats.article_count || 0;
        else if (type === 'sources') value = stats.source_count || 0;
        else if (type === 'categories') value = stats.category_count || 0;
        
        if (value) {
            el.dataset.count = value;
            animateCounter(el, value);
        }
    });
    
    const footer = document.getElementById('footerArticleCount');
    if (footer) footer.textContent = `${(stats.article_count || 0).toLocaleString()} articles indexed`;
}

function updateCategoryCounts(categories) {
    const map = {};
    categories.forEach(c => map[c.category] = c.count);
    
    document.querySelectorAll('.topic-card').forEach(card => {
        const name = card.querySelector('.topic-name')?.textContent;
        if (name && map[name]) {
            const countEl = card.querySelector('.topic-count');
            if (countEl) countEl.textContent = `${map[name]} articles`;
        }
    });
}

function renderFeatured(article) {
    const container = document.getElementById('featuredArticle');
    if (!container || !article) return;
    
    const confClass = article.confidence_score >= 80 ? 'high' : 'medium';
    const score = typeof article.confidence_score === 'number' && article.confidence_score < 1 
        ? Math.round(article.confidence_score * 100) 
        : article.confidence_score;
    
    container.innerHTML = `
        <div class="article-header">
            <div class="article-meta">
                <span class="article-category">${escapeHtml(article.category)}</span>
                <span class="confidence-badge ${confClass}">${score}% Confidence</span>
            </div>
            <h3 class="article-title">${escapeHtml(article.title)}</h3>
            <p class="article-excerpt">${escapeHtml(article.excerpt || '')}</p>
        </div>
        <div class="article-footer" style="padding: 24px 40px; border-top: 1px solid var(--border);">
            <span style="color: var(--text-muted); font-size: 14px;">
                ${article.source_count || 0} verified sources
            </span>
            <button class="search-btn" onclick="viewArticle('${article.slug}')" style="margin-left: auto;">
                Read Article
            </button>
        </div>
    `;
}

function initSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');
    
    btn?.addEventListener('click', handleSearch);
    input?.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });
    
    document.querySelectorAll('.suggestion').forEach(s => {
        s.addEventListener('click', () => {
            if (input) input.value = s.dataset.query;
            handleSearch();
        });
    });
}

async function handleSearch() {
    const query = document.getElementById('searchInput')?.value.trim();
    if (!query || !allArticles.length) return;
    
    const q = query.toLowerCase();
    const results = allArticles.filter(a => 
        a.title.toLowerCase().includes(q) ||
        (a.excerpt?.toLowerCase().includes(q)) ||
        (a.category?.toLowerCase().includes(q))
    );
    
    if (results.length > 0) {
        renderFeatured(results[0]);
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        showToast(`Found ${results.length} result${results.length > 1 ? 's' : ''}`);
    } else {
        showToast(`No results for "${query}"`);
    }
}

function viewArticle(slug) {
    window.location.href = `article.html?slug=${encodeURIComponent(slug)}`;
}

function animateCounter(el, target) {
    const duration = 1500;
    const start = performance.now();
    
    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed; bottom: 32px; left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #13343B; color: white;
        padding: 16px 24px; border-radius: 12px;
        font-size: 15px; font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 1000; opacity: 0;
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}