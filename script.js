// API 키 없음 — Vercel 서버리스 함수를 통해 요청
const IMG_BASE = 'https://image.tmdb.org/t/p/';

let movies = [];
let heroIdx = 0;
let heroTimer;

// ── FETCH ──
async function fetchMovies() {
  const res = await fetch('/api/movies');
  const data = await res.json();
  return data;
}

async function fetchGenres() {
  const res = await fetch('/api/genres');
  const data = await res.json();
  return data.genres || [];
}

// ── HERO ──
function setHero(movie) {
  const bg = document.getElementById('hero-bg');
  bg.style.opacity = '0';
  setTimeout(() => {
    bg.style.backgroundImage = movie.backdrop_path
      ? `url(${IMG_BASE}original${movie.backdrop_path})`
      : 'none';
    bg.style.opacity = '1';
  }, 200);

  document.getElementById('hero-title').textContent = movie.title || movie.original_title;
  document.getElementById('hero-overview').textContent = movie.overview || '줄거리 정보 없음';

  const meta = document.getElementById('hero-meta');
  meta.innerHTML = `
    <div class="hero-score">
      <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      ${movie.vote_average?.toFixed(1)}
    </div>
    <span class="hero-date">${movie.release_date || '미정'}</span>
    <span class="hero-lang">${(movie.original_language || '').toUpperCase()}</span>
    <span class="hero-pop">🔥 ${movie.popularity?.toFixed(0)}</span>
  `;

  document.getElementById('hero-play-btn').onclick = () => openModal(movie);
  document.getElementById('hero-info-btn').onclick = () => openModal(movie);

  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === heroIdx));
}

function setupHeroDots() {
  const dotsEl = document.getElementById('hero-dots');
  dotsEl.innerHTML = '';
  movies.slice(0, 6).forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.onclick = () => { heroIdx = i; setHero(movies[heroIdx]); };
    dotsEl.appendChild(d);
  });
}

function startHeroRotation() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    heroIdx = (heroIdx + 1) % Math.min(6, movies.length);
    setHero(movies[heroIdx]);
  }, 6000);
}

// ── STATS ──
function renderStats(data) {
  const totalVotes = movies.reduce((a, m) => a + (m.vote_count || 0), 0);
  const avgScore = movies.reduce((a, m) => a + (m.vote_average || 0), 0) / movies.length;
  const avgPop = movies.reduce((a, m) => a + (m.popularity || 0), 0) / movies.length;

  document.getElementById('stat-total').textContent = data.total_results || movies.length;
  document.getElementById('stat-avg-score').innerHTML = `${avgScore.toFixed(2)}<span>/ 10</span>`;
  document.getElementById('stat-total-votes').textContent = totalVotes.toLocaleString('ko-KR');
  document.getElementById('stat-avg-pop').textContent = avgPop.toFixed(1);
  document.getElementById('stat-page').innerHTML = `${data.page}<span>/ ${data.total_pages}페이지</span>`;
  document.getElementById('section-count').textContent = `${movies.length}편`;
}

// ── CARD ──
function starSVG() {
  return `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
}

function createCard(movie, idx, genreMap) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${Math.min(idx * 0.04, 1)}s`;

  const posterSrc = movie.poster_path
    ? `${IMG_BASE}w400${movie.poster_path}`
    : `https://via.placeholder.com/200x300/13131f/606075?text=No+Image`;

  const maxPop = 300;
  const popPct = Math.min((movie.popularity / maxPop) * 100, 100).toFixed(1);
  const votePct = ((movie.vote_average / 10) * 100).toFixed(1);

  card.innerHTML = `
    <img class="card-poster" src="${posterSrc}" alt="${movie.title}" loading="lazy" />
    <div class="card-rank">${idx + 1}</div>
    ${movie.adult ? '<div class="card-adult">18+</div>' : ''}
    <div class="card-overlay">
      <div class="overlay-overview">${movie.overview || '줄거리 정보가 없습니다.'}</div>
    </div>
    <div class="card-body">
      <div class="card-title" title="${movie.title}">${movie.title || movie.original_title}</div>
      <div class="card-meta">
        <div class="card-score">${starSVG()} ${movie.vote_average?.toFixed(1) || 'N/A'}</div>
        <div class="card-lang">${(movie.original_language || '').toUpperCase()}</div>
      </div>
      <div class="card-date">${movie.release_date || '개봉일 미정'}</div>
      <div class="card-popularity">
        <span>인기</span>
        <div class="pop-bar"><div class="pop-fill" style="width:${popPct}%"></div></div>
        <span>${movie.popularity?.toFixed(0)}</span>
      </div>
      <div class="vote-bar-wrap">
        <div class="vote-bar-label"><span>평점</span><span>${movie.vote_count?.toLocaleString('ko-KR')}표</span></div>
        <div class="vote-bar"><div class="vote-fill" style="width:${votePct}%"></div></div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(movie, genreMap));
  return card;
}

// ── GRID ──
function renderGrid(genreMap) {
  const grid = document.getElementById('movie-grid');
  grid.innerHTML = '';
  movies.forEach((m, i) => grid.appendChild(createCard(m, i, genreMap)));
  document.getElementById('loading').style.display = 'none';
  grid.style.display = 'grid';
}

// ── MODAL ──
function openModal(movie, genreMap = {}) {
  const bg = document.getElementById('modal-bg');
  bg.classList.add('open');
  document.body.style.overflow = 'hidden';

  const backdropSrc = movie.backdrop_path
    ? `${IMG_BASE}w1280${movie.backdrop_path}`
    : (movie.poster_path ? `${IMG_BASE}w780${movie.poster_path}` : '');
  document.getElementById('modal-backdrop').src = backdropSrc;
  document.getElementById('modal-backdrop').style.display = backdropSrc ? 'block' : 'none';

  document.getElementById('modal-title').textContent = movie.title || movie.original_title;
  document.getElementById('modal-original-title').textContent =
    movie.original_title !== movie.title ? `원제: ${movie.original_title}` : '';

  const chips = document.getElementById('modal-chips');
  chips.innerHTML = '';
  const addChip = (text, cls = '') => {
    const c = document.createElement('span');
    c.className = 'chip' + (cls ? ' ' + cls : '');
    c.textContent = text;
    chips.appendChild(c);
  };
  if (movie.release_date) addChip(movie.release_date);
  if (movie.original_language) addChip(movie.original_language.toUpperCase());
  if (movie.adult) addChip('성인 (18+)', 'red');
  if (movie.video) addChip('동영상 있음');
  (movie.genre_ids || []).forEach(id => {
    if (genreMap[id]) addChip(genreMap[id]);
  });

  document.getElementById('modal-overview').textContent = movie.overview || '줄거리 정보가 없습니다.';

  const stats = document.getElementById('modal-stats');
  stats.innerHTML = [
    { label: '평점', val: movie.vote_average?.toFixed(2) + ' / 10', cls: 'gold' },
    { label: '투표 수', val: movie.vote_count?.toLocaleString('ko-KR') },
    { label: '인기도', val: movie.popularity?.toFixed(2), cls: 'red' },
  ].map(s => `
    <div class="ms">
      <div class="ms-label">${s.label}</div>
      <div class="ms-val ${s.cls || ''}">${s.val}</div>
    </div>
  `).join('');

  const ids = document.getElementById('modal-ids');
  const rows = [
    ['TMDB ID', movie.id],
    ['원제', movie.original_title],
    ['개봉일', movie.release_date || '미정'],
    ['언어', movie.original_language?.toUpperCase()],
    ['성인 여부', movie.adult ? '예' : '아니오'],
    ['비디오', movie.video ? '있음' : '없음'],
    ['장르 ID', (movie.genre_ids || []).join(', ') || '—'],
    ['인기도', movie.popularity?.toFixed(4)],
    ['평점', movie.vote_average?.toFixed(1) + ' / 10'],
    ['투표 수', movie.vote_count?.toLocaleString('ko-KR')],
  ];
  ids.innerHTML = `
    <div class="modal-ids-title">📋 API 원본 데이터</div>
    ${rows.map(([k, v]) => `
      <div class="id-row">
        <span class="id-key">${k}</span>
        <span class="id-val">${v ?? '—'}</span>
      </div>
    `).join('')}
  `;
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-bg')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── NAV SCROLL ──
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
});

// ── INIT ──
(async () => {
  try {
    const [data, genres] = await Promise.all([fetchMovies(), fetchGenres()]);
    movies = data.results || [];
    const genreMap = {};
    genres.forEach(g => genreMap[g.id] = g.name);

    setupHeroDots();
    setHero(movies[0]);
    startHeroRotation();
    renderStats(data);
    renderGrid(genreMap);
  } catch (err) {
    document.getElementById('loading').innerHTML = `
      <div style="color:var(--red);text-align:center;">
        <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
        <div>데이터를 불러오는 중 오류가 발생했습니다.</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:8px;">${err.message}</div>
      </div>
    `;
  }
})();
