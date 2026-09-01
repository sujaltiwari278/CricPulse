import { Plus, Search, Shield, Users, ArrowRight, MapPin, Trophy, MoreVertical, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { teamsApi, type Team } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

export default function Teams() {
  const { isAuthenticated, user } = useAuth();
  const [query, setQuery] = useState(""); const [teams, setTeams] = useState<Team[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [menuTeamId, setMenuTeamId] = useState<number | null>(null); const [deleteTeamId, setDeleteTeamId] = useState<number | null>(null); const [deleting, setDeleting] = useState(false);
  async function load(q="") { try { setLoading(true); setError(""); setTeams(await teamsApi.list(q)); } catch(e) { setError(e instanceof Error ? e.message : "Unable to load teams."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function search(e: React.FormEvent) { e.preventDefault(); await load(query.trim()); }
  async function confirmDeleteTeam() {
    if (deleteTeamId === null || deleting) return;
    try {
      setDeleting(true); setError("");
      await teamsApi.delete(deleteTeamId);
      setTeams(current => current.filter(team => team.id !== deleteTeamId));
      setDeleteTeamId(null); setMenuTeamId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete team.");
    } finally { setDeleting(false); }
  }
  return <main className="directory-page">
    <style>{`
      .teams-hero .team-visual{
        position:relative;
        display:grid;
        place-items:center;
        min-height:260px;
      }
      .teams-hero .team-score-chip{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        line-height:1;
        white-space:nowrap;
      }
      .teams-hero .team-score-chip svg{
        display:block;
        flex:0 0 auto;
      }
      .team-card-menu-wrap{position:relative;display:flex;align-items:center;}
      .team-card-menu{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:inherit;cursor:pointer;}
      .team-card-menu:hover{background:rgba(15,23,42,.07);}
      .team-card-menu-popover{position:absolute;right:0;top:40px;z-index:20;min-width:145px;padding:5px;border:1px solid rgba(15,23,42,.09);border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.14);}
      .team-card-menu-popover button{width:100%;display:flex;align-items:center;gap:8px;border:0;border-radius:9px;padding:9px 10px;background:transparent;color:#b42318;font-weight:800;font-size:12px;cursor:pointer;text-align:left;}
      .team-card-menu-popover button:hover{background:#fff1f0;}
      .team-delete-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.48);}
      .team-delete-modal{width:min(420px,100%);border-radius:22px;background:#fff;padding:24px;box-shadow:0 24px 70px rgba(2,6,23,.25);}
      .team-delete-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
      .team-delete-modal h2{margin:4px 0 0;font-size:22px;font-weight:900;color:#111827;}
      .team-delete-modal p{margin:9px 0 0;color:#667085;font-size:13px;line-height:1.5;}
      .team-delete-close{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:10px;background:#f4f5f7;cursor:pointer;}
      .team-delete-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px;}
      .team-delete-actions button{border:0;border-radius:11px;padding:10px 14px;font-weight:900;cursor:pointer;}
      .team-delete-cancel{background:#f2f4f7;color:#344054;}
      .team-delete-confirm{background:#b42318;color:#fff;}
      .team-delete-actions button:disabled{opacity:.55;cursor:not-allowed;}
    `}</style>
    <div className="directory-container">
      <section className="directory-hero teams-hero">
        <div className="directory-hero-copy"><span className="directory-kicker"><Shield size={14}/> GLOBAL CLUB NETWORK</span><h1>Find your<br/><span>cricket tribe.</span></h1><p>Create real squads from registered players, then take them into live matches. No dummy teams, no fake rosters.</p><div className="directory-actions">{isAuthenticated && <Link to="/teams/create" className="directory-primary"><Plus size={17}/>Create a team</Link>}<div className="directory-proof"><Users size={16}/><span>5–11 real players per squad</span></div></div></div>
        <div className="team-visual"><div className="team-shield"><Shield size={50}/><span>XI</span></div><div className="team-score-chip"><Trophy size={15}/><strong>PLAY TO WIN</strong></div></div>
      </section>
      <section className="directory-search-card"><div><span className="directory-kicker">TEAM DIRECTORY</span><h2>Explore teams</h2><p>Search clubs by name, short name or city.</p></div><form onSubmit={search} className="directory-search-form"><div className="directory-search-input"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search teams or city"/></div><button disabled={loading}>{loading ? "Loading…" : "Search teams"}</button></form></section>
      {error && <div className="directory-error">{error}</div>}
      {loading ? <div className="directory-empty"><div className="pulse-loader"/><h3>Loading the team network…</h3></div> : teams.length === 0 ? <div className="directory-empty"><Shield size={40}/><h3>No teams yet</h3><p>Create the first real CricPulse squad and make it selectable in matches.</p>{isAuthenticated && <Link to="/teams/create" className="directory-primary compact"><Plus size={16}/>Create team</Link>}</div> : <section className="team-grid">{teams.map(team=>{ const isOwner = Number(team.owner_id) === Number(user?.id); return <Link key={team.id} to={`/teams/${team.id}`} className="team-card">
        <div className="team-card-top"><div className="team-mark">{team.logo_url ? <img src={team.logo_url} alt="" /> : team.short_name}</div><div className="team-card-menu-wrap">{isOwner ? <button type="button" className="team-card-menu" aria-label={`Team options for ${team.name}`} onClick={e=>{e.preventDefault();e.stopPropagation();setMenuTeamId(menuTeamId===team.id?null:team.id)}}><MoreVertical size={19}/></button> : <ArrowRight size={18}/>}
          {isOwner && menuTeamId===team.id && <div className="team-card-menu-popover" onClick={e=>{e.preventDefault();e.stopPropagation()}}><button type="button" onClick={()=>setDeleteTeamId(team.id)}><Trash2 size={15}/>Delete team</button></div>}
        </div></div>
        <h3>{team.name}</h3><p className="team-location"><MapPin size={13}/>{team.city || "Global club"}</p><div className="team-card-stats"><span><Users size={14}/>{team.members.length} players</span><span>Open squad <ArrowRight size={13}/></span></div>
      </Link>})}</section>}
    </div>
    {deleteTeamId !== null && (() => { const team = teams.find(t => t.id === deleteTeamId); return <div className="team-delete-backdrop" onMouseDown={()=>!deleting&&setDeleteTeamId(null)}>
      <div className="team-delete-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="team-delete-modal-head"><div><span className="directory-kicker">TEAM SETTINGS</span><h2>Delete {team?.name || "this team"}?</h2></div><button type="button" className="team-delete-close" onClick={()=>setDeleteTeamId(null)} disabled={deleting}><X size={16}/></button></div>
        <p>This will permanently remove the team from CricPulse. This action cannot be undone.</p>
        <div className="team-delete-actions"><button type="button" className="team-delete-cancel" onClick={()=>setDeleteTeamId(null)} disabled={deleting}>Cancel</button><button type="button" className="team-delete-confirm" onClick={confirmDeleteTeam} disabled={deleting}>{deleting?"Deleting…":"Delete team"}</button></div>
      </div>
    </div>; })()}
  </main>;
}
