import { ArrowLeft, CalendarDays, MapPin, Shield, Trash2, Trophy, Users, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { tournamentsApi, type Tournament } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

function dateRange(tournament: Tournament) {
  if (!tournament.start_date && !tournament.end_date) return "Dates to be confirmed";
  if (!tournament.end_date || tournament.end_date === tournament.start_date) return tournament.start_date!;
  return `${tournament.start_date} – ${tournament.end_date}`;
}

export default function TournamentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const tournamentId = Number(id);
    if (!Number.isInteger(tournamentId) || tournamentId < 1) {
      setError("Tournament not found.");
      return;
    }
    tournamentsApi.get(tournamentId)
      .then(setTournament)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load tournament."));
  }, [id]);

  async function deleteTournament() {
    if (!tournament || deleting) return;
    setDeleting(true);
    try {
      await tournamentsApi.delete(tournament.id);
      navigate("/tournaments", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete tournament.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (error) return <main className="tournament-detail-page"><div className="tournament-detail-container"><Link to="/tournaments" className="tournament-back"><ArrowLeft size={16} /> Tournaments</Link><div className="tournament-error">{error}</div></div></main>;
  if (!tournament) return <main className="tournament-detail-page"><div className="tournament-detail-container"><div className="directory-empty"><div className="pulse-loader" /><h3>Loading tournament…</h3></div></div></main>;

  const isOwner = Number(user?.id) === Number(tournament.creator_id);
  return <main className="tournament-detail-page"><div className="tournament-detail-container">
    <Link to="/tournaments" className="tournament-back"><ArrowLeft size={16} /> All tournaments</Link>
    <section className="tournament-detail-hero">
      <div><span className={`match-status-pill tournament-status-${tournament.status.toLowerCase()}`}>{tournament.status}</span><p className="directory-kicker"><Trophy size={14} /> CRICPULSE TOURNAMENT</p><h1>{tournament.name}</h1><p className="tournament-detail-description">{tournament.description || "Tournament details and participating teams."}</p></div>
      <div className="tournament-format-badge"><strong>{tournament.format}</strong><span>{tournament.overs ? `${tournament.overs} OVERS` : "MULTI-DAY"}</span></div>
    </section>
    <section className="tournament-info-grid">
      <Info icon={<CalendarDays size={19} />} label="Tournament dates" value={dateRange(tournament)} />
      <Info icon={<MapPin size={19} />} label="Location" value={tournament.location || "Location to be confirmed"} />
      <Info icon={<Users size={19} />} label="Participating teams" value={`${tournament.teams.length} registered`} />
    </section>
    <section className="tournament-squads-card"><div className="tournament-section-heading"><div><span className="directory-kicker">PARTICIPANTS</span><h2>Teams in this tournament</h2></div><span>{tournament.teams.length} teams</span></div><div className="tournament-detail-teams">
      {tournament.teams.map((team) => <Link key={team.id} to={`/teams/${team.id}`} className="tournament-detail-team"><span className="tournament-detail-logo">{team.logo_url ? <img src={team.logo_url} alt="" /> : <Shield size={23} />}</span><div><strong>{team.name}</strong><small>{team.city || "CricPulse team"} · {team.short_name}</small></div><span aria-hidden="true">→</span></Link>)}
    </div></section>
    {isOwner && <section className="tournament-danger-zone"><div><span className="directory-kicker">TOURNAMENT SETTINGS</span><h2>Delete tournament</h2><p>Remove this tournament and its team registrations permanently.</p></div><div>{confirmingDelete ? <div className="tournament-delete-confirm"><span>Delete {tournament.name}?</span><button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancel</button><button type="button" onClick={deleteTournament} disabled={deleting}>{deleting ? "Deleting…" : "Yes, delete"}</button></div> : <button className="tournament-delete-button" type="button" onClick={() => setConfirmingDelete(true)}><Trash2 size={16} /> Delete tournament</button>}</div></section>}
    {error && <div className="tournament-error"><X size={16} /> {error}</div>}
  </div></main>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="tournament-info-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
}
