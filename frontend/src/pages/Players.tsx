import {
  Search,
  UserRound,
  MapPin,
  ArrowRight,
  PlusCircle,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { playersApi, type Player } from "../api/cricpulse";

export default function Players() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [myProfile, setMyProfile] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  // Load all players when page opens
  useEffect(() => {
    loadAllPlayers();

    playersApi
      .me()
      .then(setMyProfile)
      .catch(() => setMyProfile(null))
      .finally(() => setProfileLoading(false));
  }, []);

  async function loadAllPlayers() {
    try {
      setLoading(true);
      setError("");

      const data = await playersApi.search("");
      setPlayers(data);
    } catch (err) {
      setPlayers([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load players."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const q = query.trim();

    // Empty search = show all players again
    if (!q) {
      setSearched(false);
      await loadAllPlayers();
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      setError("");

      const data = await playersApi.search(q);
      setPlayers(data);
    } catch (err) {
      setPlayers([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to search players."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="directory-page">
      <div className="directory-container">

        {/* HERO */}
        <section className="directory-hero players-hero">
          <div className="directory-hero-copy">

            <span className="directory-kicker">
              <Sparkles size={14} />
              GLOBAL PLAYER NETWORK
            </span>

            <h1>
              Meet the players
              <br />
              <span>behind the score.</span>
            </h1>

            <p>
              Every profile is backed by a real CricPulse account.
              Find teammates, build squads and follow player careers
              across every match.
            </p>

            <div className="directory-actions">

              {!profileLoading && myProfile && (
                <Link
                  to={`/players/${myProfile.id}`}
                  className="directory-secondary"
                >
                  <UserRound size={17} />
                  View my profile
                </Link>
              )}

              {!profileLoading && (
                <Link
                  to="/players/me/edit"
                  className="directory-primary"
                >
                  <PlusCircle size={17} />
                  {myProfile
                    ? "Edit my profile"
                    : "Create player profile"}
                </Link>
              )}

              <div className="directory-proof">
                <Trophy size={16} />
                <span>Real accounts · Global players</span>
              </div>

            </div>
          </div>

          <div className="directory-visual">
            <div className="player-orbit">
              <UserRound size={48} />
              <span>CP</span>
            </div>

            <div className="orbit-tag orbit-one">
              BATTER
            </div>

            <div className="orbit-tag orbit-two">
              BOWLER
            </div>

            <div className="orbit-tag orbit-three">
              ALL-ROUNDER
            </div>
          </div>
        </section>

        {/* PROFILE NUDGE */}
        {!profileLoading && !myProfile && (
          <div className="profile-nudge">
            <div>
              <strong>
                Your CricPulse player card is waiting.
              </strong>

              <span>
                Create it once and you'll be selectable in
                teams and matches.
              </span>
            </div>

            <Link to="/players/me/edit">
              Create profile
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* SEARCH */}
        <section className="directory-search-card">

          <div>
            <span className="directory-kicker">
              PLAYER DIRECTORY
            </span>

            <h2>
              {searched
                ? "Search results"
                : "All players"}
            </h2>

            <p>
              Browse every CricPulse player profile or search
              by username and display name.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="directory-search-form"
          >
            <div className="directory-search-input">
              <Search size={19} />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="e.g. virat, sujal, @username"
              />
            </div>

            <button disabled={loading}>
              {loading
                ? "Loading…"
                : "Search players"}
            </button>
          </form>

        </section>

        {/* ERROR */}
        {error && (
          <div className="directory-error">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="directory-empty">
            <div className="pulse-loader" />

            <h3>
              Loading player profiles…
            </h3>

            <p>
              Fetching the CricPulse player network.
            </p>
          </div>
        )}

        {/* NO PLAYERS */}
        {!loading && players.length === 0 && (
          <div className="directory-empty">

            {searched ? (
              <>
                <Search size={40} />

                <h3>
                  No player found
                </h3>

                <p>
                  Try another username or display name.
                </p>
              </>
            ) : (
              <>
                <UserRound size={40} />

                <h3>
                  No player profiles yet
                </h3>

                <p>
                  Create a player profile to appear in the
                  CricPulse directory.
                </p>

                <Link
                  to="/players/me/edit"
                  className="directory-primary"
                >
                  <PlusCircle size={17} />
                  Create profile
                </Link>
              </>
            )}

          </div>
        )}

        {/* ALL PLAYER PROFILES */}
        {!loading && players.length > 0 && (
          <section className="player-directory-section">

            <div className="player-directory-heading">
              <div>
                <span className="directory-kicker">
                  CRICPULSE PLAYERS
                </span>

                <h2>
                  {searched
                    ? `${players.length} player${
                        players.length !== 1 ? "s" : ""
                      } found`
                    : `${players.length} player${
                        players.length !== 1 ? "s" : ""
                      }`}
                </h2>
              </div>

              {searched && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearched(false);
                    loadAllPlayers();
                  }}
                  className="directory-secondary"
                >
                  Show all players
                </button>
              )}
            </div>

            <div className="player-grid">

              {players.map((player) => (
                <Link
                  key={player.id}
                  to={`/players/${player.id}`}
                  className="player-card"
                >

                  <div className="player-card-top">

                    <div className="player-avatar">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt=""
                        />
                      ) : (
                        player.display_name
                          ?.charAt(0)
                          ?.toUpperCase() || "?"
                      )}
                    </div>

                    <span className="player-arrow">
                      <ArrowRight size={18} />
                    </span>

                  </div>

                  <div className="player-card-name">
                    {player.display_name}
                  </div>

                  <div className="player-card-username">
                    @{player.username}
                  </div>

                  <div className="player-card-meta">

                    {player.role && (
                      <span>
                        {player.role}
                      </span>
                    )}

                    {player.location && (
                      <span>
                        <MapPin size={12} />
                        {player.location}
                      </span>
                    )}

                    {player.country && (
                      <span>
                        {player.country}
                      </span>
                    )}

                  </div>

                  <div className="player-card-footer">
                    <span>
                      View cricket profile
                    </span>

                    <ArrowRight size={15} />
                  </div>

                </Link>
              ))}

            </div>
          </section>
        )}

      </div>
    </main>
  );
}