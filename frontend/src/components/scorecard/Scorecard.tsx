import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { matchesApi, type MatchScorecard, type ScorecardInnings } from "../../api/cricpulse";

export default function Scorecard({ matchId }: { matchId: number }) {
  const [data, setData] = useState<MatchScorecard | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const value = await matchesApi.scorecard(matchId);
        if (!alive) return;
        setData(value);
        setOpen((current) => current ?? value.innings[value.innings.length - 1]?.number ?? null);
        setError("");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unable to load scorecard.");
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [matchId]);

  if (error) return <section className="scorecard-panel"><div className="scorecard-error">{error}</div></section>;
  if (!data) return <section className="scorecard-panel"><p className="muted">Loading full scorecard…</p></section>;
  if (!data.innings.length) return <section className="scorecard-panel"><p className="muted">The full scorecard will appear after the first innings starts.</p></section>;

  return (
    <section className="scorecard-panel">
      <div className="scorecard-heading"><div><span className="eyebrow">Match scorecard</span><h2>Complete innings</h2></div><TrendingUp size={22} /></div>
      <div className="scorecard-tabs">
        {data.innings.map((innings) => <button key={innings.id} className={open === innings.number ? "active" : ""} onClick={() => setOpen(innings.number)}>Innings {innings.number}<span>{innings.batting_team.short_name} {innings.runs}/{innings.wickets}</span></button>)}
      </div>
      {data.innings.map((innings) => open === innings.number ? <InningsCard key={innings.id} innings={innings} /> : null)}
    </section>
  );
}

function InningsCard({ innings }: { innings: ScorecardInnings }) {
  return <div className="scorecard-innings">
    <div className="scorecard-total"><div><span>{innings.batting_team.name}</span><strong>{innings.runs}/{innings.wickets}</strong></div><b>{innings.overs} overs</b></div>
    <h3>Batting</h3>
    <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>
      {innings.batting.map((b) => <tr key={b.player_id} className={b.dismissed ? "dismissed-row" : ""}><td><strong>{b.name}</strong></td><td>{b.dismissal || (b.balls ? "not out" : "—")}</td><td><strong>{b.runs}</strong></td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.balls ? ((b.runs * 100) / b.balls).toFixed(2) : "0.00"}</td></tr>)}
      <tr className="extras-row"><td colSpan={2}><strong>Extras</strong></td><td><strong>{innings.extras.total}</strong></td><td colSpan={4}>Wd {innings.extras.wides} · Nb {innings.extras.no_balls} · B {innings.extras.byes} · LB {innings.extras.leg_byes}</td></tr>
      <tr className="total-row"><td colSpan={2}><strong>Total</strong></td><td colSpan={5}><strong>{innings.runs}/{innings.wickets}</strong> ({innings.overs} ov)</td></tr>
    </tbody></table></div>
    <h3>Bowling</h3>
    <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Wd</th><th>Nb</th><th>Econ</th></tr></thead><tbody>{innings.bowling.map((b) => <tr key={b.player_id}><td><strong>{b.name}</strong></td><td>{b.overs}</td><td>{b.runs}</td><td><strong>{b.wickets}</strong></td><td>{b.wides}</td><td>{b.no_balls}</td><td>{b.economy.toFixed(2)}</td></tr>)}</tbody></table></div>
    <div className="scorecard-lower-grid">
      <InfoBlock title="Fall of wickets">{innings.fall_of_wickets.length ? innings.fall_of_wickets.map((f) => <div className="mini-row" key={f.wicket}><span>{f.wicket}-{f.score}</span><strong>{f.player_name}</strong><em>{f.dismissal}{f.fielder ? ` · ${f.fielder}` : ""} · {f.over}</em></div>) : <p className="muted">No wickets yet.</p>}</InfoBlock>
      <InfoBlock title="Partnerships">{innings.partnerships.map((p, index) => <div className="mini-row" key={`${p.wicket ?? "notout"}-${index}`}><span>{p.wicket ? `${p.wicket} WKT` : "Current"}</span><strong>{p.runs} runs</strong><em>{p.dismissed || "partnership in progress"}</em></div>)}</InfoBlock>
    </div>
    <h3 className="over-title">Over-by-over</h3><div className="over-strip">{innings.over_summary.map((o) => <div key={o.over}><span>Over {o.over + 1}</span><strong>{o.runs}</strong></div>)}</div>
  </div>;
}
function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) { return <div className="scorecard-info"><strong>{title}</strong>{children}</div>; }
