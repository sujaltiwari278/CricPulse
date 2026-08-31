import { Plus, Search, Shield, Users, ArrowRight, MapPin, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { teamsApi, type Team } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

export default function Teams() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState(""); const [teams, setTeams] = useState<Team[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  async function load(q="") { try { setLoading(true); setError(""); setTeams(await teamsApi.list(q)); } catch(e) { setError(e instanceof Error ? e.message : "Unable to load teams."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function search(e: React.FormEvent) { e.preventDefault(); await load(query.trim()); }
  return <main className="directory-page">
    <div className="directory-container">
      <section className="directory-hero teams-hero">
        <div className="directory-hero-copy"><span className="directory-kicker"><Shield size={14}/> GLOBAL CLUB NETWORK</span><h1>Find your<br/><span>cricket tribe.</span></h1><p>Create real squads from registered players, then take them into live matches. No dummy teams, no fake rosters.</p><div className="directory-actions">{isAuthenticated && <Link to="/teams/create" className="directory-primary"><Plus size={17}/>Create a team</Link>}<div className="directory-proof"><Users size={16}/><span>5–11 real players per squad</span></div></div></div>
        <div className="team-visual"><div className="team-shield"><Shield size={50}/><span>XI</span></div><div className="team-score-chip"><Trophy size={15}/><strong>PLAY TO WIN</strong></div></div>
      </section>
      <section className="directory-search-card"><div><span className="directory-kicker">TEAM DIRECTORY</span><h2>Explore teams</h2><p>Search clubs by name, short name or city.</p></div><form onSubmit={search} className="directory-search-form"><div className="directory-search-input"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search teams or city"/></div><button disabled={loading}>{loading ? "Loading…" : "Search teams"}</button></form></section>
      {error && <div className="directory-error">{error}</div>}
      {loading ? <div className="directory-empty"><div className="pulse-loader"/><h3>Loading the team network…</h3></div> : teams.length === 0 ? <div className="directory-empty"><Shield size={40}/><h3>No teams yet</h3><p>Create the first real CricPulse squad and make it selectable in matches.</p>{isAuthenticated && <Link to="/teams/create" className="directory-primary compact"><Plus size={16}/>Create team</Link>}</div> : <section className="team-grid">{teams.map(team=><Link key={team.id} to={`/teams/${team.id}`} className="team-card"><div className="team-card-top"><div className="team-mark">{team.logo_url ? <img src={team.logo_url} alt="" /> : team.short_name}</div><ArrowRight size={18}/></div><h3>{team.name}</h3><p className="team-location"><MapPin size={13}/>{team.city || "Global club"}</p><div className="team-card-stats"><span><Users size={14}/>{team.members.length} players</span><span>Open squad <ArrowRight size={13}/></span></div></Link>)}</section>}
    </div>
  </main>;
}
