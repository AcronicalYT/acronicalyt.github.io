const navUl = document.querySelector('.mob-nav-ul');
const menuBtn = document.querySelector('.nav-open');
const closeBtn = document.querySelector('.nav-close');
const body = document.querySelector('body');

window.onresize = async function windowResize() {
    if(window.innerWidth >= 768 && navUl.classList.contains('show')) toggleNav();
}

menuBtn.addEventListener('click', () => {
    toggleNav();
});

closeBtn.addEventListener('click', () => {
    toggleNav();
});

function toggleNav() {
    navUl.classList.toggle('show'); 
    menuBtn.classList.toggle('hide');
}