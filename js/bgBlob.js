const blob = document.querySelector("#bg-blob");

window.onpointermove = event => {
    const { clientX, clientY } = event;

    const { scrollX, scrollY } = window;
    const x = clientX + scrollX;
    const y = clientY + scrollY;

    blob.animate({
        left: `${x}px`,
        top: `${y}px`
    }, { duration: 3000, fill: "forwards" });
}