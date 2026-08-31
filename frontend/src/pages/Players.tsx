import { Search, UserRound, MapPin, ArrowRight, PlusCircle, Trophy, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { playersApi, type Player } from "../api/cricpulse";

export default function Players() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [myProfile, setMyProfile] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    playersApi.me().then(setMyProfile).catch(() => setMyProfile(null)).finally(() => setProfileLoading(false));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { setPlayers([]); setSearched(false); setError(""); return; }
    try { setLoading(true); setSearched(true); setError(""); setPlayers(await playersApi.search(q)); }
    catch (err) { setPlayers([]); setError(err instanceof Error ? err.message : "Unable to search players."); }
    finally { setLoading(false); }
  }

  return <main className="directory-page">
    <div className="directory-container">
      <section className="directory-hero players-hero">
        <div className="directory-hero-copy">
          <span className="directory-kicker"><Sparkles size={14}/> GLOBAL PLAYER NETWORK</span>
          <h1>Meet the players<br/><span>behind the score.</span></h1>
          <p>Every profile is backed by a real CricPulse account. Find teammates, build squads and follow player careers across every match.</p>
          <div className="directory-actions">
            {!profileLoading && myProfile && <Link to={`/players/${myProfile.id}`} className="directory-secondary"><UserRound size={17}/>View my profile</Link>}
            {!profileLoading && <Link to="/players/me/edit" className="directory-primary"><PlusCircle size={17}/>{myProfile ? "Edit my profile" : "Create player profile"}</Link>}
            <div className="directory-proof"><Trophy size={16}/><span>Real accounts · Global search</span></div>
          </div>
        </div>
        <div className="directory-visual"><div className="player-orbit"><UserRound size={48}/><span>CP</span></div><div className="orbit-tag orbit-one">BATTER</div><div className="orbit-tag orbit-two">BOWLER</div><div className="orbit-tag orbit-three">ALL-ROUNDER</div></div>
      </section>

      {!profileLoading && !myProfile && <div className="profile-nudge"><div><strong>Your CricPulse player card is waiting.</strong><span>Create it once and you'll be selectable in teams and matches.</span></div><Link to="/players/me/edit">Create profile <ArrowRight size={16}/></Link></div>}

      <section className="directory-search-card">
        <div><span className="directory-kicker">PLAYER SEARCH</span><h2>Find a cricketer</h2><p>Search by unique username or display name.</p></div>
        <form onSubmit={handleSearch} className="directory-search-form"><div className="directory-search-input"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. virat, sujal, @username" /></div><button disabled={loading}>{loading ? "Searching…" : "Search players"}</button></form>
      </section>

      {error && <div className="directory-error">{error}</div>}
      {loading && <div className="directory-empty"><div className="pulse-loader"/><h3>Searching the player network…</h3></div>}
      {!loading && !searched && <div className="directory-empty"><UserRound size={40}/><h3>Search the global player pool</h3><p>Start with a username or player name to discover real CricPulse profiles.</p></div>}
      {!loading && searched && players.length === 0 && <div className="directory-empty"><Search size={40}/><h3>No player found</h3><p>Try another username or display name.</p></div>}

      {!loading && players.length > 0 && <section className="player-grid">{players.map(player => <Link key={player.id} to={`/players/${player.id}`} className="player-card">
        <div className="player-card-top"><div className="player-avatar">{player.photo_url ? <img src={player.photo_url} alt="" /> : player.display_name?.[0]?.toUpperCase()}</div><span className="player-arrow"><ArrowRight size={18}/></span></div>
        <div className="player-card-name">{player.display_name}</div><div className="player-card-username">@{player.username}</div>
        <div className="player-card-meta">{player.role && <span>{player.role}</span>}{player.location && <span><MapPin size={12}/>{player.location}</span>}</div>
        <div className="player-card-footer"><span>View cricket profile</span><ArrowRight size={15}/></div>
      </Link>)}</section>}
    </div>
  </main>;
}
