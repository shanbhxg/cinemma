import { useEffect, useMemo, useState } from "react";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

const BASE = "https://api.themoviedb.org/3";

const MOVIES_PER_PAGE = 24;

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "AU", name: "Australia" }
];

const PROVIDERS = [
  "All Providers",
  "Netflix",
  "Amazon Prime Video",
  "ZEE5",
  "SunNXT",
  "JioHotstar",
  "Sony LIV",
  "Apple TV",
  "MUBI"
];

function normalizeProvider(name) {
  return name
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0]
    .match(
      /(".*?"|[^",]+)(?=\s*,|\s*$)/g
    )
    .map(header =>
      header.replace(
        /^"|"$/g,
        ""
      )
    );

  return lines.slice(1).map(line => {
    const values =
      line
        .match(
          /(".*?"|[^",]+)(?=\s*,|\s*$)/g
        )
        ?.map(value =>
          value
            .replace(
              /^"|"$/g,
              ""
            )
            .replace(
              /""/g,
              '"'
            )
        ) || [];

    return Object.fromEntries(
      headers.map(
        (header, index) => [
          header,
          values[index]
        ]
      )
    );
  });
}

async function searchMovie(
  title,
  year
) {
  const url =
    `${BASE}/search/movie?api_key=${TMDB_KEY}` +
    `&query=${encodeURIComponent(
      title
    )}` +
    (year
      ? `&year=${year}`
      : "");

  const response =
    await fetch(url);

  const data =
    await response.json();

  return (
    data.results?.[0] || null
  );
}

async function fetchProviders(
  movieId,
  country
) {
  const response = await fetch(
    `${BASE}/movie/${movieId}/watch/providers?api_key=${TMDB_KEY}`
  );

  const data =
    await response.json();

  const region =
    data.results?.[country];

  if (!region?.flatrate) {
    return [];
  }

  return Array.from(
    new Map(
      region.flatrate.map(
        provider => [
          provider.provider_id,
          provider
        ]
      )
    ).values()
  );
}

export default function WatchlistProviders() {
  const [country, setCountry] =
    useState("IN");

  const [movies, setMovies] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [
    selectedProvider,
    setSelectedProvider
  ] = useState("All Providers");

  const [page, setPage] =
    useState(1);

  async function processMovies(
    parsedMovies,
    selectedCountry
  ) {
    setLoading(true);

    try {
      const rows = [];

      for (const item of parsedMovies) {
        const title =
          item.Name ||
          item.Title ||
          item.title;

        const year =
          item.Year || "";

        if (!title) {
          continue;
        }

        const movie =
          await searchMovie(
            title,
            year
          );

        if (!movie) {
          continue;
        }

        const providers =
          await fetchProviders(
            movie.id,
            selectedCountry
          );

        rows.push({
          id: movie.id,
          title: movie.title,
          year:
            movie.release_date?.slice(
              0,
              4
            ) || "",
          poster:
            movie.poster_path,
          providers
        });
      }

      setMovies(rows);

      setPage(1);
    } catch (err) {
      console.error(err);

      alert(
        "Failed to process watchlist."
      );
    }

    setLoading(false);
  }

  async function handleFile(file) {
    const text =
      await file.text();

    const parsed =
      parseCSV(text);

    await processMovies(
      parsed,
      country
    );
  }

  useEffect(() => {
    async function refreshProviders() {
      if (movies.length === 0) {
        return;
      }

      setLoading(true);

      const updatedMovies =
        await Promise.all(
          movies.map(
            async movie => {
              const providers =
                await fetchProviders(
                  movie.id,
                  country
                );

              return {
                ...movie,
                providers
              };
            }
          )
        );

      setMovies(updatedMovies);

      setLoading(false);
    }

    refreshProviders();
  }, [country]);

  const filteredMovies =
    useMemo(() => {
      if (
        selectedProvider ===
        "All Providers"
      ) {
        return movies;
      }

      return movies.filter(
        movie =>
          movie.providers.some(
            provider =>
              normalizeProvider(
                provider.provider_name
              ) ===
              normalizeProvider(
                selectedProvider
              )
          )
      );
    }, [movies, selectedProvider]);

  const totalPages =
    Math.ceil(
      filteredMovies.length /
        MOVIES_PER_PAGE
    ) || 1;

  const paginatedMovies =
    filteredMovies.slice(
      (page - 1) *
        MOVIES_PER_PAGE,
      page * MOVIES_PER_PAGE
    );

  return (
    <div
      style={{
        padding: 20
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 28
            }}
          >
            Watchlist Providers
          </h2>

          <p
            style={{
              marginTop: 6,
              color: "#777"
            }}
          >
            Upload your Letterboxd
            watchlist CSV
          </p>
        </div>

        <label
          style={{
            padding: "12px 18px",
            background: "black",
            color: "white",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Upload CSV

          <input
            type="file"
            accept=".csv"
            hidden
            onChange={e => {
              if (
                e.target.files?.[0]
              ) {
                handleFile(
                  e.target.files[0]
                );

                e.target.value =
                  "";
              }
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 28
        }}
      >
        <select
          value={country}
          onChange={e => {
            setCountry(
              e.target.value
            );

            setPage(1);
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border:
              "1px solid #ccc",
            minWidth: 180
          }}
        >
          {COUNTRIES.map(
            country => (
              <option
                key={
                  country.code
                }
                value={
                  country.code
                }
              >
                {country.name}
              </option>
            )
          )}
        </select>

        <select
          value={
            selectedProvider
          }
          onChange={e => {
            setSelectedProvider(
              e.target.value
            );

            setPage(1);
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border:
              "1px solid #ccc",
            minWidth: 240
          }}
        >
          {PROVIDERS.map(
            provider => (
              <option
                key={provider}
                value={provider}
              >
                {provider}
              </option>
            )
          )}
        </select>
      </div>

      {loading && (
        <div>
          Loading watchlist...
        </div>
      )}

      {!loading &&
        paginatedMovies.length >
          0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 20
              }}
            >
              {paginatedMovies.map(
                movie => (
                  <div
                    key={movie.id}
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #ddd",
                      borderRadius: 18,
                      overflow:
                        "hidden",
                      boxShadow:
                        "0 2px 10px rgba(0,0,0,0.06)"
                    }}
                  >
                    <div
                      style={{
                        aspectRatio:
                          "2 / 3",
                        background:
                          "#eee"
                      }}
                    >
                      {movie.poster && (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${movie.poster}`}
                          alt={
                            movie.title
                          }
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover"
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        padding: 14
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.3
                        }}
                      >
                        {
                          movie.title
                        }
                      </div>

                      <div
                        style={{
                          color:
                            "#777",
                          marginTop: 4,
                          fontSize: 14
                        }}
                      >
                        {
                          movie.year
                        }
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap: 8,
                          marginTop: 14
                        }}
                      >
                        {movie.providers
                          .filter(
                            provider =>
                              selectedProvider ===
                                "All Providers" ||
                              normalizeProvider(
                                provider.provider_name
                              ) ===
                                normalizeProvider(
                                  selectedProvider
                                )
                          )
                          .map(
                            provider => (
                              <img
                                key={
                                  provider.provider_id
                                }
                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                alt={
                                  provider.provider_name
                                }
                                title={
                                  provider.provider_name
                                }
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10
                                }}
                              />
                            )
                          )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                gap: 14,
                marginTop: 32
              }}
            >
              <button
                disabled={
                  page === 1
                }
                onClick={() =>
                  setPage(
                    prev =>
                      prev - 1
                  )
                }
                style={{
                  padding:
                    "10px 16px",
                  borderRadius: 10,
                  border:
                    "1px solid #ccc",
                  background:
                    "white",
                  cursor:
                    "pointer"
                }}
              >
                Prev
              </button>

              <div>
                Page {page} of{" "}
                {totalPages}
              </div>

              <button
                disabled={
                  page ===
                  totalPages
                }
                onClick={() =>
                  setPage(
                    prev =>
                      prev + 1
                  )
                }
                style={{
                  padding:
                    "10px 16px",
                  borderRadius: 10,
                  border:
                    "1px solid #ccc",
                  background:
                    "white",
                  cursor:
                    "pointer"
                }}
              >
                Next
              </button>
            </div>
          </>
        )}

      {!loading &&
        movies.length > 0 &&
        filteredMovies.length ===
          0 && (
          <div>
            No movies found for
            selected provider.
          </div>
        )}
    </div>
  );
}