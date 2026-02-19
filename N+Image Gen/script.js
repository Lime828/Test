/**
 * AVDTech N+ AI Content Engine
 * FINAL VERSION - Loads ALL 1000 hooks from part files
 */

// App data
let appData = {
    hooks: [],
    categories: ['ALL'],
    selectedCategory: 'ALL',
    searchTerm: '',
    selectedHook: null,
    apiKey: localStorage.getItem('gemini_api_key') || sessionStorage.getItem('gemini_api_key') || ''
};

// DOM Elements
const el = {
    searchInput: document.getElementById('search-input'),
    filterBtn: document.getElementById('filter-btn'),
    dropdownMenu: document.getElementById('dropdown-menu'),
    hookList: document.getElementById('hook-list'),
    emptyState: document.getElementById('empty-state'),
    loader: document.getElementById('loader'),
    results: document.getElementById('results'),
    selectedCategoryText: document.getElementById('selected-category-text'),
    chevronIcon: document.getElementById('chevron-icon'),
    resultHookText: document.getElementById('result-hook-text'),
    resultHookCat: document.getElementById('result-hook-cat'),
    resultHookEmotion: document.getElementById('result-hook-emotion'),
    postContent: document.getElementById('post-content'),
    imagePrompt: document.getElementById('image-prompt'),
    motionPrompt: document.getElementById('motion-prompt'),
    copyPostBtn: document.getElementById('copy-post-btn'),
    copyImageBtn: document.getElementById('copy-image-btn'),
    copyMotionBtn: document.getElementById('copy-motion-btn'),
    createImageBtn: document.getElementById('create-image-btn'),
    logoutBtn: document.getElementById('logout-btn')
};

// Initialize app
async function init() {
    console.log('Starting app...');

    // Check if API key exists
    if (!appData.apiKey) {
        console.log('No API key found, redirecting to auth page...');
        window.location.href = 'api key.html';
        return;
    }

    // Update API preview if element exists
    const keyPreview = document.getElementById('api-key-preview');
    if (keyPreview) {
        keyPreview.innerText = appData.apiKey.substring(0, 6) + '...' + appData.apiKey.substring(appData.apiKey.length - 4);
    }

    console.log('Found saved API key, validating...');

    // Validate the saved API key
    const isValid = await validateGeminiKey(appData.apiKey);

    if (!isValid) {
        console.log('Saved API key is invalid');
        localStorage.removeItem('gemini_api_key');
        sessionStorage.removeItem('gemini_api_key');
        window.location.href = 'api key.html';
        return;
    }

    console.log('API key is valid');

    // Setup logout button
    if (el.logoutBtn) {
        el.logoutBtn.addEventListener('click', handleLogout);
    }

    // Show loading state
    if (el.hookList) {
        el.hookList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-slate-400);">Checking hook database...</div>';
    }

    // Load ALL hooks from part files or window
    await loadAllHookFiles();

    // Verify we have all hooks
    console.log(`✅ TOTAL HOOKS LOADED: ${appData.hooks.length}`);

    if (appData.hooks.length === 0) {
        if (el.hookList) {
            el.hookList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #ef4444;">
                    <i data-lucide="alert-circle" size="32" style="margin-bottom: 1rem;"></i>
                    <p>Failed to load hooks.</p>
                    <p style="font-size: 11px; margin-top: 0.5rem; color: var(--text-slate-500);">
                        Make sure hooks_data.js or hooks_part1.json through hooks_part10.json exist in the same folder.
                    </p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--orange-500); border: none; border-radius: 0.5rem; color: white; cursor: pointer;">Retry Loading</button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons({ scope: el.hookList });
        }
        return;
    }

    // Add hook counter to UI
    addHookCounter();

    // Render UI
    renderCategories();
    renderHooks();

    // Setup main app listeners
    setupMainListeners();

    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('App initialized successfully with', appData.hooks.length, 'hooks!');
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout and clear your API key?')) {
        localStorage.removeItem('gemini_api_key');
        sessionStorage.removeItem('gemini_api_key');
        window.location.href = 'api key.html';
    }
}

// Validate Gemini API key
async function validateGeminiKey(apiKey) {
    try {
        // Use a 5-second timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.error('API validation error:', error);
        // If it's a network error (like CORS blocked on file://), we might want to assume it's valid if we already have it?
        // But better to be safe. If we can't talk to Google, we can't use the AI anyway.
        return false;
    }
}

// Load ALL hook files
async function loadAllHookFiles() {
    appData.hooks = [];
    let categoriesSet = new Set();

    // Priority 1: Check if hooks are preloaded via hooks_data.js
    if (window.ALL_HOOKS && Array.isArray(window.ALL_HOOKS) && window.ALL_HOOKS.length > 0) {
        console.log('✅ Found preloaded hooks in window.ALL_HOOKS');
        appData.hooks = window.ALL_HOOKS;

        appData.hooks.forEach(hook => {
            if (hook.category) categoriesSet.add(hook.category);
        });

        if (categoriesSet.size > 0) {
            appData.categories = ['ALL', ...Array.from(categoriesSet).sort()];
        }
        return;
    }

    // Priority 2: Fallback to individual part files (fetch)
    console.log('Falling back to individual part files...');
    let loadedParts = 0;

    for (let i = 1; i <= 10; i++) {
        try {
            const filename = `hooks_part${i}.json`;
            const response = await fetch(filename);

            if (response.ok) {
                const data = await response.json();

                if (data.video_hooks && Array.isArray(data.video_hooks)) {
                    const hooksFromFile = data.video_hooks;
                    appData.hooks = [...appData.hooks, ...hooksFromFile];
                    loadedParts++;

                    hooksFromFile.forEach(hook => {
                        if (hook.category) categoriesSet.add(hook.category);
                    });

                    // Update UI with progress
                    if (el.hookList) {
                        el.hookList.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-slate-400);">Loading hooks... ${loadedParts}/10 files loaded (${appData.hooks.length} hooks)</div>`;
                    }
                }
            }
        } catch (error) {
            console.warn(`Could not fetch ${i}:`, error.message);
        }
    }

    // Set categories
    if (categoriesSet.size > 0) {
        appData.categories = ['ALL', ...Array.from(categoriesSet).sort()];
    }

    console.log(`Loaded ${loadedParts} out of 10 files via fetch, total hooks: ${appData.hooks.length}`);
}

// Add hook counter to sidebar
function addHookCounter() {
    if (document.getElementById('hook-counter')) return;

    const counter = document.createElement('div');
    counter.id = 'hook-counter';
    counter.style.cssText = `
        padding: 0.75rem 1.5rem;
        font-size: 12px;
        color: var(--text-slate-400);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid var(--glass-border);
        background: rgba(255,255,255,0.02);
    `;

    const totalHooks = appData.hooks.length;
    const uniqueCategories = appData.categories.length - 1;

    counter.innerHTML = `
        <span style="background: var(--orange-500); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: 700; font-size: 11px;">${totalHooks}</span>
        <span style="font-weight: 500;">Total Hooks</span>
        <span style="margin-left: auto; background: var(--glass); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 11px;">${uniqueCategories} Categories</span>
    `;

    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.after(counter);
    }
}

// Setup main app event listeners
function setupMainListeners() {
    if (el.searchInput) {
        el.searchInput.addEventListener('input', (e) => {
            appData.searchTerm = e.target.value.toLowerCase();
            renderHooks();
        });
    }

    if (el.filterBtn) {
        el.filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (el.dropdownMenu) {
                el.dropdownMenu.classList.toggle('show');
                if (el.chevronIcon) {
                    el.chevronIcon.style.transform = el.dropdownMenu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        const dropdownParent = document.getElementById('dropdown-parent');
        if (dropdownParent && !dropdownParent.contains(e.target)) {
            if (el.dropdownMenu) {
                el.dropdownMenu.classList.remove('show');
                if (el.chevronIcon) {
                    el.chevronIcon.style.transform = 'rotate(0deg)';
                }
            }
        }
    });

    if (el.copyPostBtn) {
        el.copyPostBtn.addEventListener('click', () => copyText(el.postContent?.innerText || '', 'post'));
    }
    if (el.copyImageBtn) {
        el.copyImageBtn.addEventListener('click', () => copyText(el.imagePrompt?.innerText || '', 'image'));
    }
    if (el.copyMotionBtn) {
        el.copyMotionBtn.addEventListener('click', () => copyText(el.motionPrompt?.innerText || '', 'motion'));
    }

    if (el.createImageBtn) {
        el.createImageBtn.addEventListener('click', () => {
            if (el.imagePrompt?.innerText && el.imagePrompt.innerText !== '...') {
                navigator.clipboard.writeText(el.imagePrompt.innerText);
                alert('✅ Image prompt copied!');
            }
            window.open('https://www.meta.ai/', '_blank');
        });
    }
}

// Render categories
function renderCategories() {
    if (!el.dropdownMenu) return;

    el.dropdownMenu.innerHTML = '';

    appData.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'dropdown-item';
        btn.setAttribute('data-value', cat);

        const displayName = cat === 'ALL' ? 'ALL TITLES' : cat.replace(/_/g, ' ');

        // Count hooks in this category
        let count = 0;
        if (cat === 'ALL') {
            count = appData.hooks.length;
        } else {
            count = appData.hooks.filter(h => h.category === cat).length;
        }

        btn.innerHTML = `<i data-lucide="zap" size="12"></i> ${displayName} <span style="margin-left: auto; font-size: 10px; color: var(--text-slate-500); background: rgba(255,255,255,0.05); padding: 0.125rem 0.5rem; border-radius: 1rem;">${count}</span>`;

        btn.onclick = () => {
            selectCategory(cat);
        };

        el.dropdownMenu.appendChild(btn);
    });

    // Select ALL by default
    const allBtn = el.dropdownMenu.querySelector('[data-value="ALL"]');
    if (allBtn) allBtn.classList.add('selected');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ scope: el.dropdownMenu });
    }
}

// Select category
function selectCategory(cat) {
    appData.selectedCategory = cat;
    const displayName = cat === 'ALL' ? 'ALL TITLES' : cat.replace(/_/g, ' ');
    if (el.selectedCategoryText) {
        el.selectedCategoryText.innerText = displayName;
    }
    if (el.dropdownMenu) {
        el.dropdownMenu.classList.remove('show');
    }
    if (el.chevronIcon) {
        el.chevronIcon.style.transform = 'rotate(0deg)';
    }

    document.querySelectorAll('.dropdown-item').forEach(item => {
        const value = item.getAttribute('data-value');
        if (value === cat) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    renderHooks();
}

// Render hooks - SHOWS ALL HOOKS, NO LIMITS
function renderHooks() {
    if (!el.hookList) return;

    el.hookList.innerHTML = '';

    if (appData.hooks.length === 0) {
        el.hookList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-slate-600);">No hooks loaded.</div>';
        return;
    }

    // Filter hooks based on search and category
    const filtered = appData.hooks.filter(h => {
        const matchesSearch = appData.searchTerm === '' || h.hook.toLowerCase().includes(appData.searchTerm);
        const matchesCategory = appData.selectedCategory === 'ALL' || h.category === appData.selectedCategory;
        return matchesSearch && matchesCategory;
    });

    console.log(`Showing ${filtered.length} hooks (filtered from ${appData.hooks.length} total)`);

    if (filtered.length === 0) {
        el.hookList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-slate-600);">No hooks found matching your criteria</div>';
        return;
    }

    // Create buttons for ALL filtered hooks
    filtered.forEach(hook => {
        const btn = document.createElement('button');
        btn.className = `hook-button ${appData.selectedHook?.id === hook.id ? 'selected' : ''}`;

        // Platform badge
        let platformHtml = '';
        if (hook.platform) {
            const platformClass = hook.platform.toLowerCase().replace(/\s+/g, '-');
            platformHtml = `<span class="platform-badge ${platformClass}">${hook.platform}</span>`;
        }

        // Emotion badge
        let emotionHtml = '';
        if (hook.emotion) {
            emotionHtml = `<span class="emotion-tag" style="margin-left: 4px; background: var(--orange-500);">${hook.emotion}</span>`;
        }

        btn.innerHTML = `
            <div class="hook-meta">
                <span class="hook-id">#${hook.id}</span>
                <span class="hook-category">${hook.category.replace(/_/g, ' ')}</span>
                ${platformHtml}
                ${emotionHtml}
            </div>
            <p class="hook-text">${hook.hook}</p>
            <div class="generate-hint">
                Generate Assets <i data-lucide="chevron-right" size="12"></i>
            </div>
        `;

        btn.onclick = () => handleHookClick(hook);
        el.hookList.appendChild(btn);
    });

    // Update counter if it exists
    const counter = document.getElementById('hook-counter');
    if (counter) {
        const showing = filtered.length;
        const total = appData.hooks.length;
        const categoryName = appData.selectedCategory === 'ALL' ? 'all categories' : appData.selectedCategory.replace(/_/g, ' ');
        counter.innerHTML = `
            <span style="background: var(--orange-500); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: 700; font-size: 11px;">${showing}</span>
            <span style="font-weight: 500;">Showing (${categoryName})</span>
            <span style="margin-left: auto; background: var(--glass); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 11px;">${total} Total</span>
        `;
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ scope: el.hookList });
    }
}

// Handle hook click
function handleHookClick(hook) {
    console.log('Hook clicked:', hook.id);

    appData.selectedHook = hook;
    renderHooks();

    // Show loader
    if (el.emptyState) {
        el.emptyState.classList.add('hidden');
    }
    if (el.results) {
        el.results.classList.remove('show');
    }
    if (el.loader) {
        el.loader.style.display = 'flex';
    }

    // Generate content
    setTimeout(() => {
        const result = generateContentWithFormulas(hook);
        displayResult(result, hook);
    }, 1000);
}

// Generate content
function generateContentWithFormulas(hook) {
    const fbPageLink = "https://facebook.com/AVDTechOfficial";
    const nplusLink = "https://nplus.avdtech.com";

    const imageOverlayText = getImageTextOverlay(hook);
    const emotion = hook.emotion || '';
    const platform = hook.platform || '';
    const duration = hook.duration || '';

    // Post content
    const postContent = `${hook.hook}

💔 Kaya patuloy na tumataas ang bill mo? Hindi dahil sa dami ng gamit, kundi sa "system losses" na hindi mo kontrolado. Ang appliances mo, unti-unting nasisira dahil sa unstable power factor.

✅ Ang AVDTech Power Efficiency Enhancer ang solusyon. Japanese technology, Philippine assembly, SEC registered. Hindi ito "energy saver" na magic — ito ay engineering. Isang beses lang gastos, pangmatagalan na tipid at proteksyon.

👇 Comment below, 
Message our Facebook Page (${fbPageLink}) 
or click here (${nplusLink})`;

    // Image prompt based on category
    let subject, setting, mood;

    if (hook.category.includes("Product")) {
        subject = "Filipino family with AVDTech device glowing orange-green";
        setting = "modern living room, warm golden hour lighting, family photos on wall";
        mood = emotion ? emotion.toLowerCase() : "kampante, safe, worry-free, peaceful";
    } else if (hook.category.includes("Opportunity")) {
        subject = "Filipino entrepreneur smiling holding smartphone showing earnings";
        setting = "modern home office, morning light, laptop with N+ dashboard";
        mood = emotion ? emotion.toLowerCase() : "proud, successful, inspired, excited";
    } else if (hook.category.includes("N+_System")) {
        subject = "AI robot hand shaking human hand with glowing N+ logo";
        setting = "futuristic office, blue and orange ambient lighting";
        mood = emotion ? emotion.toLowerCase() : "innovative, high-tech, trustworthy";
    } else if (hook.category.includes("Objections")) {
        subject = "SEC certificate and AVDTech product on table";
        setting = "professional office, bright natural light";
        mood = emotion ? emotion.toLowerCase() : "legitimate, trusted, confident";
    } else if (hook.category.includes("Urgency")) {
        subject = "electric meter with AVDTech device beside it glowing";
        setting = "Filipino house exterior, summer afternoon, heat haze";
        mood = emotion ? emotion.toLowerCase() : "urgent, hot, need action now";
    } else {
        subject = "Filipino family relaxing at home with AVDTech device";
        setting = "cozy living room, warm soft lighting";
        mood = emotion ? emotion.toLowerCase() : "happy, relaxed, grateful";
    }

    let platformGuidance = '';
    if (platform) {
        platformGuidance = `Optimized for ${platform} ${duration ? `(${duration})` : ''}. `;
    }

    const imagePrompt = `[S] = ${subject}
[C] = ${setting}
[E] = ${mood}

${platformGuidance}Add a short "${imageOverlayText}" text overlay on the image, 2-5 words only, big bold font, white with dark shadow, easy to read on mobile, positioned in upper third with padding from edges.

Photorealistic, 4K, highly detailed`;

    // Motion prompt
    let movement, continuation, effect;

    if (hook.category.includes("Product")) {
        movement = "Slow cinematic zoom towards the AVDTech device";
        continuation = "Energy pulses gently expand outward in waves across the room";
        effect = "Warm glow intensifies, floating particles catch the light, golden hour atmosphere";
    } else if (hook.category.includes("Opportunity")) {
        movement = "Gentle push-in towards the smiling entrepreneur";
        continuation = "Phone screen transitions showing growing earnings graph";
        effect = "Sparkles of success, warm inspiring glow, bokeh lights in background";
    } else if (hook.category.includes("N+_System")) {
        movement = "Dynamic orbit around the AI handshake";
        continuation = "Data streams flow between hands, N+ logo pulses";
        effect = "Futuristic blue-orange glow, particle effects, cinematic lens flare";
    } else if (hook.category.includes("Urgency")) {
        movement = "Rapid zoom towards electric meter spinning fast";
        continuation = "Numbers climb rapidly, heat waves distort air";
        effect = "Red warning glow pulses, urgent dramatic lighting";
    } else {
        movement = "Slow, smooth camera push-in towards the family";
        continuation = "They notice the device, smiles appear naturally";
        effect = "Warm golden glow intensifies with their happiness, soft particles";
    }

    if (emotion) {
        effect += `, ${emotion.toLowerCase()} mood throughout`;
    }

    const motionPrompt = `MOVEMENT: ${movement}
CONTINUATION: ${continuation}
EFFECT: ${effect}

The text overlay "${imageOverlayText}" fades in gently, big bold font, readable on mobile.

Cinematic, smooth 60fps, 4K quality`;

    return {
        postContent: postContent,
        imagePrompt: imagePrompt,
        animationPrompt: motionPrompt
    };
}

// Get text overlay
function getImageTextOverlay(hook) {
    const text = hook.hook.toLowerCase();
    const category = hook.category;

    if (category.includes("Product")) {
        if (text.includes("namumulaga") || text.includes("kuryente")) return "Tipid sa kuryente!";
        if (text.includes("protektahan") || text.includes("protect")) return "Protektado appliances!";
        if (text.includes("japanese")) return "Japanese Tech!";
        return "Power Efficiency!";
    }

    if (category.includes("Opportunity")) {
        if (text.includes("7 ways") || text.includes("7 kitaan")) return "7 kitaan!";
        if (text.includes("tulog") || text.includes("sleep")) return "Kumita kahit tulog!";
        return "Sumali na!";
    }

    if (category.includes("N+_System")) {
        if (text.includes("ai")) return "AI-powered!";
        return "N+ Automation!";
    }

    if (category.includes("Objections")) {
        if (text.includes("sec")) return "SEC Registered!";
        if (text.includes("scam")) return "Hindi scam!";
        return "Legit to!";
    }

    if (category.includes("Testimonials")) {
        if (text.includes("lugi")) return "Dati lugi, ngayon!";
        if (text.includes("₱90,000")) return "₱90K/month!";
        return "Real story!";
    }

    if (category.includes("Urgency")) {
        if (text.includes("tag-init")) return "Tag-init na!";
        return "Act now!";
    }

    if (category.includes("Educational")) {
        if (text.includes("power factor")) return "Ano ang power factor?";
        return "Alamin!";
    }

    if (category.includes("Emotional")) {
        if (text.includes("pagod")) return "Hindi ka nag-iisa!";
        return "Panatag na!";
    }

    if (category.includes("Call_To_Action")) {
        if (text.includes("director")) return "Maging Director!";
        return "Gawin na!";
    }

    return "AVDTech N+!";
}

// Display results
function displayResult(result, hook) {
    if (el.loader) {
        el.loader.style.display = 'none';
    }
    if (el.results) {
        el.results.classList.add('show');
    }

    if (el.resultHookText) {
        el.resultHookText.innerText = `"${hook.hook}"`;
    }
    if (el.resultHookCat) {
        el.resultHookCat.innerText = hook.category.replace(/_/g, ' ');
    }

    if (hook.emotion && el.resultHookEmotion) {
        el.resultHookEmotion.innerText = hook.emotion;
        el.resultHookEmotion.style.display = 'inline-block';
    } else if (el.resultHookEmotion) {
        el.resultHookEmotion.style.display = 'none';
    }

    if (el.postContent) {
        el.postContent.innerText = result.postContent;
    }
    if (el.imagePrompt) {
        el.imagePrompt.innerText = result.imagePrompt;
    }
    if (el.motionPrompt) {
        el.motionPrompt.innerText = result.animationPrompt;
    }

    if (el.results) {
        el.results.scrollIntoView({ behavior: 'smooth' });
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Copy text
function copyText(text, type) {
    if (!text || text === '...') {
        alert('Generate content first!');
        return;
    }

    navigator.clipboard.writeText(text);

    const btn = type === 'post' ? el.copyPostBtn : (type === 'image' ? el.copyImageBtn : el.copyMotionBtn);
    if (!btn) return;

    const originalHTML = btn.innerHTML;

    btn.innerHTML = '<i data-lucide="check" size="16"></i> <span>Copied!</span>';
    btn.classList.add('success');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ scope: btn });
    }

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('success');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ scope: btn });
        }
    }, 2000);
}

// Start app
document.addEventListener('DOMContentLoaded', init);