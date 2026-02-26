const BASE_API_URL = "https://api.acronical.uk/";
const PROJECTS_API_ENDPOINT = `${BASE_API_URL}projects`;
const CLIENTS_API_ENDPOINT = `${BASE_API_URL}experience`;
const SERVICES_API_ENDPOINT = `${BASE_API_URL}services`;
const LANYARD_WEBSOCKET_URL = "wss://lanyard.acronical.uk/socket";
const DISCORD_USER_ID = "627045949998497792";

let servicesData = [];
let servicesStatusChecked = false;
let isTransitioning = false;
let lanyardSocket;

function openTab(evt, tabName) {
    if (isTransitioning) return;

    const newTab = document.getElementById(tabName);
    const tablinks = document.querySelectorAll('.tab-link');
    let currentTab = null;

    document.querySelectorAll('.tab-content').forEach(tab => {
        if (tab.style.display !== 'none' && !tab.classList.contains('tab-fade-out')) {
            currentTab = tab;
        }
    });

    if (currentTab === newTab) return;

    isTransitioning = true;
    tablinks.forEach(link => link.classList.remove('active'));

    if (evt && evt.currentTarget && evt.currentTarget.classList.contains('tab-link')) {
        evt.currentTarget.classList.add('active');
    }

    const showNewTab = () => {
        newTab.style.display = 'block';
        newTab.classList.add('tab-fade-in');
        observeAnimations(newTab);
        newTab.addEventListener('animationend', () => {
            newTab.classList.remove('tab-fade-in');
            isTransitioning = false;
        }, { once: true });
    };

    if (currentTab) {
        currentTab.classList.add('tab-fade-out');
        currentTab.addEventListener('animationend', () => {
            currentTab.style.display = 'none';
            currentTab.classList.remove('tab-fade-out');
            showNewTab();
        }, { once: true });
    } else {
        showNewTab();
    }

    if (tabName === 'Services' && !servicesStatusChecked) {
        checkAllServicesStatus();
        servicesStatusChecked = true;
    }
}

function renderError(container, message, colSpan = 1) {
    if (!container) return;
    container.innerHTML = `
        <div class="md:col-span-${colSpan} flex flex-col items-center justify-center gap-2 p-8 text-center" style="color: var(--error-color);">
            <i data-feather="alert-triangle" class="w-10 h-10"></i>
            <p>${message}</p>
        </div>
    `;
    feather.replace();
}

async function fetchAndRenderServices() {
    const container = document.getElementById('service-status-list');
    if (!container) return;

    try {
        const response = await fetch(SERVICES_API_ENDPOINT);
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
        servicesData = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
    } catch (error) {
        renderError(container, "Could not load services.");
        return;
    }

    container.innerHTML = '';
    servicesData.forEach(service => {
        const row = document.createElement('div');
        row.className = "status-row flex items-center justify-between p-4 rounded-lg anim-fade-in-up";

        const statusClass = service.online ? 'status-dot-current' : 'status-dot-past';
        const statusText = service.online ? 'Online' : 'Offline';
        const textClass = service.online ? 'status-text-current' : 'status-text-past';

        row.innerHTML = `
            <span class="font-medium" style="color: var(--text-primary);">${service.name}</span>
            <div id="status-${service.id}" class="flex items-center gap-2">
                <div class="status-dot w-3 h-3 ${statusClass} rounded-full"></div>
                <span class="status-text font-bold ${textClass}">${statusText}</span>
            </div>
        `;
        container.appendChild(row);
    });
    observeAnimations(container);
}

async function checkServiceStatus(service) {
    const statusContainer = document.getElementById(`status-${service.id}`);
    if (!statusContainer) return;

    const dot = statusContainer.querySelector('.status-dot');
    const text = statusContainer.querySelector('.status-text');

    if (!service.online) {
        setServiceUI(dot, text, 'offline');
        return;
    }

    const urls = [service.uptimeURL, service.altUptimeURL].filter(Boolean);
    let success = false;

    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { mode: 'no-cors', cache: 'no-cache', signal: controller.signal });
            clearTimeout(timeoutId);
            success = true;
            break;
        } catch (e) {
            continue;
        }
    }

    setServiceUI(dot, text, success ? 'online' : 'failed');
}

function setServiceUI(dot, text, state) {
    dot.classList.remove('animate-pulse', 'status-dot-current', 'status-dot-past', 'status-dot-checking');
    text.classList.remove('status-text-current', 'status-text-past');
    text.style.color = '';

    if (state === 'online') {
        dot.classList.add('status-dot-current');
        text.classList.add('status-text-current');
        text.textContent = 'Online';
    } else if (state === 'offline') {
        dot.classList.add('status-dot-past');
        text.classList.add('status-text-past');
        text.textContent = 'Decommissioned';
    } else if (state === 'failed') {
        dot.classList.add('status-dot-past');
        text.classList.add('status-text-past');
        text.textContent = 'Failed to Connect';
    } else if (state === 'checking') {
        dot.classList.add('status-dot-checking', 'animate-pulse');
        text.textContent = 'Checking...';
        text.style.color = 'var(--text-secondary)';
    }
}

function checkAllServicesStatus() {
    servicesData.forEach(service => {
        const container = document.getElementById(`status-${service.id}`);
        if (container) setServiceUI(container.querySelector('.status-dot'), container.querySelector('.status-text'), 'checking');
        checkServiceStatus(service);
    });
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
}, { threshold: 0.1 });

function observeAnimations(container) {
    container.querySelectorAll('.anim-fade-in-up').forEach((el, index) => {
        el.classList.remove('is-visible');
        el.style.transitionDelay = `${index * 100}ms`;
        observer.observe(el);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const notification = document.getElementById('copy-notification');
        if (notification) {
            notification.style.opacity = '1';
            setTimeout(() => notification.style.opacity = '0', 2000);
        }
    });
}

async function fetchAndRenderProjects() {
    const container = document.getElementById('project-grid-container');
    if (!container) return;

    try {
        const response = await fetch(PROJECTS_API_ENDPOINT);
        const data = await response.json();
        const projects = Object.values(data);

        container.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'card p-5 rounded-lg card-hover-effect anim-fade-in-up flex flex-col';

            const tagMap = {
                'video-plugin': { bg: 'var(--tag-video-bg)', text: 'var(--tag-video-text)' },
                'plugin': { bg: 'var(--tag-plugin-bg)', text: 'var(--tag-plugin-text)' },
                'discord-bot': { bg: 'var(--tag-discord-bg)', text: 'var(--tag-discord-text)' }
            };
            const theme = tagMap[project.type] || { bg: 'var(--tag-default-bg)', text: 'var(--tag-default-text)' };

            let actions = '';
            if (project.download?.has) actions += `<a href="${project.download.url}" target="_blank" class="action-button inline-flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-md"><i data-feather="download" class="w-4 h-4"></i>Download</a>`;
            if (project.invite?.has) actions += `<a href="${project.invite.url}" target="_blank" class="action-button inline-flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-md"><i data-feather="arrow-right-circle" class="w-4 h-4"></i>Invite</a>`;
            if (project.link?.has) actions += `<a href="${project.link.url || project.link.link}" target="_blank" class="action-button inline-flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-md"><i data-feather="external-link" class="w-4 h-4"></i>View</a>`;

            card.innerHTML = `
                <div class="flex-grow">
                    <h4 class="font-bold text-lg" style="color: var(--text-primary);">${project.name}</h4>
                    <p class="text-sm mt-2 mb-4">${project.description || project.descrtiption || ''}</p>
                </div>
                <div class="flex-shrink-0 mt-auto">
                    <div class="flex items-center justify-between">
                        <span class="project-tag inline-block px-2 py-1 rounded capitalize text-xs" style="background-color: ${theme.bg}; color: ${theme.text};">${project.type.replace('-', ' ')}</span>
                        <div class="flex gap-2">${actions}</div>
                    </div>
                </div>`;
            container.appendChild(card);
        });
        feather.replace();
        observeAnimations(container);
    } catch (e) {
        renderError(container, "Failed to load projects.", 3);
    }
}

async function fetchAndRenderClients() {
    const container = document.getElementById('client-grid-container');
    if (!container) return;

    try {
        const response = await fetch(CLIENTS_API_ENDPOINT);
        const data = await response.json();
        const clients = Object.values(data);

        container.innerHTML = '';
        clients.forEach(client => {
            const card = document.createElement('div');
            card.className = 'card p-5 rounded-lg anim-fade-in-up flex flex-col';

            const dateStr = client.start ? (client.end ? `${client.start} &ndash; ${client.end}` : `Since ${client.start}`) : '';
            const statusLabel = client.left ? 'Past Work' : 'Current Work';
            const statusClass = client.left ? 'status-text-past' : 'status-text-current';
            const dotClass = client.left ? 'status-dot-past' : 'status-dot-current animate-pulse';

            card.innerHTML = `
                <div class="flex-grow">
                    <div class="flex justify-between items-start">
                         <a href="${client.link}" target="_blank" class="font-bold text-lg contact-link transition-colors" style="color: var(--text-primary);">${client.entity}</a>
                         <span class="text-xs flex-shrink-0 ml-4">${dateStr}</span>
                    </div>
                    <p class="text-sm mt-2 mb-4">${client.description || ''}</p>
                </div>
                <div class="flex-shrink-0 mt-auto pt-4 border-t border-white/5">
                    <div class="flex items-center gap-2 text-sm">
                        <div class="w-2 h-2 ${dotClass} rounded-full"></div>
                        <span class="${statusClass}">${statusLabel}</span>
                    </div>
                </div>`;
            container.appendChild(card);
        });
        observeAnimations(container);
    } catch (e) {
        renderError(container, "Failed to load experience.", 2);
    }
}

function connectLanyard() {
    lanyardSocket = new WebSocket(LANYARD_WEBSOCKET_URL);
    lanyardSocket.onopen = () => lanyardSocket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
    lanyardSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.op === 1) setInterval(() => lanyardSocket.send(JSON.stringify({ op: 3 })), data.d.heartbeat_interval);
        if (data.op === 0) updateProfileCard(data.d);
    };
    lanyardSocket.onclose = () => setTimeout(connectLanyard, 5000);
}

function updateProfileCard(data) {
    if (!data?.discord_user) return;

    const user = data.discord_user;
    const avatar = document.getElementById('profile-avatar');
    avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`;
    document.getElementById('profile-username').textContent = user.username;

    const statusMap = {
        online: 'var(--status-dot-online)',
        idle: 'var(--status-dot-idle)',
        dnd: 'var(--status-dot-dnd)',
        offline: 'var(--status-dot-offline)'
    };
    const dot = document.getElementById('profile-status-dot');
    dot.style.backgroundColor = statusMap[data.discord_status] || statusMap.offline;
    document.getElementById('profile-status-text').textContent = data.discord_status;

    const spotify = data.spotify;
    const spotifyEl = document.getElementById('spotify-section');
    if (spotify) {
        spotifyEl.style.display = 'block';
        document.getElementById('spotify-song').textContent = spotify.song;
        document.getElementById('spotify-artist').textContent = `by ${spotify.artist}`;
        document.getElementById('spotify-album-art').src = spotify.album_art_url;
    } else {
        spotifyEl.style.display = 'none';
    }

    const activity = data.activities.find(a => a.type === 0) || data.activities.find(a => a.type === 4);
    const activityEl = document.getElementById('activity-section');
    if (activity) {
        activityEl.style.display = 'block';
        const isGame = activity.type === 0;
        document.getElementById('activity-title').textContent = isGame ? 'PLAYING' : 'STATUS';
        document.getElementById('activity-name').textContent = isGame ? activity.name : (activity.state || '');
        document.getElementById('activity-details').textContent = activity.details || '';
        document.getElementById('activity-state').textContent = isGame ? (activity.state || '') : '';
        const img = document.getElementById('activity-large-image');
        if (isGame && activity.assets?.large_image) {
            img.style.display = 'block';
            img.src = activity.assets.large_image.startsWith('mp:external')
                ? activity.assets.large_image.replace(/mp:external\/.*\/https\//, 'https://')
                : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
        } else {
            img.style.display = 'none';
        }
    } else {
        activityEl.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const mainLayout = document.getElementById('main-layout-container');

    const setAppTheme = (theme) => {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        sunIcon?.classList.toggle('hidden', isDark);
        moonIcon?.classList.toggle('hidden', !isDark);
        localStorage.setItem('theme', theme);
    };

    themeToggle?.addEventListener('click', () => setAppTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'));
    setAppTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    fetchAndRenderProjects();
    fetchAndRenderClients();
    fetchAndRenderServices();
    connectLanyard();

    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            mainLayout.classList.replace('welcome-view', 'content-view');
            openTab(e, btn.dataset.tab);
        });
    });

    document.getElementById('home-button')?.addEventListener('click', () => {
        mainLayout.classList.replace('content-view', 'welcome-view');
        const activeTab = document.querySelector('.tab-content[style*="display: block"]');
        if (activeTab) {
            isTransitioning = true;
            document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
            activeTab.classList.add('tab-fade-out');
            activeTab.addEventListener('animationend', () => {
                activeTab.style.display = 'none';
                activeTab.classList.remove('tab-fade-out');
                isTransitioning = false;
            }, { once: true });
        }
    });
});