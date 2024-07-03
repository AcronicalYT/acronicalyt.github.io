function redirect() {
    const current = window.location.href;
    const exclude = current.indexOf('?');
    if (!exclude) window.location = '/';
    window.location = current.substring(exclude + 1);
}

setTimeout(redirect, 5000);