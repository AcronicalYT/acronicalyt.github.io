var prevScrollpos = window.pageYOffset;
window.onscroll = function() {
  var currentScrollPos = window.pageYOffset;
  if (prevScrollpos > currentScrollPos) {
    document.getElementById("navbar").style.top = "0";
    document.getElementById("nav-text").style.top = "0";
    document.getElementById("navbar-menu").style.top = "0";
    document.getElementById("navbar-li").style.top = "0";
    document.getElementById("nav-link").style.top = "0";
  } else {
    document.getElementById("navbar").style.top = "-50px";
    document.getElementById("nav-text").style.top = "-50px";
    document.getElementById("navbar-menu").style.top = "-50px";
    document.getElementById("navbar-li").style.top = "-50px";
    document.getElementById("nav-link").style.top = "-50px";
  }
  prevScrollpos = currentScrollPos;
}