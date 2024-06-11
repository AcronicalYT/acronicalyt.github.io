const creatorButtons = document.querySelectorAll('.creator-pill');
const videoIframe = document.getElementById('finale-video');

// Function to update video source and button selection
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

// Check for existing cookie
const cookieValue = document.cookie.split(';').find(cookie => cookie.startsWith('creator='));
if (cookieValue) {
    const selectedCreator = cookieValue.split('=')[1];
    updateSelection(selectedCreator);
} else {
    // Set default selection (optional)
    updateSelection("Yrrah"); // Update with your default creator
}

creatorButtons.forEach(button => {
    button.addEventListener('click', () => {
        updateSelection(button.textContent);

        // Set cookie with selected creator
        document.cookie = `creator=${button.textContent}; path=/;`;
    });
});
