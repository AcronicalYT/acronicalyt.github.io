const projectsURL = 'https://api.acronical.uk/projects';
const altProjectsURL = 'https://api.acronical.co.uk/projects';
const dropdownList = document.querySelector('.dropdown-list');
const dropdownListButton = document.querySelector('.dropdown-open-button');
const projectHeader = document.querySelector('.project-header');
const projectDescription = document.querySelector('.project-description');
const projectImage = document.querySelector('.project-image');
const projectVideo = document.querySelector('.project-video');
const projectButton = document.querySelector('.project-button');

async function fetchAllProjects() {
    try {
        const response = await fetch(projectsURL);
        return await response.json();
    } catch  {  
        try {
            const response = await fetch(altProjectsURL);
            return await response.json();
        } catch (error) {
            console.log("Failed to get projects")
        }
    }
}

async function fetchProject(projectName) {
    try {
        for (const [key, project] of Object.entries(await fetchAllProjects())) {
            if (project.name === projectName) return project;
        }
    } catch (error) {
        console.error('Failed to fetch project:', error);
    }
}

window.onload = async () => {
    const projects = await fetchAllProjects();
    for (const [key, project] of Object.entries(projects)) {
        const projectElement = document.createElement('li');
        projectElement.classList.add('dropdown-item');
        projectElement.textContent = project.name;
        dropdownList.appendChild(projectElement);
    }
}

dropdownListButton.addEventListener('click', () => {
    dropdownList.classList.toggle('open');
});

document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('dropdown-item')) {
        const item = e.target;
        console.log("Clicked on", item.textContent);
        const project = await fetchProject(item.textContent);
        console.log(project);
        dropdownListButton.textContent = project.name;
        projectHeader.textContent = project.name;
        projectDescription.textContent = project.description;
        projectDescription.classList.remove('hidden');
        if (project.image.has === true) {
            projectImage.src = project.image.url;
            projectImage.classList.remove('hidden');
            projectVideo.classList.add('hidden');
        }
        if (project.video.has === true) {
            projectVideo.src = project.video.url;
            projectVideo.classList.remove('hidden');
            projectImage.classList.add('hidden');
        }
        if (project.download.has === true) {
            projectButton.href = project.download.url;
            projectButton.textContent = "Download";
            projectButton.classList.remove('hidden');
        }
        if (project.invite.has === true) {
            projectButton.href = project.invite.url;
            projectButton.textContent = "Check it out!";
            projectButton.classList.remove('hidden');
        }
        dropdownList.classList.remove('open');
    }
});