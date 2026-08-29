const BASE_API_URL = "https://api.acronical.uk/";
const PROJECTS_API_ENDPOINT = `${BASE_API_URL}projects`;
const CLIENTS_API_ENDPOINT = `${BASE_API_URL}experience`;
const SERVICES_API_ENDPOINT = `${BASE_API_URL}services`;
const LANYARD_WEBSOCKET_URL = "wss://lanyard.acronical.uk/socket";
const DISCORD_USER_ID = "627045949998497792";

let servicesData = [];
let lanyardSocket;
let allPostits = [];

// Pan and zoom state
let panX = 0;
let panY = 0;
let zoom = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

const POSTIT_COLORS = ['postit-yellow', 'postit-pink', 'postit-blue', 'postit-green'];

function renderError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <li class="flex flex-col items-start gap-1 text-red-600 dark:text-red-400 handwriting font-bold text-xl">
            <p>⚠️ ${message}</p>
        </li>
    `;
}

function getRandomPosition() {
    const minDistance = 400;
    const maxDistance = 800;
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: (Math.random() - 0.5) * 8
    };
}

function createPostit(title, items, color) {
    const container = document.getElementById('postits-container');
    if (!container) return;

    const pos = getRandomPosition();
    const postit = document.createElement('div');
    postit.className = `postit ${color}`;
    postit.style.left = `calc(50% + ${pos.x}px)`;
    postit.style.top = `calc(50% + ${pos.y}px)`;
    postit.style.transform = `translate(-50%, -50%) rotate(${pos.rotation}deg)`;

    let itemsHTML = '';
    items.forEach(item => {
        itemsHTML += `<div class="postit-item">${item}</div>`;
    });

    postit.innerHTML = `
        <h3>${title}</h3>
        <div class="postit-content">
            ${itemsHTML}
        </div>
    `;

    container.appendChild(postit);
    allPostits.push(postit);
}

async function fetchAndRenderServices() {
    try {
        const response = await fetch(SERVICES_API_ENDPOINT);
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
        servicesData = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));

        const items = [];
        servicesData.forEach(service => {
            const statusText = service.online ? '🟢 Online' : '🔴 Offline';
            items.push(`<strong>${service.name}</strong> - ${statusText}`);
        });

        createPostit('Hosted Services', items, POSTIT_COLORS[2]);
        checkAllServicesStatus();
    } catch (error) {
        console.error("Could not load services:", error);
    }
}

async function checkServiceStatus(service) {
    if (!service.online) return;

    const urls = [service.uptimeURL, service.altUptimeURL].filter(Boolean);
    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { mode: 'no-cors', cache: 'no-cache', signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok || res.type === 'opaque' || res.status === 200 || res.status === 403 || res.status === 401 || res.status === 0) {
                return true;
            }
        } catch (e) {
            continue;
        }
    }
    return false;
}

function checkAllServicesStatus() {
    servicesData.forEach(service => checkServiceStatus(service));
}

async function fetchAndRenderProjects() {
    try {
        const response = await fetch(PROJECTS_API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const projects = Object.values(data);

        const items = [];
        projects.forEach(project => {
            let buttons = [];
            if (project.download?.has) buttons.push(`<a href="${project.download.url}" target="_blank">Download</a>`);
            if (project.invite?.has) buttons.push(`<a href="${project.invite.url}" target="_blank">Invite</a>`);
            if (project.link?.has) buttons.push(`<a href="${project.link.url}" target="_blank">View</a>`);

            const typeTag = `<span class="postit-tag">${project.type.replace('-', ' ')}</span>`;
            items.push(`
                <strong>${project.name}</strong>${typeTag}<br>
                <small>${project.description || ''}</small><br>
                ${buttons.length > 0 ? `<small style="margin-top: 0.25rem; display: block;">${buttons.join(' | ')}</small>` : ''}
            `);
        });

        createPostit('My Projects', items, POSTIT_COLORS[0]);
    } catch (error) {
        console.error("Could not load projects:", error);
    }
}

async function fetchAndRenderClients() {
    try {
        const response = await fetch(CLIENTS_API_ENDPOINT);
        const data = await response.json();
        const clients = Object.values(data);

        const items = [];
        clients.forEach(client => {
            const dateStr = client.start ? (client.end ? `${client.start} – ${client.end}` : `Since ${client.start}`) : '';
            const statusLabel = client.left ? '🔴 Past Work' : '🟢 Current';

            let viewButton = '';
            if (client.link != null) viewButton = `<a href="${client.link}" target="_blank">View</a>`;

            items.push(`
                <strong>${client.entity}</strong> <small>${dateStr}</small><br>
                <small>${client.description || ''}</small><br>
                <small style="margin-top: 0.25rem; display: block;">${statusLabel}${viewButton ? ' | ' + viewButton : ''}</small>
            `);
        });

        createPostit('Experience & Work', items, POSTIT_COLORS[3]);
    } catch (e) {
        console.error("Failed to load experience:", e);
    }
}

function connectLanyard() {
    lanyardSocket = new WebSocket(LANYARD_WEBSOCKET_URL);
    lanyardSocket.onopen = () => lanyardSocket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
    lanyardSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.op === 1) setInterval(() => lanyardSocket.send(JSON.stringify({ op: 3 })), data.d.heartbeat_interval);
        if (data.op === 0 && (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE')) {
            updateProfileCard(data.d);
        }
    };
    lanyardSocket.onclose = () => setTimeout(connectLanyard, 5000);
}

function updateProfileCard(data) {
    if (!data?.discord_user) return;

    const user = data.discord_user;
    const container = document.getElementById('lanyard');
    if (container) container.classList.remove('hidden');

    const avatar = document.getElementById('discord-avatar');
    if(avatar) avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`;

    const dot = document.getElementById('discord-status-dot');
    if (dot) {
        dot.className = 'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 transition-colors duration-300 ';
        switch (data.discord_status) {
            case 'online': dot.classList.add('bg-green-500'); break;
            case 'idle': dot.classList.add('bg-yellow-500'); break;
            case 'dnd': dot.classList.add('bg-red-500'); break;
            default: dot.classList.add('bg-gray-500'); break;
        }
    }

    let activityText = data.discord_status === 'offline' ? 'Offline' : 'Online';
    if (data.activities && data.activities.length > 0) {
        const customStatus = data.activities.find(a => a.type === 4);
        const playing = data.activities.find(a => a.type === 0);

        if (customStatus && customStatus.state) {
            activityText = customStatus.state;
            if (customStatus.emoji) {
                activityText = (customStatus.emoji.id ? '🎮 ' : customStatus.emoji.name + ' ') + activityText;
            }
        } else if (playing) {
            activityText = `Playing ${playing.name}`;
        }
    }

    const activityEl = document.getElementById('discord-activity');
    if (activityEl) activityEl.textContent = activityText;

    const spotify = data.spotify;
    const spotifyEl = document.getElementById('spotify-section');
    if (spotify) {
        if (spotifyEl) spotifyEl.classList.remove('hidden');
        const songEl = document.getElementById('spotify-song');
        if (songEl) songEl.textContent = spotify.song;
        const artistEl = document.getElementById('spotify-artist');
        if (artistEl) artistEl.textContent = `by ${spotify.artist}`;
        const artEl = document.getElementById('spotify-album-art');
        if (artEl) artEl.src = spotify.album_art_url;
    } else {
        if (spotifyEl) spotifyEl.classList.add('hidden');
    }
}

function updateViewport() {
    const viewport = document.getElementById('viewport');
    if (viewport) {
        viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
}

function resetView() {
    panX = 0;
    panY = 0;
    zoom = 1;
    updateViewport();
    updateZoomLevel();
}

function updateZoomLevel() {
    const zoomEl = document.getElementById('zoom-level');
    if (zoomEl) zoomEl.textContent = `${Math.round(zoom * 100)}%`;
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const viewport = document.getElementById('viewport');
    const themeToggle = document.getElementById('theme-toggle');
    const resetButton = document.getElementById('reset-view');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    const contactBox = document.getElementById('contact');

    // Theme toggle
    const setAppTheme = (theme) => {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);

        if (darkIcon && lightIcon) {
            darkIcon.classList.toggle('hidden', !isDark);
            darkIcon.classList.toggle('block', isDark);
            lightIcon.classList.toggle('hidden', isDark);
            lightIcon.classList.toggle('block', !isDark);
        }

        localStorage.setItem('theme', theme);
    };

    themeToggle?.addEventListener('click', () => setAppTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'));
    setAppTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    // Reset view button
    resetButton?.addEventListener('click', resetView);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') resetView();
    });

    // Pan and zoom
    canvas?.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX - panX;
        dragStartY = e.clientY - panY;
        canvas.classList.add('grabbing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - dragStartX;
        panY = e.clientY - dragStartY;
        updateViewport();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        canvas?.classList.remove('grabbing');
    });

    // Zoom with mouse wheel
    canvas?.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.3, Math.min(3, zoom * zoomFactor));

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        panX = mouseX - (mouseX - panX) * (newZoom / zoom);
        panY = mouseY - (mouseY - panY) * (newZoom / zoom);
        zoom = newZoom;

        updateViewport();
        updateZoomLevel();
    }, { passive: false });

    // Contact copy
    if (contactBox) {
        contactBox.addEventListener('click', () => {
            const email = "contact@acronical.uk";
            const textArea = document.createElement("textarea");
            textArea.value = email;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                const originalText = contactBox.innerHTML;
                contactBox.innerHTML = `<p class="font-bold text-2xl mb-2 handwriting text-green-600 dark:text-green-400">Email Copied!</p>`;
                setTimeout(() => {
                    contactBox.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            } finally {
                document.body.removeChild(textArea);
            }
        });
    }

    // Load data
    fetchAndRenderProjects();
    fetchAndRenderClients();
    fetchAndRenderServices();
    connectLanyard();
});