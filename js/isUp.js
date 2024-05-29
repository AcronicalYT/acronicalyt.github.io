async function yrrahBotPing() {
    const uptimeText = document.getElementById('yrrahUp');
    const uptimePanel = document.getElementById('yrrahPanel');
    if (!uptimeText || !uptimePanel) {
        return console.error('One or more elements not found: ' + uptimePanel + " " + uptimeText);
    } else {
        try {
            const response = await fetch('https://fi2.bot-hosting.net:21001/uptime');
            if (!response) {
                uptimeText.textContent = "Yrrah's Bot may be offline!";
                uptimePanel.style.backgroundColor = '#ff230095';
            }
            uptimeText.textContent = "Yrrah's Bot is online!";
            uptimePanel.style.backgroundColor = '#23870095';
        } catch (error) {
            uptimeText.textContent = "Yrrah's Bot may be offline!"
            uptimePanel.style.backgroundColor = '#ff230095';
            console.log('Error: ', error);
        }
    }
}

async function nocwareBotPing() {
    const uptimeText = document.getElementById('nocwareUp');
    const uptimePanel = document.getElementById('nocwarePanel');
    if (!uptimePanel || !uptimeText) {
        return console.error('One or both elements not found: ' + uptimePanel + " " + uptimeText);
    } else {
        try {
            const response = await fetch('https://fi2.bot-hosting.net:21741/uptime');
            if (!response) {
                uptimeText.textContent = "Nocware's Bot may be offline!";
                uptimePanel.style.backgroundColor = '#ff230095';
            }
            uptimeText.textContent = "Nocware's Bot is online!";
            uptimePanel.style.backgroundColor = '#23870095';
        } catch (error) {
            uptimeText.textContent = "Nocware's bot may be offline!"
            uptimePanel.style.backgroundColor = '#ff230095';
            console.log('Error: ', error);
        }
    }
}

setInterval(nocwareBotPing, 1000);
setInterval(yrrahBotPing, 1000);