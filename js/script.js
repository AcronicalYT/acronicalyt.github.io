// --- API Configuration ---
const BASE_API_URL = "https://api.acronical.uk/";
const PROJECTS_API_ENDPOINT = `${BASE_API_URL}projects`;
const CLIENTS_API_ENDPOINT = `${BASE_API_URL}experience`;
const SERVICES_API_ENDPOINT = `${BASE_API_URL}services`;
const LANYARD_WEBSOCKET_URL = "wss://lanyard.acronical.uk/socket";
const DISCORD_USER_ID = "627045949998497792";

// --- Global State ---
let servicesData = [];
let servicesStatusChecked = false;
let isTransitioning = false;
let lanyardSocket;

// --- Tab Navigation Logic ---
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

    if (evt.currentTarget.classList.contains('tab-link')) {
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

// --- Error Rendering ---
function renderError(container, message, colSpan = 1) {
    if (!container) return;
    const colSpanClass = `md:col-span-${colSpan}`;
    container.innerHTML = `
                <div class="${colSpanClass} flex flex-col items-center justify-center gap-2 p-8 text-center" style="color: var(--error-color);">
                    <i data-feather="alert-triangle" class="w-10 h-10"></i>
                    <p>${message}</p>
                </div>
            `;
    feather.replace();
}

// --- Services/Bot Status Checking Logic ---
async function fetchAndRenderServices() {
    const container = document.getElementById('service-status-list');
    if (!container) return;

    try {
        const response = await fetch(SERVICES_API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        servicesData = Object.values(await response.json());
    } catch (error) {
        console.error("Could not fetch services from API.", error);
        renderError(container, "Could not load services. Please try again later.");
        return;
    }

    container.innerHTML = '';
    servicesData.forEach(service => {
        const serviceId = service.name.replace(/\s+/g, '-').toLowerCase();
        const row = document.createElement('div');
        row.className = "status-row flex items-center justify-between p-4 rounded-lg anim-fade-in-up";

        const initialStatus = service.online
            ? { dot: 'status-dot-current', text: 'Online', textColor: 'status-text-current' }
            : { dot: 'status-dot-past', text: 'Offline', textColor: 'status-text-past' };

        row.innerHTML = `
                    <span class="font-medium" style="color: var(--text-primary);">${service.name}</span>
                    <div id="status-${serviceId}" class="flex items-center gap-2">
                        <div class="status-dot w-3 h-3 ${initialStatus.dot} rounded-full"></div>
                        <span class="status-text font-bold ${initialStatus.textColor}">${initialStatus.text}</span>
                    </div>
                `;
        container.appendChild(row);
    });
    observeAnimations(container);
}

function updateServiceStatus(serviceName, isOnline) {
    const serviceId = serviceName.replace(/\s+/g, '-').toLowerCase();
    const statusContainer = document.getElementById(`status-${serviceId}`);
    if (!statusContainer) return;

    const dot = statusContainer.querySelector('.status-dot');
    const text = statusContainer.querySelector('.status-text');

    dot.className = 'status-dot w-3 h-3 rounded-full'; // Reset classes
    text.className = 'status-text font-bold'; // Reset classes

    if (isOnline) {
        dot.classList.add('status-dot-current');
        text.textContent = 'Online';
        text.classList.add('status-text-current');
    } else {
        dot.classList.add('status-dot-past');
        text.textContent = 'Offline';
        text.classList.add('status-text-past');
    }
}

async function checkServiceStatus(service) {
    try {
        const response = await fetch(service.uptimeURL, { cache: 'no-cache' });
        if (response.ok) {
            updateServiceStatus(service.name, true);
            return;
        }
    } catch (error) {
        console.log(`Primary URL for ${service.name} failed, trying alternate.`);
    }

    try {
        const response = await fetch(service.altUptimeURL, { cache: 'no-cache' });
        updateServiceStatus(service.name, response.ok);
    } catch (error) {
        console.error(`Both URLs for ${service.name} failed.`);
        updateServiceStatus(service.name, false);
    }
}

function checkAllServicesStatus() {
    servicesData.forEach(service => {
        const serviceId = service.name.replace(/\s+/g, '-').toLowerCase();
        const statusContainer = document.getElementById(`status-${serviceId}`);
        if (statusContainer) {
            const dot = statusContainer.querySelector('.status-dot');
            const text = statusContainer.querySelector('.status-text');
            dot.classList.add('animate-pulse');
            text.textContent = 'Checking...';
            text.style.color = 'var(--text-secondary)';
        }
        checkServiceStatus(service);
    });
}

// --- Animation on Scroll Logic ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
        }
    });
}, { threshold: 0.1 });

function observeAnimations(container) {
    const elementsToAnimate = container.querySelectorAll('.anim-fade-in-up');
    elementsToAnimate.forEach((el, index) => {
        el.classList.remove('is-visible');
        el.style.transitionDelay = `${index * 100}ms`;
        observer.observe(el);
    });
}

// --- Copy to Clipboard ---
function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        const notification = document.getElementById('copy-notification');
        notification.style.opacity = '1';
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
}

// --- API Data Fetching for Projects ---
async function fetchAndRenderProjects() {
    const container = document.getElementById('project-grid-container');
    if (!container) return;

    let projects = [];
    try {
        const response = await fetch(PROJECTS_API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        projects = Object.values(data);
    } catch (error) {
        console.error("Could not fetch projects from API.", error);
        renderError(container, "Could not load projects. Please try again later.", 3);
        return;
    }

    container.innerHTML = '';

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'card p-5 rounded-lg card-hover-effect anim-fade-in-up flex flex-col';

        const tagVars = {
            'video-plugin': { bg: 'var(--tag-video-bg)', text: 'var(--tag-video-text)' },
            'plugin': { bg: 'var(--tag-plugin-bg)', text: 'var(--tag-plugin-text)' },
            'discord-bot': { bg: 'var(--tag-discord-bg)', text: 'var(--tag-discord-text)' }
        };
        const currentTagVars = tagVars[project.type] || { bg: 'var(--tag-default-bg)', text: 'var(--tag-default-text)' };
        const tagText = project.type.replace('-', ' ');

        let buttonsHTML = '';
        if (project.download.has) {
            buttonsHTML += `<a href="${project.download.url}" target="_blank" rel="noopener noreferrer" class="action-button inline-flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-md"><i data-feather="download" class="w-4 h-4"></i>Download</a>`;
        }
        if (project.invite.has) {
            buttonsHTML += `<a href="${project.invite.url}" target="_blank" rel="noopener noreferrer" class="action-button inline-flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-md"><i data-feather="arrow-right-circle" class="w-4 h-4"></i>Invite</a>`;
        }
        card.innerHTML = `<div class="flex-grow"><h4 class="font-bold text-lg" style="color: var(--text-primary);">${project.name}</h4><p class="text-sm mt-2 mb-4">${project.description}</p></div><div class="flex-shrink-0"><div class="flex items-center justify-between"><div class="text-xs space-x-2"><span class="project-tag inline-block px-2 py-1 rounded capitalize" style="background-color: ${currentTagVars.bg}; color: ${currentTagVars.text};">${tagText}</span></div><div class="flex gap-2">${buttonsHTML}</div></div></div>`;
        container.appendChild(card);
    });
    feather.replace();
}

// --- API Data Fetching for Clients/Experience ---
async function fetchAndRenderClients() {
    const container = document.getElementById('client-grid-container');
    if (!container) return;

    let clients = [];
    try {
        const response = await fetch(CLIENTS_API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        clients = Object.values(data);
    } catch (error) {
        console.error("Could not fetch clients from API.", error);
        renderError(container, "Could not load experience. Please try again later.", 2);
        return;
    }

    container.innerHTML = '';

    clients.forEach(client => {
        const card = document.createElement('div');
        card.className = 'card p-5 rounded-lg anim-fade-in-up flex flex-col';

        let dateRange = '';
        if (client.start && client.end) {
            dateRange = `${client.start} &ndash; ${client.end}`;
        } else if (client.start) {
            dateRange = `Since ${client.start}`;
        }

        let statusHTML = '';
        if (typeof client.left !== 'undefined') {
            if (client.left) {
                statusHTML = `<div class="flex items-center gap-2 text-sm"><div class="w-2 h-2 status-dot-past rounded-full"></div><span class="status-text-past">Past Work</span></div>`;
            } else {
                statusHTML = `<div class="flex items-center gap-2 text-sm"><div class="w-2 h-2 status-dot-current rounded-full animate-pulse"></div><span class="status-text-current">Current Work</span></div>`;
            }
        }

        let descriptionHTML = '';
        if (client.description && client.description.length > 1) {
            descriptionHTML = `<p class="text-sm mt-2 mb-4">${client.description}</p>`;
        }

        card.innerHTML = `
                    <div class="flex-grow">
                        <div class="flex justify-between items-start">
                             <a href="${client.link}" target="_blank" rel="noopener noreferrer" class="font-bold text-lg contact-link transition-colors" style="color: var(--text-primary);">${client.entity}</a>
                             ${dateRange ? `<span class="text-xs flex-shrink-0 ml-4">${dateRange}</span>` : ''}
                        </div>
                        ${descriptionHTML}
                    </div>
                    <div class="flex-shrink-0 mt-auto pt-4">
                        ${statusHTML}
                    </div>
                `;
        container.appendChild(card);
    });
}

// --- Lanyard WebSocket Logic ---
function connectLanyard() {
    lanyardSocket = new WebSocket(LANYARD_WEBSOCKET_URL);

    lanyardSocket.onopen = () => {
        console.log("Lanyard WebSocket connected.");
        lanyardSocket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
    };

    lanyardSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.op === 1) { // Hello
            const heartbeatInterval = data.d.heartbeat_interval;
            setInterval(() => {
                if (lanyardSocket.readyState === WebSocket.OPEN) {
                    lanyardSocket.send(JSON.stringify({ op: 3 }));
                }
            }, heartbeatInterval);
        } else if (data.op === 0) {
            updateProfileCard(data.d);
        }
    };

    lanyardSocket.onclose = () => {
        console.log("Lanyard WebSocket disconnected. Reconnecting in 5 seconds...");
        setTimeout(connectLanyard, 5000);
    };

    lanyardSocket.onerror = (error) => {
        console.error("Lanyard WebSocket error:", error);
        lanyardSocket.close();
    };
}

function updateProfileCard(data) {
    if (!data || !data.discord_user) return;

    // Update Avatar
    const avatarHash = data.discord_user.avatar;
    const avatarUrl = avatarHash && avatarHash.startsWith('a_')
        ? `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${avatarHash}.gif?size=128`
        : `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${avatarHash}.png?size=128`;
    document.getElementById('profile-avatar').src = avatarUrl;

    // Update Username
    document.getElementById('profile-username').textContent = data.discord_user.username;

    // Update Status
    const statusDot = document.getElementById('profile-status-dot');
    const statusText = document.getElementById('profile-status-text');
    statusDot.className = 'w-3 h-3 rounded-full'; // Reset classes
    switch (data.discord_status) {
        case 'online':
            statusDot.style.backgroundColor = 'var(--status-dot-online)';
            statusText.textContent = 'Online';
            break;
        case 'idle':
            statusDot.style.backgroundColor = 'var(--status-dot-idle)';
            statusText.textContent = 'Idle';
            break;
        case 'dnd':
            statusDot.style.backgroundColor = 'var(--status-dot-dnd)';
            statusText.textContent = 'Do Not Disturb';
            break;
        default:
            statusDot.style.backgroundColor = 'var(--status-dot-offline)';
            statusText.textContent = 'Offline';
            break;
    }

    // Update Activities
    const gameActivity = data.activities.find(a => a.type === 0);
    const spotifyActivity = data.spotify;
    const customStatusActivity = data.activities.find(a => a.type === 4);

    const activitySection = document.getElementById('activity-section');
    const spotifySection = document.getElementById('spotify-section');

    // Handle Spotify
    if (spotifyActivity) {
        spotifySection.style.display = 'block';
        document.getElementById('spotify-song').textContent = spotifyActivity.song;
        document.getElementById('spotify-artist').textContent = `by ${spotifyActivity.artist}`;
        document.getElementById('spotify-album-art').src = spotifyActivity.album_art_url;
    } else {
        spotifySection.style.display = 'none';
    }

    // Handle Game or Custom Status
    const mainActivity = gameActivity || customStatusActivity;
    if (mainActivity) {
        activitySection.style.display = 'block';
        const activityTitle = document.getElementById('activity-title');
        const activityName = document.getElementById('activity-name');
        const activityDetails = document.getElementById('activity-details');
        const activityState = document.getElementById('activity-state');
        const activityImage = document.getElementById('activity-large-image');

        if (mainActivity.type === 0) { // Game
            activityTitle.textContent = 'PLAYING A GAME';
            activityImage.style.display = 'block';
            activityName.textContent = mainActivity.name;
            activityDetails.textContent = mainActivity.details || '';
            activityState.textContent = mainActivity.state || '';
            if (mainActivity.assets && mainActivity.assets.large_image) {
                activityImage.src = `https://cdn.discordapp.com/app-assets/${mainActivity.application_id}/${mainActivity.assets.large_image}.png`;
            } else {
                activityImage.src = 'https://placehold.co/40x40/7c3aed/ffffff?text=?';
            }
        } else { // Custom Status
            activityTitle.textContent = 'CUSTOM STATUS';
            activityImage.style.display = 'none';
            activityName.textContent = mainActivity.state || '';
            activityDetails.textContent = '';
            activityState.textContent = '';
        }
    } else {
        activitySection.style.display = 'none';
    }
}

// --- Initial Load & Theme Handling ---
document.addEventListener('DOMContentLoaded', (event) => {
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const mainLayout = document.getElementById('main-layout-container');

    const applyTheme = (theme) => {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        sunIcon.classList.toggle('hidden', isDark);
        moonIcon.classList.toggle('hidden', !isDark);
    };

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // Set initial theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(prefersDark ? 'dark' : 'light');
    }

    feather.replace();
    fetchAndRenderProjects();
    fetchAndRenderClients();
    fetchAndRenderServices();
    connectLanyard();

    const tabButtons = document.querySelectorAll('.tab-link');
    const homeButton = document.getElementById('home-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            mainLayout.classList.remove('welcome-view');
            mainLayout.classList.add('content-view');
            openTab(e, button.dataset.tab)
        });
    });

    homeButton.addEventListener('click', (e) => {
        mainLayout.classList.add('welcome-view');
        mainLayout.classList.remove('content-view');

        let currentTab = null;
        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.style.display !== 'none' && !tab.classList.contains('tab-fade-out')) {
                currentTab = tab;
            }
        });

        if (currentTab) {
            isTransitioning = true;
            document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));

            currentTab.classList.add('tab-fade-out');
            currentTab.addEventListener('animationend', () => {
                currentTab.style.display = 'none';
                currentTab.classList.remove('tab-fade-out');
                isTransitioning = false;
            }, { once: true });
        }
    });
});