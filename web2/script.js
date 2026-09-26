const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

menuButton.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  });
});

const tracks = document.querySelectorAll('.track-row');
const nowPlayingTitle = document.querySelector('#now-playing-title');
const listenLink = document.querySelector('#listen-link');

tracks.forEach((track) => {
  track.addEventListener('click', () => {
    tracks.forEach((item) => item.classList.remove('active'));
    track.classList.add('active');
    const song = track.dataset.song;
    nowPlayingTitle.textContent = song;
    listenLink.href = `https://open.spotify.com/search/${encodeURIComponent(`Morgan Wallen ${song}`)}`;
  });
});
