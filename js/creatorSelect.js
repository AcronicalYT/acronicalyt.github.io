const creatorButtons = document.querySelectorAll('.creator-pill');
const videoIframe = document.getElementById('finale-video');

function updateSelection(creator) {
    let newVideoSource = "";
    creatorButtons.forEach(button => button.classList.remove('active'));

    if (creator === "Yrrah") {
        newVideoSource = "https://www.youtube.com/embed/3foEooqOzi4?si=KtqAIQApUrOdZkZh";
        document.querySelector('.creator-pill#yrrah').classList.add('active');
    } else if (creator === "Astelina") {
        newVideoSource = "https://www.youtube.com/embed/AXNnBcWiP4c?si=coHwyg-da8wC9bHK";
        document.querySelector('.creator-pill#astelina').classList.add('active');
    }
    videoIframe.setAttribute('src', newVideoSource);
}

const cookieValue = document.cookie.split(';').find(cookie => cookie.startsWith('creator='));
if (cookieValue) {
    const selectedCreator = cookieValue.split('=')[1];
    updateSelection(selectedCreator);
} else {
    updateSelection("Yrrah");
}

creatorButtons.forEach(button => {
    button.addEventListener('click', () => {
        updateSelection(button.textContent);

        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Set expiry to 1 year from now
        document.cookie = `creator=${button.textContent}; path=/; expires=${expiryDate.toUTCString()}`;
    });
});
