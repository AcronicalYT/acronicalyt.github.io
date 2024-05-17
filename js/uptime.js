async function yrrahBotPing() {
    const uptimeText = document.getElementById('yrrahBot');
    const uptimeElement = document.getElementById('yrrahBotUptime');
    if (!uptimeElement || !uptimeText) {
        console.error('One or both elements not found: ' + uptimeElement + " " + uptimeText);
    } else {
        try {
            const response = await fetch('http://fi2.bot-hosting.net:21001/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = uptime;
            uptimeText.textContent = "YrrahBot has been online for: " + uptime;
        } catch (error) {
            uptimeText.textContent = "An error occured, this could be for many reasons."
            uptimeElement.textContent = "Contact Acronical if the issue persists."
            console.log('Error: ', error);
        }
    }
}

async function nocwareBotPing() {
    const uptimeText = document.getElementById('nocwareBot');
    const uptimeElement = document.getElementById('nocwareBotUptime');
    if (!uptimeElement || !uptimeText) {
        console.error('One or both elements not found: ' + uptimeElement + " " + uptimeText);
    } else {
        try {
            const response = await fetch('http://fi2.bot-hosting.net:21741/uptime');
            const { uptime } = await response.json();
            uptimeElement.textContent = uptime;
            uptimeText.textContent = "NocwareBot has been online for: " + uptime;
        } catch (error) {
            uptimeText.textContent = "An error occured, this could be for many reasons."
            uptimeElement.textContent = "Contact Acronical if the issue persists."
            console.log('Error: ', error);
        }
    }
}

setInterval(nocwareBotPing, 1000);
setInterval(yrrahBotPing, 1000);