// ==========================
// FlickFetch Frontend-only
// ==========================

const API_KEY = "94b7bb7abc6b94e25e91016d54449aad"; // 🔑 put your TMDB key here
const TMDB_BASE = "https://api.themoviedb.org/3";

let config = null;
let genresMap = {};
let currentPage = 1;
let currentQuery = "";
let currentMode = "popular"; // 'popular' | 'trending' | 'search' | 'discover'
let activeGenre = null;

const moviesGrid = document.getElementById("moviesGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadMoreSpinner = document.getElementById("loadMoreSpinner");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const genresEl = document.getElementById("genres");

// -------------------- API HELPERS --------------------

function fetchJson(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error("Network error");
    return r.json();
  });
}

function getConfig() {
  return fetchJson(`${TMDB_BASE}/configuration?api_key=${API_KEY}`);
}

function getGenres() {
  return fetchJson(`${TMDB_BASE}/genre/movie/list?api_key=${API_KEY}`);
}

function getPopular(page = 1) {
  return fetchJson(
    `${TMDB_BASE}/movie/popular?api_key=${API_KEY}&page=${page}`
  );
}

function getTrending(page = 1, window = "week") {
  return fetchJson(
    `${TMDB_BASE}/trending/movie/${window}?api_key=${API_KEY}&page=${page}`
  );
}

function searchMovies(query, page = 1) {
  return fetchJson(
    `${TMDB_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      query
    )}&page=${page}`
  );
}

function discoverMovies(genre, page = 1) {
  return fetchJson(
    `${TMDB_BASE}/discover/movie?api_key=${API_KEY}&with_genres=${genre}&page=${page}`
  );
}

function getMovieDetails(id) {
  return fetchJson(
    `${TMDB_BASE}/movie/${id}?api_key=${API_KEY}&append_to_response=videos,credits`
  );
}

function posterUrl(path, size = "w500") {
  if (!path) return "https://via.placeholder.com/500x750?text=No+Image";
  const base =
    config && config.images && config.images.secure_base_url
      ? config.images.secure_base_url
      : "https://image.tmdb.org/t/p/";
  return `${base}${size}${path}`;
}

// -------------------- INIT --------------------

async function init() {
  config = await getConfig();
  const g = await getGenres();
  (g.genres || []).forEach((gg) => (genresMap[gg.id] = gg.name));
  renderGenreChips(g.genres || []);
  await loadInitial();
}

async function loadInitial() {
  currentPage = 1;
  currentMode = "popular";
  const data = await getPopular(currentPage);
  renderMovies(data.results || [], true);
}

// -------------------- UI RENDER --------------------

function renderGenreChips(list) {
  genresEl.innerHTML = "";
  const allChip = makeChip("All", async () => {
    activeGenre = null;
    currentMode = "popular";
    currentPage = 1;
    moviesGrid.innerHTML = "";
    await loadInitial();
  });
  genresEl.appendChild(allChip);

  list.forEach((g) => {
    const chip = makeChip(g.name, async () => {
      if (activeGenre === g.id) {
        activeGenre = null;
        currentMode = "popular";
        currentPage = 1;
        moviesGrid.innerHTML = "";
        await loadInitial();
        return;
      }
      activeGenre = g.id;
      currentMode = "discover";
      currentPage = 1;
      moviesGrid.innerHTML = "";
      const data = await discoverMovies(g.id, currentPage);
      renderMovies(data.results || [], true);
    });
    genresEl.appendChild(chip);
  });
}

function makeChip(text, cb) {
  const btn = document.createElement("button");
  btn.className =
    "px-3 py-1 rounded-full bg-gray-800 text-sm hover:scale-105 transition transform";
  btn.textContent = text;
  btn.onclick = cb;
  return btn;
}

function renderMovies(list, replace = false) {
  if (replace) moviesGrid.innerHTML = "";
  list.forEach((m) => {
    const card = document.createElement("div");
    card.className =
      "group bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition hover:scale-105";
    const img = document.createElement("img");
    img.src = posterUrl(m.poster_path);
    img.alt = m.title;
    img.className = "w-full h-56 object-cover";
    const meta = document.createElement("div");
    meta.className = "p-3";
    meta.innerHTML = `<h3 class="text-sm font-semibold">${
      m.title
    }</h3><p class="text-xs text-gray-400">${m.release_date || ""}</p>`;
    card.append(img, meta);
    card.onclick = () => openMovie(m.id);
    moviesGrid.appendChild(card);
  });
}

// -------------------- MOVIE OVERLAY --------------------

async function openMovie(id) {
  const overlay = document.getElementById("movieOverlay");
  const posterEl = document.getElementById("overlayPoster");
  const titleEl = document.getElementById("overlayTitle");
  const metaEl = document.getElementById("overlayMeta");
  const overviewEl = document.getElementById("overlayOverview");
  const genresContainer = document.getElementById("overlayGenres");
  const trailerContainer = document.getElementById("overlayTrailer");

  // reset
  posterEl.innerHTML = "Loading...";
  titleEl.textContent = "";
  metaEl.textContent = "";
  overviewEl.textContent = "";
  genresContainer.innerHTML = "";
  trailerContainer.innerHTML = "";

  overlay.classList.remove("hidden");
  overlay.classList.add("flex");

  const data = await getMovieDetails(id);
  titleEl.textContent = data.title;
  metaEl.textContent = `${data.release_date || ""} • ${
    Math.round(data.vote_average * 10) / 10 || ""
  }/10`;
  overviewEl.textContent = data.overview || "No overview available.";
  posterEl.innerHTML = `<img src="${posterUrl(
    data.poster_path,
    "w342"
  )}" class="rounded-lg w-full" alt="${data.title}">`;

  (data.genres || []).forEach((g) => {
    const span = document.createElement("span");
    span.className = "text-xs px-2 py-1 rounded bg-gray-700";
    span.textContent = g.name;
    genresContainer.appendChild(span);
  });

  const vids = data.videos && data.videos.results ? data.videos.results : [];
  const trailer =
    vids.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    vids.find((v) => v.site === "YouTube");
  if (trailer) {
    trailerContainer.innerHTML = `<div class="aspect-w-16 aspect-h-9"><iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen class="w-full h-64 rounded-md border-0"></iframe></div>`;
  } else {
    trailerContainer.innerHTML = `<div class="text-sm text-gray-400">Trailer not available</div>`;
  }
}

// close overlay
document.getElementById("closeOverlay").addEventListener("click", () => {
  const overlay = document.getElementById("movieOverlay");
  overlay.classList.add("hidden");
  overlay.classList.remove("flex");
  document.getElementById("overlayTrailer").innerHTML = "";
});

// -------------------- SEARCH & LOAD MORE --------------------



searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  currentQuery = q;
  currentMode = "search";
  currentPage = 1;
  moviesGrid.innerHTML = "";
  const data = await searchMovies(q, currentPage);
  renderMovies(data.results || [], true);
});

loadMoreBtn.addEventListener("click", async () => {
  loadMoreSpinner.classList.remove("hidden");
  currentPage++;
  let data;
  if (currentMode === "search")
    data = await searchMovies(currentQuery, currentPage);
  else if (currentMode === "discover")
    data = await discoverMovies(activeGenre, currentPage);
  else if (currentMode === "trending") data = await getTrending(currentPage);
  else data = await getPopular(currentPage);
  renderMovies(data.results || []);
  loadMoreSpinner.classList.add("hidden");
});


// -------------------- HEADER BUTTONS --------------------

document.getElementById('popularBtn').addEventListener('click', async () => {
  currentMode = 'popular';
  currentPage = 1;
  moviesGrid.innerHTML = '';
  const data = await getPopular(currentPage);
  renderMovies(data.results || [], true);
});

document.getElementById('trendingBtn').addEventListener('click', async () => {
  currentMode = 'trending';
  currentPage = 1;
  moviesGrid.innerHTML = '';
  const data = await getTrending(currentPage);
  renderMovies(data.results || [], true);
});


// -------------------- START --------------------
init().catch((err) => console.error(err));
