const BASE_API_URL = "https://api.acronical.uk/";
const PROJECTS_API_ENDPOINT = `${BASE_API_URL}projects`;
const CLIENTS_API_ENDPOINT = `${BASE_API_URL}experience`;
const LANYARD_WEBSOCKET_URL = "wss://lanyard.acronical.uk/socket";
const DISCORD_USER_ID = "627045949998497792";

let lanyardSocket;
let allPostits = [];
let zIndexCounter = 10000;

let panX = 0;
let panY = 0;
let zoom = 1;
let isCanvasDragging = false;
let canvasDragStartX = 0;
let canvasDragStartY = 0;
let lastCanvasPanX = 0;
let lastCanvasPanY = 0;

let viewportElement = null;
let pendingViewportUpdate = false;

let draggedPostit = null;
let postitDragStartX = 0;
let postitDragStartY = 0;

function getPositionWithCollisionAvoidance(existingPostits) {
    const minDistance = 275;
    const maxDistance = 1150;
    const minSeparation = 200;

    let position;
    let attempts = 0;
    let hasCollision = true;

    while (hasCollision && attempts < 500) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.sqrt(Math.random()) * (maxDistance - minDistance);

        position = {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            rotation: (Math.random() - 0.5) * 8
        };

        hasCollision = false;
        for (const postit of existingPostits) {
            const postitX = parseFloat(postit.dataset.posX);
            const postitY = parseFloat(postit.dataset.posY);
            const dx = position.x - postitX;
            const dy = position.y - postitY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minSeparation) {
                hasCollision = true;
                break;
            }
        }

        attempts++;
    }

    if (hasCollision) {
        const spiralAngle = existingPostits.length * 2.4;
        const spiralDist = minDistance + (existingPostits.length * 60);
        position = {
            x: Math.cos(spiralAngle) * spiralDist,
            y: Math.sin(spiralAngle) * spiralDist,
            rotation: (Math.random() - 0.5) * 8
        };
    }

    return position;
}

function createPostit(title, content, color) {
    const container = document.getElementById('postits-container');
    if (!container) return;

    const pos = getPositionWithCollisionAvoidance(allPostits);
    const postit = document.createElement('div');
    postit.className = `postit ${color}`;
    postit.dataset.posX = pos.x;
    postit.dataset.posY = pos.y;
    postit.dataset.baseRotation = pos.rotation;
    postit.style.zIndex = zIndexCounter;

    postit.innerHTML = `
        <h3>${title}</h3>
        <div class="postit-content">
            ${content}
        </div>
    `;

    postit.querySelectorAll('a').forEach(link => {
        link.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        link.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    const updatePosition = () => {
        const x = parseFloat(postit.dataset.posX);
        const y = parseFloat(postit.dataset.posY);
        const rot = parseFloat(postit.dataset.baseRotation);
        postit.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`;
    };
    updatePosition();

    postit.style.left = '50%';
    postit.style.top = '50%';

    postit.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('a')) return;
        e.stopPropagation();
        draggedPostit = postit;
        postitDragStartX = e.clientX;
        postitDragStartY = e.clientY;
        postit.style.zIndex = ++zIndexCounter;
        postit.classList.add('dragging');
    });

    container.appendChild(postit);
    allPostits.push(postit);
}

async function fetchAndRenderProjects() {
    try {
        const response = await fetch(PROJECTS_API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const projects = Object.values(data);

        projects.forEach((project) => {
            let buttons = [];
            if (project.download?.has) buttons.push(`<a href="${project.download.url}" target="_blank">Download</a>`);
            if (project.invite?.has) buttons.push(`<a href="${project.invite.url}" target="_blank">Invite</a>`);
            if (project.link?.has) buttons.push(`<a href="${project.link.url}" target="_blank">View</a>`);

            const typeTag = `<span class="postit-tag">${project.type.replace('-', ' ')}</span>`;
            const content = `
                <div class="postit-item">
                    ${typeTag}
                    <p class="postit-desc">${project.description || ''}</p>
                    ${buttons.length > 0 ? `<div class="postit-links">${buttons.join(' | ')}</div>` : ''}
                </div>
            `;
            
            createPostit(project.name, content, 'postit-yellow');
        });
    } catch (error) {
        console.error("Could not load projects:", error);
    }
}

async function fetchAndRenderClients() {
    try {
        const response = await fetch(CLIENTS_API_ENDPOINT);
        const data = await response.json();
        const clients = Object.values(data);

        clients.forEach((client) => {
            const dateStr = client.start ? (client.end ? `${client.start} – ${client.end}` : `Since ${client.start}`) : '';
            const statusLabel = client.left ? '🔴 Past Work' : '🟢 Current';

            let viewButton = '';
            if (client.link != null) viewButton = `<a href="${client.link}" target="_blank">View</a>`;

            const content = `
                <div class="postit-item">
                    <small class="postit-date">${dateStr}</small>
                    <p class="postit-desc">${client.description || ''}</p>
                    <small>${statusLabel}${viewButton ? ' | ' + viewButton : ''}</small>
                </div>
            `;

            createPostit(client.entity, content, 'postit-blue');
        });
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
    if (!viewportElement) return;
    
    if (!pendingViewportUpdate) {
        pendingViewportUpdate = true;
        requestAnimationFrame(() => {
            if (viewportElement) {
                viewportElement.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
            }
            pendingViewportUpdate = false;
        });
    }
}

function resetView() {
    panX = 0;
    panY = 0;
    zoom = 1;

    if (viewportElement) {
        viewportElement.classList.add('transition-transform', 'duration-300');
        updateViewport();
        setTimeout(() => {
            viewportElement.classList.remove('transition-transform', 'duration-300');
        }, 300);
    }

    updateZoomLevel();
}

function updateZoomLevel() {
    const zoomEl = document.getElementById('zoom-level');
    if (zoomEl) zoomEl.textContent = `${Math.round(zoom * 100)}%`;
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    viewportElement = document.getElementById('viewport');
    const themeToggle = document.getElementById('theme-toggle');
    const resetButton = document.getElementById('reset-view');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    const contactBox = document.getElementById('contact');

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

    resetButton?.addEventListener('click', resetView);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') resetView();
    });

    canvas?.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || draggedPostit) return;

        if (e.target.closest('a')) return;
        
        const centerContent = document.getElementById('center-content');
        if (centerContent && centerContent.contains(e.target)) return;
        
        isCanvasDragging = true;
        canvasDragStartX = e.clientX;
        canvasDragStartY = e.clientY;
        lastCanvasPanX = panX;
        lastCanvasPanY = panY;
        canvas.classList.add('grabbing');
        if (viewportElement) {
            viewportElement.style.willChange = 'transform';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (draggedPostit) {
            const deltaX = e.clientX - postitDragStartX;
            const deltaY = e.clientY - postitDragStartY;
            
            const currentX = parseFloat(draggedPostit.dataset.posX);
            const currentY = parseFloat(draggedPostit.dataset.posY);
            const baseRotation = parseFloat(draggedPostit.dataset.baseRotation);
            
            const newX = currentX + deltaX / zoom;
            const newY = currentY + deltaY / zoom;
            
            draggedPostit.dataset.posX = newX;
            draggedPostit.dataset.posY = newY;
            
            draggedPostit.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px)) rotate(${baseRotation}deg)`;
            
            postitDragStartX = e.clientX;
            postitDragStartY = e.clientY;
            return;
        }

        if (!isCanvasDragging) return;
        const deltaX = e.clientX - canvasDragStartX;
        const deltaY = e.clientY - canvasDragStartY;
        panX = lastCanvasPanX + deltaX;
        panY = lastCanvasPanY + deltaY;
        updateViewport();
    });

    document.addEventListener('mouseup', () => {
        isCanvasDragging = false;
        if (draggedPostit) {
            draggedPostit.classList.remove('dragging');
        }
        draggedPostit = null;
        canvas?.classList.remove('grabbing');
        if (viewportElement) {
            viewportElement.style.willChange = 'auto';
        }
    });

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

    fetchAndRenderProjects();
    fetchAndRenderClients();
    connectLanyard();
});