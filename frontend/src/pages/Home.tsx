import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, MoreHorizontal, Plus, Radio, Trophy, Users, Zap, Trash2, CheckCircle2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { matchesApi, type Innings, type Match } from "../api/cricpulse";

type MatchSnapshot = {
  match: Match;
  innings: Innings[];
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, Innings[]>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const items = await matchesApi.list();
        if (!mounted) return;
        setMatches(items);

        const live = items.filter((m) => m.status === "LIVE");
        const results = await Promise.all(
          live.map(async (match) => {
            try {
              return [match.id, await matchesApi.innings(match.id)] as const;
            } catch {
              return [match.id, []] as const;
            }
          }),
        );

        if (mounted) setSnapshots(Object.fromEntries(results));
      } catch {
        if (mounted) setMatches([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const liveMatches = useMemo(() => matches.filter((m) => m.status === "LIVE"), [matches]);
  const upcoming = useMemo(
    () => matches.filter((m) => m.status !== "LIVE" && m.status !== "COMPLETED").slice(0, 6),
    [matches],
  );
  const completed = useMemo(
    () => matches.filter((m) => m.status === "COMPLETED").slice(0, 6),
    [matches],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-glow home-hero-glow-one" />
        <div className="home-hero-glow home-hero-glow-two" />
        <div className="home-container home-hero-inner">
          <div className="home-hero-copy">
            <div className="home-kicker"><span className="home-live-dot" /> REAL CRICKET. REAL PLAYERS. REAL TIME.</div>
            <h1>Every ball<br /><span>has a story.</span></h1>
            <p>Score local cricket with a real global player network, live match centres, ball-by-ball commentary and cricket analytics.</p>
            <div className="home-hero-actions">
              {isAuthenticated ? (
                <Link to="/matches/create" className="home-primary-button"><Plus size={18} /> Create a match</Link>
              ) : (
                <Link to="/auth" className="home-primary-button">Join CricPulse <ArrowRight size={18} /></Link>
              )}
              <Link to="/matches" className="home-secondary-button">Explore cricket <ArrowRight size={17} /></Link>
            </div>
          </div>
          <div className="home-scoreboard-art" aria-hidden="true">
            <div className="home-scoreboard-top"><span><span className="home-live-dot" /> LIVE SCORING</span><span>CRICPULSE</span></div>
            <div className="home-scoreboard-team"><span>LIVE</span><strong>REAL<span> DATA</span></strong></div>
            <div className="home-scoreboard-meta"><span>Ball by ball</span><span>Instant updates</span></div>
            <div className="home-scoreboard-over"><b>CRICKET ENGINE</b><span>BAT</span><span>BOWL</span><span>RUN</span><span>WKT</span></div>
          </div>
        </div>
      </section>

      <section className="home-stats-strip">
        <div className="home-container home-stats-grid">
          <Stat icon={<Radio size={19} />} value={String(liveMatches.length)} label="Live matches" />
          <Stat icon={<Users size={19} />} value="REAL" label="Player accounts" />
          <Stat icon={<Trophy size={19} />} value="5–11" label="Players per XI" />
          <Stat icon={<Zap size={19} />} value="4+" label="Overs per match" />
        </div>
      </section>

      <section className="home-container home-content">
        <div className="home-section-heading">
          <div>
            <span className="home-section-kicker">MATCH HUB</span>
            <h2>Live cricket, right now</h2>
            <p>Follow matches being scored on CricPulse in real time.</p>
          </div>
        </div>

        {loading ? (
          <div className="home-loading-grid"><div className="home-skeleton" /><div className="home-skeleton" /><div className="home-skeleton" /></div>
        ) : liveMatches.length === 0 ? (
          <div className="home-empty-live">
            <div className="home-empty-icon"><Radio size={24} /></div>
            <div><strong>No live matches right now</strong><p>Start a real match and it will appear here automatically.</p></div>
            {isAuthenticated && <Link to="/matches/create" className="home-primary-button small">Start scoring <ArrowRight size={16} /></Link>}
          </div>
        ) : (
          <div className="home-match-grid">
            {liveMatches.map((match) => <LiveMatchCard key={match.id} match={match} innings={snapshots[match.id] ?? []} canDelete={!!user && Number(user.id) === Number(match.creator_id)} onDeleted={(id) => { setMatches((current) => current.filter((item) => item.id !== id)); setToast("Match deleted successfully"); }} />)}
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="home-subsection">
            <div className="home-section-heading compact"><div><span className="home-section-kicker">UP NEXT</span><h2>Upcoming matches</h2></div><Link to="/matches" className="home-text-link">View all <ArrowRight size={15} /></Link></div>
            <div className="home-match-grid">{upcoming.map((match) => <StandardMatchCard key={match.id} match={match} canDelete={!!user && Number(user.id) === Number(match.creator_id)} onDeleted={(id) => { setMatches((current) => current.filter((item) => item.id !== id)); setToast("Match deleted successfully"); }} />)}</div>
          </section>
        )}

        {completed.length > 0 && (
          <section className="home-subsection">
            <div className="home-section-heading compact"><div><span className="home-section-kicker">RESULTS</span><h2>Recent matches</h2></div></div>
            <div className="home-match-grid">{completed.map((match) => <StandardMatchCard key={match.id} match={match} canDelete={!!user && Number(user.id) === Number(match.creator_id)} onDeleted={(id) => { setMatches((current) => current.filter((item) => item.id !== id)); setToast("Match deleted successfully"); }} />)}</div>
          </section>
        )}
      </section>
      {toast && <div className="cp-toast" role="status"><CheckCircle2 size={17} /><span>{toast}</span><button type="button" onClick={() => setToast("")} aria-label="Close notification"><X size={15} /></button></div>}
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="home-stat"><span className="home-stat-icon">{icon}</span><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function MatchMenu({ match, canDelete, onDeleted }: { match: Match; canDelete: boolean; onDeleted: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setMessage("");
    try {
      await matchesApi.delete(match.id);
      onDeleted(match.id);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete match.");
    } finally {
      setDeleting(false);
    }
  }

  if (!canDelete) return null;

  return (
    <div className="match-card-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="match-card-menu-button" aria-label={`More options for ${match.team_a.name} vs ${match.team_b.name}`} aria-expanded={open} onClick={(event) => { event.preventDefault(); setMessage(""); setOpen((value) => !value); }}>
        <MoreHorizontal size={18} strokeWidth={2.4} />
      </button>
      {open && (
        <div className="match-card-menu-popover" role="menu">
          <div className="match-card-menu-title">Match options</div>
          <button type="button" className="match-card-delete" onClick={handleDelete} disabled={deleting}><Trash2 size={15} />{deleting ? "Deleting…" : "Delete match"}</button>
          <button type="button" className="match-card-cancel" onClick={() => setOpen(false)} disabled={deleting}>Cancel</button>
          {message && <div className="match-card-delete-error"><X size={13} />{message}</div>}
        </div>
      )}
    </div>
  );
}

function LiveMatchCard({ match, innings, canDelete, onDeleted }: MatchSnapshot & { canDelete: boolean; onDeleted: (id: number) => void }) {
  const current = innings[innings.length - 1];
  return (
    <article className="home-live-card">
      <MatchMenu match={match} canDelete={canDelete} onDeleted={onDeleted} />
      <Link to={`/matches/${match.id}`} className="home-card-link">
        <div className="home-card-head"><span className="home-live-pill"><span className="home-live-dot" /> LIVE</span><span>{formatLabel(match)}</span></div>
        <div className="home-card-teams">
          <TeamScore name={match.team_a.name} score={innings.find((i) => i.batting_team.id === match.team_a.id)} />
          <span className="home-vs">VS</span>
          <TeamScore name={match.team_b.name} score={innings.find((i) => i.batting_team.id === match.team_b.id)} />
        </div>
        <div className="home-card-foot">
          <span>{current ? `${current.overs} ov` : "Live scoring"}</span>
          <span>{match.venue || match.location || "Venue not specified"}</span>
          <ArrowRight size={17} />
        </div>
      </Link>
    </article>
  );
}

function TeamScore({ name, score }: { name: string; score?: Innings }) {
  return <div className="home-team-score"><span>{name}</span>{score ? <strong>{score.runs}<small>/{score.wickets}</small></strong> : <em>—</em>}</div>;
}

function StandardMatchCard({ match, canDelete, onDeleted }: { match: Match; canDelete: boolean; onDeleted: (id: number) => void }) {
  return (
    <article className="home-standard-card">
      <MatchMenu match={match} canDelete={canDelete} onDeleted={onDeleted} />
      <Link to={`/matches/${match.id}`} className="home-card-link">
        <div className="home-card-head"><span className="home-status-pill">{match.status.replaceAll("_", " ")}</span><span>{formatLabel(match)}</span></div>
        <div className="home-standard-teams"><strong>{match.team_a.name}</strong><span>vs</span><strong>{match.team_b.name}</strong></div>
        <div className="home-standard-foot"><span><MapPin size={14} /> {match.venue || match.location || "Venue TBA"}</span><ArrowRight size={17} /></div>
      </Link>
    </article>
  );
}

function formatLabel(match: Match) {
  if (match.format === "TEST") return `TEST · ${match.overs_per_day ?? "—"} ov/day`;
  return `${match.format} · ${match.overs ?? "—"} overs`;
}
