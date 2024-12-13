let btns = document.getElementsByClassName("expand-btn");
let i;

for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function() {
        this.classList.toggle("active");
        const panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    });
}