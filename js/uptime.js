const servicesURL = 'https://api.acronical.uk/services';
const altServicesURL = 'https://api.acronical.co.uk/services';
const emServicesURL = 'https://api.acronical.is-a.dev/services';
const dropdownList = document.querySelector('.dropdown-list');
const dropdownListButton = document.querySelector('.dropdown-open-button');
const serviceTitle = document.querySelector('.service-title');
const serviceStatus = document.querySelector('.service-status');
const serviceUptime = document.querySelector('.service-uptime');
const serviceLink = document.querySelector('.service-link');

async function fetchAllServices() {
    try {
        const response = await fetch(servicesURL);
        return await response.json();
    } catch  {
        try {
            const response = await fetch(altServicesURL);
            return await response.json();
        } catch {
            try {
                const response = await fetch(emServicesURL);
                return await response.json();
            } catch (error) {
                console.log("Failed to get data from api:", error);
                return null;
            }
        }
    }
}

async function fetchService(serviceName) {
    try {
        for (const [key, service] of Object.entries(await fetchAllServices())) {
            if (service.name === serviceName) return service;
        }
    } catch (error) {
        console.error('Failed to fetch service:', error);
    }
}

async function resetElements() {
    serviceTitle.textContent = "Loading...";
    serviceStatus.textContent = "";
    serviceStatus.classList.add('hidden');
    serviceUptime.textContent = "";
    serviceUptime.classList.add('hidden');
    serviceLink.href = "";
    serviceLink.classList.add('hidden');
}

window.onload = async () => {
    const services = await fetchAllServices();
    console.log(services);
    for (const [key, service] of Object.entries(services)) {
        if (!service.isActive) continue;
        const serviceElement = document.createElement('li');
        serviceElement.classList.add('dropdown-item');
        serviceElement.textContent = service.name;
        dropdownList.appendChild(serviceElement);
    }
}

dropdownListButton.addEventListener('click', () => {
    dropdownList.classList.toggle('open');
});

document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('dropdown-item')) {
        await resetElements();
        const serviceName = e.target.textContent;
        const service = await fetchService(serviceName);
        console.log(service);
        serviceTitle.textContent = service.name;
        let uptimeURL = service.uptimeURL ? service.uptimeURL : service.altUptimeURL ? service.altUptimeURL : null;
        if (!service.online) {
            serviceStatus.textContent = "Offline";
            serviceStatus.classList.remove('hidden');
            return;
        }
        if (uptimeURL) {
            let status, displayTime;
            try {
                const response = await fetch(uptimeURL);
                const { uptime } = await response.json();
                status = "Online";
                displayTime = uptime;
            } catch (error) {
                console.error('Failed to fetch uptime:', error);
                status = "Offline";
                displayTime = "No uptime data available";
            }
            serviceStatus.textContent = status;
            serviceStatus.classList.remove('hidden');
            serviceUptime.textContent = displayTime;
            serviceUptime.classList.remove('hidden');
            serviceLink.href = uptimeURL.slice(0, uptimeURL.lastIndexOf('/'));
            serviceLink.classList.remove('hidden');
        } else {
            serviceStatus.textContent = "No uptime data available";
            serviceStatus.classList.remove('hidden');
        }
    }
});

// Update the uptime every second
setInterval(async () => {
    const serviceName = serviceTitle.textContent;
    const service = await fetchService(serviceName);
    let uptimeURL = service.uptimeURL ? service.uptimeURL : service.altUptimeURL ? service.altUptimeURL : null;
    if (uptimeURL) {
        let status, displayTime;
        try {
            const response = await fetch(uptimeURL);
            const { uptime } = await response.json();
            status = "Online";
            displayTime = uptime;
        } catch (error) {
            console.error('Failed to fetch uptime:', error);
            status = "Offline";
            displayTime = "No uptime data available";
        }
        serviceStatus.textContent = status;
        serviceUptime.textContent = displayTime;
    } else {
        serviceStatus.textContent = "No uptime data available";
    }
}, 1000);