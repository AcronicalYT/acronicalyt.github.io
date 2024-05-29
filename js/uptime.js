async function yrrahBotPing() {
    const uptimePanel = document.getElementById('yrrahPanel');
    const uptimeElement = document.getElementById('yrrahUptime');
    if (!uptimeElement || !uptimePanel) {
        console.error('One or both elements not found: ' + uptimeElement + " " + uptimeText);
    } else {
        try {
            const response = await fetch('https://yrrahbot.acronical.is-a.dev/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = uptime;
        } catch (error) {
            uptimeElement.textContent = "Failed to get uptime."
            console.log('Error: ', error);
        }
    }
}

async function nocwareBotPing() {
    const uptimePanel = document.getElementById('nocwarePanel');
    const uptimeElement = document.getElementById('nocwareUptime');
    if (!uptimeElement || !uptimePanel) {
        console.error('One or both elements not found: ' + uptimeElement + " " + uptimeText);
    } else {
        try {
            const response = await fetch('https://nocwarebot.acronical.is-a.dev/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = uptime;
        } catch (error) {
            uptimeElement.textContent = "Failed to get uptime."
            console.log('Error: ', error);
        }
    }
}

setInterval(nocwareBotPing, 1000);
setInterval(yrrahBotPing, 1000);