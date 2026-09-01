import { CalendarDays, Plus, Search, Shield, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { teamsApi, tournamentsApi, type MatchFormat, type Team, type Tournament } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

const formats: { value: MatchFormat; label: string }[] = [
  { value: "T20", label: "T20" },
  { value: "ODI", label: "ODI" },
  { value: "CUSTOM", label: "Custom" },
  { value: "TEST", label: "Test" },
];

export default function Tournaments() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | Tournament["status"]>("ALL");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ name: "", location: "", start_date: "", end_date: "", format: "T20" as MatchFormat, overs: "20", description: "", team_ids: [] as number[] });
  const [saving, setSaving] = useState(false);
  const visible = useMemo(() => items.filter(t => filter === "ALL" || t.status === filter).filter(t => t.name.toLowerCase().includes(q.toLowerCase())), [items, filter, q]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([tournamentsApi.list(), teamsApi.list()])
      .then(([tournamentsResult, teamsResult]) => {
        if (!mounted) return;

        if (tournamentsResult.status === "fulfilled") {
          setItems(tournamentsResult.value);
        } else {
          setToast("Unable to load tournaments.");
        }

        if (teamsResult.status === "fulfilled") {
          setTeams(teamsResult.value);
        } else {
          setToast("Unable to load your teams.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function toggleTeam(id: number) { setForm(f => ({ ...f, team_ids: f.team_ids.includes(id) ? f.team_ids.filter(x => x !== id) : [...f.team_ids, id] })); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.team_ids.length < 2) return setToast("Select at least two teams.");
    setSaving(true);
    try {
      const created = await tournamentsApi.create({ name: form.name.trim(), location: form.location.trim() || null, start_date: form.start_date || null, end_date: form.end_date || null, format: form.format, overs: form.format === "TEST" ? null : Number(form.overs), description: form.description.trim() || null, team_ids: form.team_ids });
      setItems(v => [created, ...v]);
      setOpen(false);
      setForm({ name: "", location: "", start_date: "", end_date: "", format: "T20", overs: "20", description: "", team_ids: [] });
      setToast("Tournament created.");
    } catch (e) { setToast(e instanceof Error ? e.message : "Unable to create tournament."); }
    finally { setSaving(false); }
  }

  return <main className="directory-page tournament-page">
    <div className="directory-container">
      <section className="directory-hero tournament-hero">
        <div className="directory-hero-copy">
          <span className="directory-kicker"><Trophy size={14}/> CRICKET TOURNAMENTS</span>
          <h1>Compete.<br/><span>Track. Climb.</span></h1>
          <p>Follow tournaments, fixtures, team standings and cricket stories in one place.</p>
          {isAuthenticated && <button className="directory-primary-action" onClick={() => setOpen(true)}><Plus size={17}/> Create tournament</button>}
        </div>
        <div className="tournament-hero-mark"><Trophy size={76}/><strong>{items.length}</strong><small>TOURNAMENTS</small></div>
      </section>

      <section className="directory-search-card">
        <div><span className="directory-kicker">TOURNAMENT DIRECTORY</span><h2>Browse tournaments</h2></div>
        <div className="directory-search-form">
          <div className="directory-search-input"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tournaments…"/></div>
          <select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="ALL">All tournaments</option><option value="UPCOMING">Upcoming</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option>
          </select>
        </div>
      </section>

      {loading ? <div className="directory-empty"><div className="pulse-loader"/><h3>Loading tournaments…</h3></div> :
      visible.length === 0 ? <div className="directory-empty"><Trophy size={38}/><h3>No tournaments yet</h3><p>Create the first tournament using your registered teams.</p></div> :
      <section className="tournament-grid">{visible.map(t => <article className="tournament-card" key={t.id}>
        <div className="tournament-card-top"><span className={`match-status-pill tournament-status-${t.status.toLowerCase()}`}>{t.status}</span><span>{t.format}{t.overs ? ` · ${t.overs} OV` : ""}</span></div>
        <h3>{t.name}</h3>
        <p className="tournament-meta">{t.location || "Location not set"} · {t.teams.length} teams</p>
        <div className="tournament-team-row">{t.teams.slice(0, 6).map(team => <div className="tournament-team-chip" key={team.id}><span>{team.logo_url ? <img src={team.logo_url} alt="" /> : <Shield size={15}/>}</span>{team.short_name}</div>)}</div>
        <div className="tournament-card-footer"><span><CalendarDays size={14}/>{t.start_date || "Date TBA"}</span><span>View tournament →</span></div>
      </article>)}</section>}
    </div>

    {open && <div className="cp-modal-backdrop" onMouseDown={() => setOpen(false)}>
      <form className="cp-modal tournament-create-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <div className="cp-modal-head"><div><span className="directory-kicker">NEW TOURNAMENT</span><h2>Create tournament</h2></div><button type="button" className="cp-modal-close" onClick={() => setOpen(false)}><X size={18}/></button></div>
        <div className="tournament-form-grid">
          <label> Tournament name<input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. City Premier League"/></label>
          <label>Location<input value={form.location} onChange={e => update("location", e.target.value)} placeholder="City / ground area"/></label>
          <label>Start date<input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)}/></label>
          <label>End date<input type="date" value={form.end_date} onChange={e => update("end_date", e.target.value)}/></label>
          <label>Format<select value={form.format} onChange={e => { const v = e.target.value as MatchFormat; update("format", v); if (v === "TEST") update("overs", ""); else if (!form.overs) update("overs", v === "T20" ? "20" : "50"); }}>{formats.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
          {form.format !== "TEST" && <label>Overs per match<input type="number" min="4" value={form.overs} onChange={e => update("overs", e.target.value)}/></label>}
          <label className="wide-field">Description<textarea rows={3} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Tell teams what this tournament is about."/></label>
        </div>
        <div className="tournament-team-picker"><div className="tournament-picker-head"><strong>Select teams</strong><small>{form.team_ids.length} selected</small></div><div className="tournament-team-options">
          {teams.length === 0 ? (
            <div className="tournament-team-empty">
              No registered teams available. Create a team first, then return here.
            </div>
          ) : (
            teams.map(team => (
              <button
                type="button"
                key={team.id}
                className={form.team_ids.includes(team.id) ? "selected" : ""}
                onClick={() => toggleTeam(team.id)}
              >
                <span>{team.logo_url ? <img src={team.logo_url} alt="" /> : <Shield size={16}/>}</span>
                <div><strong>{team.name}</strong><small>{team.city || "Team"}</small></div>
              </button>
            ))
          )}
        </div></div>
        <button className="form-submit" disabled={saving}>{saving ? "Creating tournament…" : "Create tournament"}</button>
      </form>
    </div>}

    {toast && <div className="cp-toast"><span>{toast}</span><button type="button" onClick={() => setToast("")}><X size={14}/></button></div>}
  </main>;
}
