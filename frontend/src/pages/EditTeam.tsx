import { ArrowLeft, Check, Shield, UserMinus, UserPlus, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { playersApi, teamsApi, type Player, type Team } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

type TeamForm = { name: string; short_name: string; city: string; country: string; logo_url: string; description: string };

export default function EditTeam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState<TeamForm>({ name: "", short_name: "", city: "", country: "", logo_url: "", description: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [captainId, setCaptainId] = useState<number | null>(null);

  useEffect(() => {
    const teamId = Number(id);
    if (!Number.isInteger(teamId) || teamId < 1) { setError("Team not found."); return; }
    Promise.all([teamsApi.get(teamId), playersApi.search()]).then(([loadedTeam, allPlayers]) => {
      setTeam(loadedTeam); setPlayers(allPlayers);
      setForm({ name: loadedTeam.name, short_name: loadedTeam.short_name, city: loadedTeam.city || "", country: loadedTeam.country || "", logo_url: loadedTeam.logo_url || "", description: loadedTeam.description || "" });
      setCaptainId(loadedTeam.captain_id);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load the team editor."));
  }, [id]);

  const memberIds = useMemo(() => new Set(team?.members.map((member) => member.player_id) ?? []), [team]);
  const availablePlayers = players.filter((player) => !memberIds.has(player.id));
  const owner = team && Number(team.owner_id) === Number(user?.id);

  function update(field: keyof TeamForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function useUpdatedTeam(updated: Team, note: string) { setTeam(updated); setCaptainId(updated.captain_id); setMessage(note); setError(""); }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault(); if (!team) return;
    setSaving(true); setMessage(""); setError("");
    try {
      const updated = await teamsApi.update(team.id, { name: form.name.trim(), short_name: form.short_name.trim().toUpperCase(), city: form.city.trim() || null, country: form.country.trim() || null, logo_url: form.logo_url.trim() || null, description: form.description.trim() || null, captain_id: captainId });
      useUpdatedTeam(updated, "Team details saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save team details."); }
    finally { setSaving(false); }
  }

  async function saveCaptain(nextCaptainId: number | null) {
    if (!team || saving) return;
    setCaptainId(nextCaptainId);
    setSaving(true); setError("");
    try { useUpdatedTeam(await teamsApi.update(team.id, { captain_id: nextCaptainId }), nextCaptainId ? "Captain updated." : "Captain removed."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update captain."); }
    finally { setSaving(false); }
  }

  async function addPlayer(playerId: number) {
    if (!team || saving) return; setSaving(true); setError("");
    try { useUpdatedTeam(await teamsApi.addMember(team.id, playerId), "Player added to the squad."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add player."); }
    finally { setSaving(false); }
  }

  async function removePlayer(playerId: number) {
    if (!team || saving) return; setSaving(true); setError("");
    try { useUpdatedTeam(await teamsApi.removeMember(team.id, playerId), "Player removed from the squad."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove player."); }
    finally { setSaving(false); }
  }

  if (error && !team) return <main className="create-page"><div className="create-container"><Link className="back-link" to="/teams"><ArrowLeft size={16} /> Teams</Link><div className="directory-error">{error}</div></div></main>;
  if (!team) return <main className="create-page"><div className="create-container"><div className="directory-empty"><div className="pulse-loader" /><h3>Loading team editor…</h3></div></div></main>;
  if (!owner) return <main className="create-page"><div className="create-container"><Link className="back-link" to={`/teams/${team.id}`}><ArrowLeft size={16} /> {team.name}</Link><div className="directory-error">Only the team owner can edit this squad.</div></div></main>;

  return <main className="create-page"><div className="create-container">
    <Link className="back-link" to={`/teams/${team.id}`}><ArrowLeft size={16} /> Back to {team.name}</Link>
    <section className="create-hero"><div className="create-hero-icon"><Shield size={28} /></div><div><p className="directory-kicker">TEAM MANAGEMENT</p><h1>Edit {team.name}</h1><p>Update club details and manage the active squad.</p></div><div className="squad-counter"><span>SQUAD SIZE</span><strong>{team.members.length}</strong><small>5–11 players</small></div></section>
    {error && <div className="directory-error">{error}</div>}{message && <div className="success-message"><Check size={16} /> {message}</div>}
    <div className="create-layout">
      <form className="form-card" onSubmit={saveDetails}><div className="form-card-heading"><div><p className="directory-kicker">CLUB PROFILE</p><h2>Team details</h2></div><Shield size={22} /></div>
        <label>Team name<input required value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Short name<input required maxLength={10} value={form.short_name} onChange={(event) => update("short_name", event.target.value)} /></label>
        <label>City<input value={form.city} onChange={(event) => update("city", event.target.value)} /></label>
        <label>Country<input value={form.country} onChange={(event) => update("country", event.target.value)} /></label>
        <label>Logo URL<input type="url" value={form.logo_url} onChange={(event) => update("logo_url", event.target.value)} placeholder="https://…" /></label>
        <label>Description<textarea rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
        <button className="form-submit" disabled={saving}>{saving ? "Saving…" : "Save team details"}</button>
      </form>
      <section className="form-card player-picker"><div className="form-card-heading"><div><p className="directory-kicker">SQUAD</p><h2>Manage players</h2></div><Users size={22} /></div>
        <div className="picker-grid">{team.members.map((member) => <div className="picker-player chosen" key={member.player_id}><div className="picker-avatar">{member.photo_url ? <img src={member.photo_url} alt="" /> : member.display_name.charAt(0)}</div><div><strong>{member.display_name}</strong><span>@{member.username}</span></div><button type="button" aria-label={`Remove ${member.display_name}`} disabled={saving || team.members.length <= 5} onClick={() => removePlayer(member.player_id)}><UserMinus size={17} /></button></div>)}</div>
        <div className="picker-footer"><span>{team.members.length <= 5 ? "Keep at least five players in a team." : "Remove players who are no longer in the squad."}</span><strong>{team.members.length}/11</strong></div>        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="form-card-heading !mb-3"><div><p className="directory-kicker">LEADERSHIP</p><h2>Team captain</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">CAPTAIN</span></div>
          <p className="mb-3 text-sm text-slate-500">Choose one player from the current squad. The captain is saved to the team and can be changed any time.</p>
          <select value={captainId ?? ""} onChange={(e) => saveCaptain(e.target.value ? Number(e.target.value) : null)} disabled={saving} className="input">
            <option value="">No captain selected</option>
            {team.members.map((member) => <option key={member.player_id} value={member.player_id}>{member.display_name}{member.role ? ` · ${member.role}` : ""}</option>)}
          </select>
          {team.captain && <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3"><div className="picker-avatar">{team.captain.photo_url ? <img src={team.captain.photo_url} alt="" /> : team.captain.display_name.charAt(0)}</div><div><strong>{team.captain.display_name}</strong><span className="block text-xs text-slate-500">Current captain</span></div></div>}
        </div>

        <div className="form-card-heading mt-6"><div><p className="directory-kicker">AVAILABLE PLAYERS</p><h2>Add to squad</h2></div><UserPlus size={22} /></div>
        <div className="picker-grid">{availablePlayers.length ? availablePlayers.map((player) => <button type="button" className="picker-player" key={player.id} disabled={saving || team.members.length >= 11} onClick={() => addPlayer(player.id)}><div className="picker-avatar">{player.photo_url ? <img src={player.photo_url} alt="" /> : player.display_name.charAt(0)}</div><div><strong>{player.display_name}</strong><span>@{player.username}</span></div><UserPlus size={17} /></button>) : <div className="picker-empty"><Users size={26} /><strong>No more registered players available</strong></div>}</div>
      </section>
    </div>
    <button type="button" className="profile-edit-button mt-5" onClick={() => navigate(`/teams/${team.id}`)}>Done managing team</button>
  </div></main>;
}
