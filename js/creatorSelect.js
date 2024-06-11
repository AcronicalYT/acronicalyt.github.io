const creatorButtons = document.querySelectorAll('.creator-pill');
const videoIframe = document.getElementById('finale-video');

creatorButtons.forEach(button => {
    button.addEventListener('click', () => {
        creatorButtons.forEach(otherButton => otherButton.classList.remove('active'));
        button.classList.add('active');

        let newVideoSource = "";
        if (button.textContent === "Yrrah") {
            newVideoSource = "https://www.youtube.com/embed/3foEooqOzi4?si=KtqAIQApUrOdZkZh";
        } else if (button.textContent === "Astelina") {
            newVideoSource = "https://www.youtube.com/embed/AXNnBcWiP4c?si=coHwyg-da8wC9bHK";
        }
        videoIframe.setAttribute('src', newVideoSource);
    });
});