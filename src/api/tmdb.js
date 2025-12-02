const KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export async function searchMovies(query) {
  const res = await fetch(
    `${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}`
  );
  return res.json();
}

export function posterUrl(path, size = "w342") {
  return path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : "https://via.placeholder.com/150/000000/FFFFFF/?text=No+Image";
}
