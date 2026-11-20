import { useEffect, useState, type ReactNode } from "react";
import { Activity, CircleDot, TrendingUp } from "lucide-react";
import {
  matchesApi,
  type MatchScorecard,
  type ScorecardInnings,
} from "../../api/cricpulse";

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
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [matchId]);

  if (error && !data) {
    return <section className="cg-scorecard"><div className="cg-scorecard-message cg-scorecard-error">{error}</div></section>;
  }

  if (!data) {
    return <section className="cg-scorecard"><div className="cg-scorecard-message">Loading full scorecard…</div></section>;
  }

  if (!data.innings.length) {
    return <section className="cg-scorecard"><div className="cg-scorecard-message">The full scorecard will appear after the first innings starts.</div></section>;
  }

  const activeInnings = data.innings.find((innings) => innings.number === open) ?? data.innings[data.innings.length - 1];

  return (
    <section className="cg-scorecard" aria-label="Match scorecard">
      <div className="cg-scorecard-heading">
        <div>
          <span className="cg-scorecard-eyebrow">Match scorecard</span>
          <h2>Complete innings</h2>
          <p>Batting, bowling and match breakdown</p>
        </div>
        <span className="cg-scorecard-heading-icon" aria-hidden="true"><TrendingUp size={22} /></span>
      </div>

      {error && <div className="cg-scorecard-refresh-error">Latest refresh failed: {error}. Showing the last available scorecard.</div>}

      <div className="cg-innings-tabs" role="tablist" aria-label="Select innings">
        {data.innings.map((innings) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeInnings.number === innings.number}
            key={innings.id}
            className={`cg-innings-tab${activeInnings.number === innings.number ? " is-active" : ""}`}
            onClick={() => setOpen(innings.number)}
          >
            <span className="cg-innings-tab-label">Innings {innings.number}</span>
            <strong>{innings.batting_team.short_name} <b>{innings.runs}/{innings.wickets}</b></strong>
            <small>{innings.overs} overs</small>
          </button>
        ))}
      </div>

      <InningsCard innings={activeInnings} />
    </section>
  );
}

function InningsCard({ innings }: { innings: ScorecardInnings }) {
  const runRate = getRunRate(innings.runs, innings.overs);

  return (
    <div className="cg-innings-content">
      <div className="cg-innings-summary">
        <div className="cg-innings-summary-main">
          <span className="cg-summary-label">{innings.batting_team.name}</span>
          <div className="cg-total-score">
            <strong>{innings.runs}/{innings.wickets}</strong>
            <span>{innings.overs} OVERS</span>
          </div>
          <span className="cg-innings-status">{formatStatus(innings.status)}</span>
        </div>
        <div className="cg-summary-stat">
          <span><Activity size={14} /> Current run rate</span>
          <strong>{runRate}</strong>
          <small>Runs per over</small>
        </div>
      </div>

      <section className="cg-score-section">
        <SectionHeading title="Batting" subtitle="Batting performance" />
        <div className="cg-table-scroll">
          <table className="cg-score-table cg-batting-table">
            <thead><tr><th className="cg-player-column">Batter</th><th className="cg-dismissal-column">Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
            <tbody>
              {innings.batting.map((batter) => (
                <tr key={batter.player_id} className={batter.dismissed ? "" : "cg-not-out-row"}>
                  <td className="cg-player-cell"><strong>{batter.name}</strong>{!batter.dismissed && batter.balls > 0 && <span className="cg-not-out-badge">NOT OUT</span>}</td>
                  <td className="cg-dismissal-cell">{batter.dismissal || (batter.balls > 0 ? "not out" : "—")}</td>
                  <td className="cg-primary-number">{batter.runs}</td>
                  <td>{batter.balls}</td><td>{batter.fours}</td><td>{batter.sixes}</td>
                  <td>{batter.balls ? ((batter.runs * 100) / batter.balls).toFixed(2) : "0.00"}</td>
                </tr>
              ))}
              <tr className="cg-extras-row">
                <td colSpan={2}><strong>Extras</strong><small>Wd {innings.extras.wides} · Nb {innings.extras.no_balls} · B {innings.extras.byes} · LB {innings.extras.leg_byes}</small></td>
                <td className="cg-primary-number">{innings.extras.total}</td><td colSpan={4}> </td>
              </tr>
              <tr className="cg-total-row">
                <td colSpan={2}><strong>Total</strong></td>
                <td colSpan={5}><strong>{innings.runs}/{innings.wickets}</strong><span> ({innings.overs} ov)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="cg-score-section">
        <SectionHeading title="Bowling" subtitle="Bowling figures" />
        <div className="cg-table-scroll">
          <table className="cg-score-table cg-bowling-table">
            <thead><tr><th className="cg-player-column">Bowler</th><th>O</th><th>R</th><th>W</th><th>WD</th><th>NB</th><th>ECON</th></tr></thead>
            <tbody>
              {innings.bowling.length ? innings.bowling.map((bowler) => (
                <tr key={bowler.player_id}>
                  <td className="cg-player-cell"><strong>{bowler.name}</strong></td>
                  <td>{bowler.overs}</td><td>{bowler.runs}</td><td className="cg-wicket-number">{bowler.wickets}</td><td>{bowler.wides}</td><td>{bowler.no_balls}</td><td>{bowler.economy.toFixed(2)}</td>
                </tr>
              )) : <tr><td colSpan={7} className="cg-table-empty">Bowling figures will appear once an over is bowled.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cg-scorecard-insights">
        <InfoBlock title="Fall of wickets" subtitle="Dismissal timeline">
          {innings.fall_of_wickets.length ? innings.fall_of_wickets.map((fall) => (
            <div className="cg-insight-row" key={fall.wicket}>
              <span className="cg-insight-index">{fall.wicket}</span>
              <div className="cg-insight-main"><strong>{fall.player_name}</strong><small>{fall.dismissal}{fall.fielder ? ` · ${fall.fielder}` : ""} · Over {fall.over}</small></div>
              <b className="cg-insight-value">{fall.score}</b>
            </div>
          )) : <EmptyState text="No wickets have fallen yet." />}
        </InfoBlock>

        <InfoBlock title="Partnerships" subtitle="Runs added together">
          {innings.partnerships.length ? innings.partnerships.map((partnership, index) => (
            <div className="cg-insight-row" key={`${partnership.wicket ?? "current"}-${index}`}>
              <span className="cg-insight-index"><CircleDot size={15} /></span>
              <div className="cg-insight-main"><strong>{partnership.wicket ? `Wicket ${partnership.wicket}` : "Current partnership"}</strong><small>{partnership.dismissed || "Partnership in progress"}</small></div>
              <b className="cg-insight-value">{partnership.runs}<small> runs</small></b>
            </div>
          )) : <EmptyState text="Partnership details will appear during the innings." />}
        </InfoBlock>
      </div>

      <section className="cg-score-section cg-over-section">
        <SectionHeading title="Over-by-over" subtitle="Runs scored in each completed over" />
        {innings.over_summary.length ? (
          <div className="cg-over-strip">
            {innings.over_summary.map((over) => (
              <div className="cg-over-card" key={over.over}>
                <span>OVER {over.over + 1}</span>
                <strong>{over.runs}</strong>
                <small>runs</small>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Over summaries will appear after the first over." />}
      </section>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="cg-section-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div>;
}

function InfoBlock({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="cg-insight-card"><div className="cg-insight-heading"><h3>{title}</h3><p>{subtitle}</p></div><div className="cg-insight-list">{children}</div></section>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="cg-empty-state">{text}</div>;
}

function getRunRate(runs: number, overs: string): string {
  const [completedOvers = "0", completedBalls = "0"] = String(overs).split(".");
  const legalBalls = Number(completedOvers) * 6 + Number(completedBalls);
  return legalBalls > 0 ? ((runs * 6) / legalBalls).toFixed(2) : "0.00";
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
