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
    name: "India"
  },
  {
    code: "US",
    name: "United States"
  },
  {
    code: "AU",
    name: "Australia"
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
  "Apple TV Plus",
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

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1600,
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
          justifyContent:
            "center",
          marginBottom: 28
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: window.innerWidth <
              768
              ? 28
              : 40,
            textAlign:
              "center"
          }}
        >
          Where to watch?
        </h1>

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 10,
            width: "100%",
            maxWidth: 900,
            flexDirection:
              window.innerWidth <
              768
                ? "column"
                : "row"
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
            placeholder="Search any movie..."
            style={{
              flex: 1,
              width: "100%",
              padding:
                "16px 18px",
              borderRadius: 16,
              border:
                "1px solid #ddd",
              fontSize: 16
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              width:
                window.innerWidth <
                768
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
                padding:
                  "16px 18px",
                borderRadius: 16,
                border:
                  "none",
                background:
                  "black",
                color: "white",
                cursor:
                  "pointer",
                fontWeight: 700,
                fontSize: 15
              }}
            >
              Search
            </button>

            <label
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background:
                  "#202830",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                cursor:
                  "pointer",
                flexShrink: 0
              }}
            >
              <i
                className="fa-solid fa-arrow-up-from-bracket"
                style={{
                  color:
                    "white",
                  fontSize: 15
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
          gap: 10,
          marginBottom: 24,
          flexWrap: "wrap",
          flexDirection:
            window.innerWidth <
            768
              ? "column"
              : "row"
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
            padding:
              "12px 14px",
            borderRadius: 12,
            border:
              "1px solid #ccc",
            minWidth: 180,
            width:
              window.innerWidth <
              768
                ? "100%"
                : "auto"
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
            padding:
              "12px 14px",
            borderRadius: 12,
            border:
              "1px solid #ccc",
            minWidth: 240,
            width:
              window.innerWidth <
              768
                ? "100%"
                : "auto"
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
                  window.innerWidth <
                  768
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                gap: 16
              }}
            >
              {displayMovies.map(
                movie => (
                  <div
                    key={movie.id}
                    style={{
                      background:
                        "white",
                      border:
                        "1px solid #e4e4e4",
                      borderRadius: 16,
                      overflow:
                        "hidden",
                      boxShadow:
                        "0 2px 12px rgba(0,0,0,0.05)"
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
                        padding: 12
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.3,
                          fontSize:
                            14
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
                            "#777"
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
                          marginTop: 12
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
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8
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
                  marginTop: 28,
                  flexWrap:
                    "wrap"
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
                      "10px 14px",
                    borderRadius: 10,
                    border:
                      "1px solid #ccc",
                    background:
                      "white"
                  }}
                >
                  Prev
                </button>

                <div
                  style={{
                    fontSize: 14
                  }}
                >
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
                      "10px 14px",
                    borderRadius: 10,
                    border:
                      "1px solid #ccc",
                    background:
                      "white"
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
              color: "#777",
              marginTop: 60,
              fontSize: 15
            }}
          >
            Search for a movie or
            upload a Letterboxd
            watchlist.
          </div>
        )}
    </div>
  );
}