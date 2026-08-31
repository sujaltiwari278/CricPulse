import { ArrowLeft, Coins, Edit3, MapPin, Play, Shield, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { matchesApi, type Innings, type Match, type MatchResult, type MatchScorecard, type TossResult } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

export default function MatchDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [innings, setInnings] = useState<Innings[]>([]);
  const [toss, setToss] = useState<TossResult | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [scorecard, setScorecard] = useState<MatchScorecard | null>(null);
  const [call, setCall] = useState<"HEADS" | "TAILS">("HEADS");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [flipping, setFlipping] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const m = await matchesApi.get(Number(id));
      setMatch(m);
      if (["LIVE", "INNINGS_BREAK", "COMPLETED"].includes(m.status)) {
        const loadedInnings = await matchesApi.innings(Number(id));
        setInnings(loadedInnings);
        try { setScorecard(await matchesApi.scorecard(Number(id))); } catch { setScorecard(null); }
        // Result is a completed-match concern. Never call /result for a live
        // match; live chase information is calculated from the innings data.
        if (m.status === "COMPLETED") setResult(await matchesApi.result(Number(id)));
        else setResult(null);
      } else {
        setInnings([]);
        setResult(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Match not found.");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [id]);

  async function flip() {
    if (!id || !match) return;
    try {
      setBusy(true);
      setFlipping(true);
      setError("");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const result = await matchesApi.toss(Number(id), match.team_a.id, call);
      setToss(result);
      setMatch(result.match);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toss failed.");
    } finally {
      setBusy(false);
      setFlipping(false);
    }
  }

  async function choose(decision: "BAT" | "BOWL") {
    if (!id) return;
    try {
      setBusy(true);
      setMatch(await matchesApi.tossDecision(Number(id), decision));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save decision.");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!id) return;
    try {
      setBusy(true);
      setMatch(await matchesApi.start(Number(id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start match.");
    } finally {
      setBusy(false);
    }
  }

  if (!match) {
    return <main className="page-shell"><div className="empty-state">{error || "Loading match..."}</div></main>;
  }

  const owner = user?.id === match.creator_id;
  const format = match.format === "TEST"
    ? `${match.test_days}-day Test · ${match.overs_per_day} overs/day`
    : `${match.format} · ${match.overs} overs`;
  const tossTeam = match.toss_winner_id === match.team_a.id ? match.team_a.name : match.team_b.name;
  const latest = innings[innings.length - 1];
  const mapUrl = match.latitude != null && match.longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${match.longitude - 0.02}%2C${match.latitude - 0.02}%2C${match.longitude + 0.02}%2C${match.latitude + 0.02}&layer=mapnik&marker=${match.latitude}%2C${match.longitude}`
    : null;

  return (
    <main className="page-shell">
      <div className="page-container">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Home</Link>

        <section className="match-hero">
          <div className="match-hero-top">
            <div>
              <div className="status-row"><span className={`status-pill ${match.status === "LIVE" ? "status-live" : ""}`}>{match.status === "LIVE" ? "● LIVE" : match.status}</span><span className="format-pill">{format}</span></div>
              <h1>{match.team_a.name} <span>vs</span> {match.team_b.name}</h1>
              <p>{match.venue || "Cricket ground"}{match.location ? ` · ${match.location}` : ""}</p>
            </div>
            <div className="hero-emblem"><Shield size={38} /></div>
          </div>
          <div className="team-versus">
            <TeamTile team={match.team_a} />
            <div className="versus">VS</div>
            <TeamTile team={match.team_b} />
          </div>
        </section>

        {error && <div className="alert error-alert">{error}</div>}

        {latest && <LiveScoreCard innings={latest} />}

        {!result && latest?.number === 2 && innings[0] && match.status !== "COMPLETED" && (
          <section className="chase-banner">
            <div className="chase-main"><span className="eyebrow">LIVE CHASE · INNINGS 2</span><h2>{latest.batting_team.short_name} need {Math.max(0, innings[0].runs + 1 - latest.runs)} more</h2><p>Target {innings[0].runs + 1} · {latest.overs} overs completed</p></div>
            <div className="chase-stats"><div><strong>{Math.max(0, innings[0].runs + 1 - latest.runs)}</strong><span>Runs required</span></div><div><strong>{match.overs ? Math.max(0, match.overs * 6 - latest.legal_balls) : "—"}</strong><span>Balls remaining</span></div><div><strong>{match.overs && latest.legal_balls ? ((Math.max(0, innings[0].runs + 1 - latest.runs))/(Math.max(1,(match.overs*6-latest.legal_balls)/6))).toFixed(2) : "—"}</strong><span>Required RR</span></div></div>
          </section>
        )}

        {result && <MatchResultBanner result={result} />}

        {scorecard && scorecard.innings.length > 0 && <ScorecardPanel scorecard={scorecard} />}

        <div className="detail-grid">
          <div className="detail-main">
            {owner && ["CREATED", "TOSS_PENDING"].includes(match.status) && (
              <Panel title="Match setup" icon={<Trophy size={18} />}>
                <div className="setup-actions">
                  <Link className="button secondary" to={`/matches/${match.id}/edit`}><Edit3 size={16} /> Edit match</Link>
                </div>
                <p className="muted">Change the format, overs, Test settings, venue or location until scoring starts.</p>
              </Panel>
            )}

            {owner && match.status === "CREATED" && (
              <Panel title="Real coin toss" icon={<Coins size={18} />}>
                <p className="muted">The server makes a fresh cryptographically random heads/tails result for every toss.</p>
                <div className={`toss-coin ${flipping ? "is-flipping" : ""}`}><span>{flipping ? "" : call === "HEADS" ? "H" : "T"}</span></div>
                <div className="coin-choice">
                  {(["HEADS", "TAILS"] as const).map((side) => (
                    <button key={side} onClick={() => setCall(side)} className={`coin-side ${call === side ? "selected" : ""}`}>{side}</button>
                  ))}
                </div>
                <button onClick={flip} disabled={busy} className="button primary full">{busy ? "Flipping..." : "Flip the coin"}</button>
              </Panel>
            )}

            {(toss || match.toss_result) && (
              <Panel title={`Toss result · ${(toss?.result || match.toss_result)}`}>
                <p className="strong">{toss?.winner_team_name || tossTeam} won the toss.</p>
                <p className="muted">Coin: {(toss?.result || match.toss_result)}</p>
              </Panel>
            )}

            {owner && match.status === "TOSS_COMPLETED" && (
              <Panel title={`${tossTeam} chooses`}>
                <div className="button-row">
                  <button disabled={busy} onClick={() => choose("BAT")} className="button primary">Bat first</button>
                  <button disabled={busy} onClick={() => choose("BOWL")} className="button dark">Bowl first</button>
                </div>
              </Panel>
            )}

            {owner && match.status === "READY" && (
              <Panel title="Ready to play">
                <p className="muted">Your match is configured. Starting it locks match settings and opens the live scorer.</p>
                <button onClick={start} disabled={busy} className="button primary">{busy ? "Starting..." : "Start match"}</button>
              </Panel>
            )}

            {["LIVE", "INNINGS_BREAK"].includes(match.status) && owner && (
              <Panel title={match.status === "INNINGS_BREAK" ? "Continue scoring" : "Scoring centre"}>
                <p className="muted">{match.status === "INNINGS_BREAK" ? "The first innings is complete. Continue with the second innings; the batting team is assigned automatically." : "Record every legal ball, extra, wicket and fielder from the scorer."}</p>
                <Link to={`/matches/${match.id}/score`} className="button primary"><Play size={16} /> {match.status === "INNINGS_BREAK" ? "Continue live scoring" : "Open live scorer"}</Link>
              </Panel>
            )}

            {innings.length > 0 && <Commentary innings={innings} />}
          </div>

          <aside className="detail-side">
            <Panel title="Match location" icon={<MapPin size={18} />}>
              {mapUrl ? <iframe title="Match location" src={mapUrl} className="match-map" loading="lazy" /> : <div className="map-placeholder"><MapPin size={28} /><p>No map coordinates added yet.</p><span>Add latitude and longitude while creating/editing the match.</span></div>}
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MatchResultBanner({ result }: { result: MatchResult }) {
  const completed = result.status === "COMPLETED";
  const liveChase = !completed && result.result_type === "CHASE";
  const chaseWonPending = !completed && result.result_type === "CHASE_WON_PENDING";
  const first = result.innings[0];
  const second = result.innings[1];

  if (completed) {
    return <section className="result-banner result-complete">
      <div>
        <span className="eyebrow">MATCH RESULT</span>
        <h2>{result.result_text}</h2>
        <p>{result.innings.map((i) => `${i.team.short_name} ${i.runs}/${i.wickets} (${i.overs} ov)`).join("  ·  ")}</p>
      </div>
      {result.winner && <div className="result-winner"><Trophy size={26}/><strong>{result.winner.short_name}</strong><span>Winner</span></div>}
    </section>;
  }

  if (liveChase || chaseWonPending) {
    return <section className="chase-banner">
      <div className="chase-main">
        <span className="eyebrow">LIVE CHASE · INNINGS 2</span>
        <h2>{result.target_team?.short_name} need {result.runs_required ?? 0} more</h2>
        <p>{result.result_text}</p>
        <div className="chase-progress">
          <div><strong>{first?.team.short_name} {first?.runs}/{first?.wickets}</strong><span>Target {result.target}</span></div>
          <div><strong>{second?.team.short_name} {second?.runs}/{second?.wickets}</strong><span>{second?.overs} overs</span></div>
        </div>
      </div>
      <div className="chase-stats">
        <div><strong>{result.runs_required ?? "—"}</strong><span>Runs required</span></div>
        <div><strong>{result.balls_remaining ?? "—"}</strong><span>Balls remaining</span></div>
        <div><strong>{result.required_run_rate != null ? result.required_run_rate.toFixed(2) : "—"}</strong><span>Required RR</span></div>
      </div>
    </section>;
  }

  return <section className="result-banner">
    <div><span className="eyebrow">MATCH STATUS</span><h2>{result.result_text}</h2><p>{result.innings.map((i) => `${i.team.short_name} ${i.runs}/${i.wickets} (${i.overs} ov)`).join("  ·  ")}</p></div>
  </section>;
}


function ScorecardPanel({ scorecard }: { scorecard: MatchScorecard }) {
  return <section className="scorecard-panel">
    <div className="scorecard-heading"><div><span className="eyebrow">MATCH SCORECARD</span><h2>Full scorecard</h2></div><span className="muted">Live data · refreshes automatically</span></div>
    <div className="scorecard-innings">
      {scorecard.innings.map((inn) => <div className="scorecard-card" key={inn.id}>
        <div className="scorecard-card-head"><div><strong>{inn.batting_team.name}</strong><span>{inn.batting_team.short_name} batting · {inn.overs} ov</span></div><b>{inn.runs}/{inn.wickets}</b></div>
        <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>{inn.batting.map((b) => <tr key={b.player_id}><td>{b.name}<small>{b.dismissed ? ` · ${b.dismissal || "out"}` : " · not out"}</small></td><td>{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.balls ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0"}</td></tr>)}</tbody></table></div>
        <div className="scorecard-extras">Extras <b>{inn.extras.total}</b> (Wd {inn.extras.wides}, Nb {inn.extras.no_balls}, B {inn.extras.byes}, LB {inn.extras.leg_byes})</div>
        <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>{inn.bowling.map((b) => <tr key={b.player_id}><td>{b.name}</td><td>{b.overs}</td><td>{b.runs}</td><td>{b.wickets}</td><td>{b.economy.toFixed(2)}</td></tr>)}</tbody></table></div>
      </div>)}
    </div>
  </section>;
}

function TeamTile({ team }: { team: Match["team_a"] }) {
  return <div className="team-tile"><div className="team-badge">{team.short_name}</div><div><strong>{team.name}</strong><span>{team.city || "Global club"}</span></div></div>;
}

function LiveScoreCard({ innings }: { innings: Innings }) {
  return <section className="live-score-card"><div><span className="eyebrow">Innings {innings.number}</span><h2>{innings.batting_team.short_name} {innings.runs}/{innings.wickets}</h2><p>{innings.overs} overs · {innings.batting_team.name}</p></div><div className="live-batters"><Stat label="Striker" value={innings.striker?.display_name || "Awaiting batter"} /><Stat label="Non-striker" value={innings.non_striker?.display_name || "Awaiting batter"} /><Stat label="Bowler" value={innings.bowler?.display_name || "Awaiting bowler"} /></div></section>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function Commentary({ innings }: { innings: Innings[] }) {
  const deliveries = useMemo(() => innings.flatMap((i) => i.deliveries.map((d) => ({ ...d, inning: i.number }))).reverse().slice(0, 18), [innings]);
  return <Panel title="Ball-by-ball commentary"><div className="commentary-list">{deliveries.length === 0 ? <p className="muted">Commentary will appear after the first delivery.</p> : deliveries.map((d) => <div className="commentary-row" key={d.id}><span className="ball-label">{d.inning}.{d.over_number}.{d.ball_number}</span><div><strong>{d.commentary}</strong><span>{d.striker_name} · {d.bowler_name}{d.wicket_type ? ` · ${d.wicket_type.replaceAll("_", " ")}` : ""}</span></div><b>{d.total_runs}</b></div>)}</div></Panel>;
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) { return <section className="panel"><div className="panel-title">{icon}{title}</div>{children}</section>; }
