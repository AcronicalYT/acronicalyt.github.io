const BASE_API_URL = "https://api.acronical.uk/";
const PROJECTS_API_ENDPOINT = `${BASE_API_URL}projects`;
const CLIENTS_API_ENDPOINT = `${BASE_API_URL}experience`;
const SERVICES_API_ENDPOINT = `${BASE_API_URL}services`;
const LANYARD_WEBSOCKET_URL = "wss://lanyard.acronical.uk/socket";
const DISCORD_USER_ID = "627045949998497792";

let servicesData = [];
let lanyardSocket;

function renderError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <li class="flex flex-col items-start gap-1 text-red-600 dark:text-red-400 handwriting font-bold text-xl">
            <p>⚠️ ${message}</p>
        </li>
    `;
}

async function fetchAndRenderServices() {
    const container = document.querySelector('#services');
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
        const row = document.createElement('li');
        row.className = "status-row anim-fade-in-up";

        const statusClass = service.online ? 'text-green-500' : 'text-red-500';
        const statusText = service.online ? 'Online' : 'Offline';

        row.innerHTML = `
            <div id="status-${service.id}" class="flex items-center gap-2 max-w-sm">
                <span class="status-dot font-bold text-xl ${statusClass}">●</span>
                <span class="font-medium text-gray-900 dark:text-gray-100 handwriting text-xl">${service.name}</span>
                <span class="status-text text-sm text-gray-500 dark:text-gray-400 italic ml-auto">${statusText}</span>
            </div>
        `;
        container.appendChild(row);
    });

    observeAnimations(container);
    checkAllServicesStatus();
}

async function checkServiceStatus(service) {
    const statusContainer = document.querySelector(`#status-${service.id}`);
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
            const res = await fetch(url, { cache: 'no-cache', signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                success = true;
                break;
            }
        } catch (e) {
            continue;
        }
    }

    setServiceUI(dot, text, success ? 'online' : 'failed');
}

function setServiceUI(dot, text, state) {
    dot.className = 'status-dot font-bold text-xl';
    text.className = 'status-text text-sm italic ml-auto';

    switch (state) {
        case 'online':
            dot.classList.add('text-green-500');
            text.classList.add('text-gray-600', 'dark:text-gray-400');
            text.textContent = 'Online';
            break;
        case 'offline':
            dot.classList.add('text-red-500');
            text.classList.add('text-red-600', 'dark:text-red-400');
            text.textContent = 'Decommissioned';
            break;
        case 'failed':
            dot.classList.add('text-red-500');
            text.classList.add('text-red-600', 'dark:text-red-400');
            text.textContent = 'Failed to Connect';
            break;
        case 'checking':
            dot.classList.add('text-yellow-500', 'animate-pulse');
            text.classList.add('text-yellow-600', 'dark:text-yellow-500');
            text.textContent = 'Checking...';
            break;
        default:
            dot.classList.add('text-gray-500');
            text.classList.add('text-gray-600', 'dark:text-gray-400');
            text.textContent = 'Unknown...';
            break;
    }
}

function checkAllServicesStatus() {
    servicesData.forEach(service => {
        const container = document.querySelector(`#status-${service.id}`);
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

async function fetchAndRenderProjects() {
    const container = document.querySelector('#projects');
    if (!container) return;

    try {
        const response = await fetch(PROJECTS_API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const projects = Object.values(data);

        container.innerHTML = '';

        projects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'anim-fade-in-up';

            let buttonsHTML = '';

            if (project.download?.has) buttonsHTML += `<a href="${project.download.url}" target="_blank" class="ink-link inline-flex items-center text-sm font-bold">Download</a>`;
            if (project.invite?.has) buttonsHTML += `<a href="${project.invite.url}" target="_blank" class="ink-link inline-flex items-center text-sm font-bold ml-4">Invite</a>`;
            if (project.link?.has) buttonsHTML += `<a href="${project.link.url}" target="_blank" class="ink-link inline-flex items-center text-sm font-bold ml-4">View</a>`;

            li.innerHTML = `
                <strong class="text-xl handwriting text-gray-900 dark:text-gray-100">${project.name}</strong>
                <span class="text-xs text-gray-500 italic border border-gray-300 dark:border-slate-600 rounded px-1 ml-2 capitalize">${project.type.replace('-', ' ')}</span><br>
                <span class="text-gray-800 dark:text-gray-200 block mt-1">${project.description || ''}</span>
                <div class="mt-2 flex items-center">
                    ${buttonsHTML}
                </div>
            `;
            container.appendChild(li);
        });

        observeAnimations(container);
    } catch (error) {
        renderError(container, "Could not load projects.");
    }
}

async function fetchAndRenderClients() {
    const container = document.querySelector('#experience');
    if (!container) return;

    try {
        const response = await fetch(CLIENTS_API_ENDPOINT);
        const data = await response.json();
        const clients = Object.values(data);

        container.innerHTML = '';
        clients.forEach(client => {
            const li = document.createElement('li');
            li.className = 'anim-fade-in-up';

            const dateStr = client.start ? (client.end ? `${client.start} &ndash; ${client.end}` : `Since ${client.start}`) : '';
            const statusLabel = client.left ? 'Past Work' : 'Current Work';

            const dotClass = client.left ? 'text-red-500' : 'text-blue-500';
            const statusTextClass = client.left ? 'text-red-800 dark:text-red-400' : 'text-blue-800 dark:text-blue-400';

            let buttonsHTML = '';
            if (client.link != null) buttonsHTML += `<a href="${client.link}" target="_blank" class="ink-link inline-flex items-center text-sm font-bold ml-4">View</a>`;

            li.innerHTML = `
                <strong class="text-xl handwriting text-gray-900 dark:text-gray-100">${client.entity}</strong>
                <span class="text-sm text-gray-600 dark:text-gray-400 italic ml-2">(${dateStr})</span><br>
                <span class="text-gray-800 dark:text-gray-200 block mt-1">${client.description || ''}</span>
                <div class="flex items-center gap-2 text-sm font-bold ${statusTextClass} mt-2">
                    <span class="${dotClass} text-lg leading-none">●</span>
                    <span>${statusLabel}</span>
                    ${buttonsHTML}
                </div>
            `;
            container.appendChild(li);
        });

        observeAnimations(container);
    } catch (e) {
        renderError(container, "Failed to load experience.");
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

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');

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

    const contactBox = document.getElementById('contact');
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
                contactBox.innerHTML = `<p class="font-bold text-2xl mb-2 handwriting text-green-600">Email Copied!</p>`;
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

    fetchAndRenderProjects();
    fetchAndRenderClients();
    fetchAndRenderServices();
    connectLanyard();
});