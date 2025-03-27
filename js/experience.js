const experienceURL = 'https://api.acronical.uk/experience';
const altExperienceURL = 'https://api.acronical.co.uk/experience';
const emExperienceURL = 'https://api.acronical.is-a.dev/experience';
const dropdownList = document.querySelector('.dropdown-list');
const dropdownListButton = document.querySelector('.dropdown-open-button');
const experienceHeader = document.querySelector('.experience-title');
const experienceDescription = document.querySelector('.experience-description');
const experienceTimeframe = document.querySelector('.experience-timeframe');
const experienceIcon = document.querySelector('.experience-icon');
const experienceBanner = document.querySelector('.experience-banner');

async function fetchAllExperience() {
    try {
        const response = await fetch(experienceURL);
        return await response.json();
    } catch  {  
        try {
            const response = await fetch(altExperienceURL);
            return await response.json();
        } catch {
            try {
                const response = await fetch(emExperienceURL);
                return await response.json();
            } catch (error) {
                console.log("Failed to get data from api:", error);
                return null;
            }
        }
    }
}

async function fetchExperience(experienceName) {
    try {
        for (const [key, experience] of Object.entries(await fetchAllExperience())) {
            if (experience.entity === experienceName) return experience;
        }
    } catch (error) {
        console.error('Failed to fetch experience:', error);
    }
}

async function resetElements() {
    experienceHeader.textContent = "Loading...";
    experienceDescription.textContent = "";
    experienceDescription.classList.add('hidden');
    experienceTimeframe.textContent = "";
    experienceTimeframe.classList.add('hidden');
    experienceIcon.src = "";
    experienceIcon.classList.add('hidden');
    experienceBanner.src = "";
    experienceBanner.classList.add('hidden');
}

window.onload = async () => {
    const experiences = await fetchAllExperience();
    for (const [key, experience] of Object.entries(experiences)) {
        const experienceElement = document.createElement('li');
        experienceElement.classList.add('dropdown-item');
        experienceElement.textContent = experience.entity;
        dropdownList.appendChild(experienceElement);
    }
}

dropdownListButton.addEventListener('click', () => {
    dropdownList.classList.toggle('open');
});

document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('dropdown-item')) {
        const item = e.target;
        await resetElements();
        const experience = await fetchExperience(item.textContent);
        dropdownListButton.textContent = experience.entity;
        experienceHeader.textContent = experience.entity;
        experienceDescription.textContent = experience.description;
        experienceDescription.classList.remove('hidden');
        if (experience.left == false) {
            experienceTimeframe.textContent = `Since ${experience.start}`;
            experienceTimeframe.classList.remove('hidden');
        } else {
            experienceTimeframe.textContent = `${experience.start} - ${experience.end}`;
            experienceTimeframe.classList.remove('hidden');
        } 
        if (experience.images.logo) {
            experienceIcon.src = experience.images.logo;
            experienceIcon.classList.remove('hidden');
        }
        if (experience.images.banner) {
            experienceBanner.src = experience.images.banner;
            experienceBanner.classList.remove('hidden');
        }
        if (experience.link) {
            experienceHeader.href = experience.link;
        }
        dropdownList.classList.remove('open');
    }
});
