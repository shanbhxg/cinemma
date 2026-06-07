import {
  useEffect,
  useMemo,
  useState
} from "react";

const TMDB_KEY =
  import.meta.env
    .VITE_TMDB_API_KEY;

const BASE =
  "https://api.themoviedb.org/3";

const MOVIES_PER_PAGE = 24;

const COUNTRIES = [
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳"
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸"
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺"
  }
];

const PROVIDERS = [
  "All Providers",
  "Netflix",
  "Amazon Prime Video",
  "ZEE5",
  "Sun Nxt",
  "JioHotstar",
  "Sony LIV",
  "Apple TV",
  "MUBI"
];

function normalizeProvider(
  name
) {
  return name
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\s+/g, "")
    .replace(
      /[^a-z0-9]/g,
      ""
    );
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

  return lines.slice(1).map(
    line => {
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
          (
            header,
            index
          ) => [
            header,
            values[index]
          ]
        )
      );
    }
  );
}

async function searchMovies(
  query
) {
  const response =
    await fetch(
      `${BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(
        query
      )}`
    );

  const data =
    await response.json();

  return (
    data.results?.slice(0, 4) ||
    []
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
  const isMobile =
    window.innerWidth < 768;

  const [country, setCountry] =
    useState("IN");

  const [movies, setMovies] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    searchResults,
    setSearchResults
  ] = useState([]);

  const [
    selectedProvider,
    setSelectedProvider
  ] = useState(
    "All Providers"
  );

  const [page, setPage] =
    useState(1);

  async function enrichMovie(
    movie,
    selectedCountry
  ) {
    const providers =
      await fetchProviders(
        movie.id,
        selectedCountry
      );

    return {
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
    };
  }

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

        const response =
          await fetch(
            `${BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(
              title
            )}${
              year
                ? `&year=${year}`
                : ""
            }`
          );

        const data =
          await response.json();

        const movie =
          data.results?.[0];

        if (!movie) {
          continue;
        }

        const enriched =
          await enrichMovie(
            movie,
            selectedCountry
          );

        rows.push(enriched);
      }

      setMovies(rows);

      setSearchResults([]);

      setPage(1);
    } catch (err) {
      console.error(err);

      alert(
        "Failed to process watchlist."
      );
    }

    setLoading(false);
  }

  async function handleFile(
    file
  ) {
    try {
      setLoading(true);

      const text =
        await file.text();

      const parsed =
        parseCSV(text);

      if (
        !parsed ||
        parsed.length === 0
      ) {
        alert(
          "Invalid Letterboxd CSV."
        );

        setLoading(false);

        return;
      }

      await processMovies(
        parsed,
        country
      );
    } catch (err) {
      console.error(err);

      alert(
        "Failed to upload CSV."
      );

      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!search.trim()) {
      return;
    }
    setSelectedProvider(
      "All Providers"
    );
    
    setLoading(true);

    try {
      const results =
        await searchMovies(
          search
        );

      const enriched =
        await Promise.all(
          results.map(movie =>
            enrichMovie(
              movie,
              country
            )
          )
        );

      setSearchResults(
        enriched
      );
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    async function refreshProviders() {
      if (
        movies.length === 0 &&
        searchResults.length === 0
      ) {
        return;
      }

      setLoading(true);

      try {
        const updatedMovies =
          await Promise.all(
            movies.map(movie =>
              enrichMovie(
                movie,
                country
              )
            )
          );

        const updatedSearch =
          await Promise.all(
            searchResults.map(
              movie =>
                enrichMovie(
                  movie,
                  country
                )
            )
          );

        setMovies(
          updatedMovies
        );

        setSearchResults(
          updatedSearch
        );
      } catch (err) {
        console.error(err);
      }

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
    }, [
      movies,
      selectedProvider
    ]);

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

  const displayMovies =
    searchResults.length > 0
      ? searchResults
      : paginatedMovies;

  const hasImportedMovies =
    movies.length > 0 && searchResults.length === 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "#f7f7f5",
        padding: isMobile
          ? 16
          : 32
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection:
              "column",
            alignItems:
              "center",
            marginBottom: 32
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: 10,
              fontSize: isMobile
                ? 34
                : 56,
              fontWeight: 800,
              letterSpacing:
                "-0.04em",
              color: "#111",
              textAlign:
                "center"
            }}
          >
            Where to watch?
          </h1>

          <div
            style={{
              color: "#777",
              fontSize: 15,
              textAlign:
                "center",
              marginBottom: 28
            }}
          >
            Search movies or
            upload your
            watchlist.csv file.
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 880,
              display: "flex",
              flexDirection:
                isMobile
                  ? "column"
                  : "row",
              gap: 12
            }}
          >
            <input
              value={search}
              onChange={e =>
                setSearch(
                  e.target.value
                )
              }
              onKeyDown={e => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  handleSearch();
                }
              }}
              placeholder="Search any movie"
              style={{
                flex: 1,
                border:
                  "1px solid #e5e5e5",
                background:
                  "white",
                borderRadius: 22,
                padding:
                  "18px 20px",
                fontSize: 16,
                outline: "none",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.04)"
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 12,
                width: isMobile
                  ? "100%"
                  : "auto"
              }}
            >
              <button
                onClick={
                  handleSearch
                }
                style={{
                  flex: 1,
                  border: "none",
                  background:
                    "#111",
                  color: "white",
                  borderRadius: 22,
                  padding:
                    "0 26px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor:
                    "pointer",
                  minHeight: 58
                }}
              >
                Search
              </button>

              <label
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 22,
                  background:
                    "white",
                  border:
                    "1px solid #e5e5e5",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor:
                    "pointer",
                  boxShadow:
                    "0 4px 20px rgba(0,0,0,0.04)"
                }}
              >
                <i
                  className="fa-solid fa-arrow-up-from-bracket"
                  style={{
                    fontSize: 16,
                    color: "#111"
                  }}
                ></i>

                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={async e => {
                    const file =
                      e.target
                        .files?.[0];

                    if (file) {
                      await handleFile(
                        file
                      );

                      e.target.value =
                        "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection:
              isMobile
                ? "column"
                : "row",
            justifyContent:
              "space-between",
            alignItems:
              isMobile
                ? "stretch"
                : "center",
            gap: 16,
            marginBottom: 28
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems:
                "center",
              overflowX: "auto",
              paddingBottom: 2
            }}
          >
            {COUNTRIES.map(
              item => (
                <button
                  key={item.code}
                  onClick={() => {
                    setCountry(
                      item.code
                    );

                    setPage(1);
                  }}
                  style={{
                    border:
                      country ===
                      item.code
                        ? "1px solid #111"
                        : "1px solid #e5e5e5",
                    background:
                      country ===
                      item.code
                        ? "#111"
                        : "white",
                    color:
                      country ===
                      item.code
                        ? "white"
                        : "#111",
                    borderRadius: 999,
                    padding:
                      "10px 14px",
                    fontSize: 20,
                    cursor:
                      "pointer",
                    minWidth: 54,
                    transition:
                      "0.2s"
                  }}
                >
                  {item.flag}
                </button>
              )
            )}
          </div>

          {hasImportedMovies && (
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
                border:
                  "1px solid #e5e5e5",
                background:
                  "white",
                borderRadius: 16,
                padding:
                  "14px 16px",
                fontSize: 14,
                outline: "none",
                minWidth: isMobile
                  ? "100%"
                  : 240,
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.04)"
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
          )}
        </div>

        {loading && (
          <div
            style={{
              textAlign:
                "center",
              marginTop: 80,
              color: "#777",
              fontSize: 15
            }}
          >
            Loading...
          </div>
        )}

        {!loading &&
          displayMovies.length >
            0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    isMobile
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(4, minmax(0, 1fr))",
                  gap: isMobile
                    ? 14
                    : 22
                }}
              >
                {displayMovies.map(
                  movie => (
                    <div
                      key={movie.id}
                      style={{
                        background:
                          "white",
                        borderRadius: 24,
                        overflow:
                          "hidden",
                        border:
                          "1px solid #ececec",
                        boxShadow:
                          "0 8px 30px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div
                        style={{
                          aspectRatio:
                            "2 / 3",
                          background:
                            "#ececec"
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
                            fontSize:
                              isMobile
                                ? 13
                                : 15,
                            lineHeight: 1.35,
                            color:
                              "#111"
                          }}
                        >
                          {
                            movie.title
                          }
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color:
                              "#888"
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
                            gap: 6,
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
                                    width:
                                      isMobile
                                        ? 28
                                        : 34,
                                    height:
                                      isMobile
                                        ? 28
                                        : 34,
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

              {searchResults.length ===
                0 && (
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    alignItems:
                      "center",
                    gap: 12,
                    marginTop: 36
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
                      border:
                        "1px solid #ddd",
                      background:
                        "white",
                      borderRadius: 14,
                      padding:
                        "12px 18px",
                      cursor:
                        "pointer"
                    }}
                  >
                    Prev
                  </button>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#666"
                    }}
                  >
                    {page} /{" "}
                    {
                      totalPages
                    }
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
                      border:
                        "1px solid #ddd",
                      background:
                        "white",
                      borderRadius: 14,
                      padding:
                        "12px 18px",
                      cursor:
                        "pointer"
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

        {!loading &&
          displayMovies.length ===
            0 && (
            <div
              style={{
                textAlign:
                  "center",
                marginTop: 120,
                color: "#888",
                fontSize: 15,
                lineHeight: 1.7
              }}
            >
              No movies found for this provider.
            </div>
          )}
      </div>
    </div>
  );
}