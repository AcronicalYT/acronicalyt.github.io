async function yrrahBotPing() {
    const uptimePanel = document.getElementById('yrrahPanel');
    const uptimeElement = document.getElementById('yrrahUptime');
    if (!uptimeElement || !uptimePanel) {
        console.error('One or both elements not found: ' + uptimeElement + " " + uptimeText);
    } else {
        try {
            const response = await fetch('https://yrrahbot.yrrah.live/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = `Online for ${uptime}`;
        } catch (error) {
            uptimeElement.textContent = "Failed to get exact uptime."
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
            const response = await fetch('https://fi2.bot-hosting.net:21741/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = `Online for ${uptime}`;
        } catch (error) {
            uptimeElement.textContent = "Failed to get exact uptime."
            console.log('Error: ', error);
        }
    }
}

async function playhireBotPing() {
    const uptimePanel = document.getElementById('playhirePanel');
    const uptimeElement = document.getElementById('playhireUptime');
    if (!uptimeElement || !uptimePanel) {
        console.error('One or both elements not found: ' + uptimeElement + " " + uptimeText);
    } else {
        try {
            const response = await fetch('https://de3.bot-hosting.net:22433/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = `Online for ${uptime}`;
        } catch (error) {
            uptimeElement.textContent = "Failed to get exact uptime."
            console.log('Error: ', error);
        }
    }
}

setInterval(yrrahBotPing, 1000);
setInterval(nocwareBotPing, 1000);
setInterval(playhireBotPing, 1000);