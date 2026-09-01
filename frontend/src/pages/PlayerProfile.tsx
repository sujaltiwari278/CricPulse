import { ArrowLeft, Edit3, MapPin, Trophy, CircleDot, ShieldCheck, Target, Crosshair } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { playersApi, type Player, type PlayerStats } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

const stat = (value: number | string) => typeof value === "number" ? value.toLocaleString() : value;

export default function PlayerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const playerId = Number(id);
    Promise.all([playersApi.get(playerId), playersApi.stats(playerId)])
      .then(([profile, career]) => {
        setPlayer(profile);
        setStats(career);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load player profile."));
  }, [id]);

  if (error) return <main className="player-profile-page"><div className="player-profile-container"><div className="profile-error">{error}</div></div></main>;
  if (!player || !stats) return <main className="player-profile-page"><div className="player-profile-loading">Loading player profile...</div></main>;

  const isMine = user?.id === player.user_id;

  return (
    <main className="player-profile-page">
      <div className="player-profile-container">
        <Link to="/players" className="profile-back-link"><ArrowLeft size={16}/> Players</Link>

        <section className="player-profile-hero">
          <div className="player-profile-hero-main">
            <div className="player-profile-photo">
              {player.photo_url ? <img src={player.photo_url} alt={player.display_name} /> : player.display_name[0]?.toUpperCase()}
            </div>
            <div className="player-profile-identity">
              <p className="player-profile-handle">@{player.username}</p>
              <h1>{player.display_name}</h1>
              <div className="player-profile-tags">
                {player.role && <span>{player.role}</span>}
                {player.country && <span>🌍 {player.country}</span>}
                {player.location && <span className="tag-with-icon"><MapPin size={12}/>{player.location}</span>}
              </div>
            </div>
            {isMine && <Link to="/players/me/edit" className="profile-edit-button"><Edit3 size={16}/> Edit profile</Link>}
          </div>

          <div className="player-profile-hero-stats">
            <HeroStat label="Matches" value={stat(stats.matches)} />
            <HeroStat label="Runs" value={stat(stats.runs)} />
            <HeroStat label="Wickets" value={stat(stats.wickets)} />
            <HeroStat label="Catches" value={stat(stats.catches)} />
          </div>
        </section>

        <section className="profile-style-grid">
          <Metric icon={<CircleDot size={18}/>} label="Batting style" value={player.batting_style || "Not added"} />
          <Metric icon={<Target size={18}/>} label="Bowling style" value={player.bowling_style || "Not added"} />
        </section>

        <section className="profile-card-grid">
          <div className="profile-card profile-career-card">
            <div className="profile-section-heading">
              <div>
                <p className="profile-kicker">Career batting</p>

              </div>
              <Trophy size={20} />
            </div>
            <div className="profile-stat-grid profile-stat-grid-wide">
              <CardStat label="Innings" value={stats.batting_innings} />
              <CardStat label="Runs" value={stats.runs} />
              <CardStat label="Balls" value={stats.balls} />
              <CardStat label="Not out" value={stats.not_outs} />
              <CardStat label="4s" value={stats.fours} />
              <CardStat label="6s" value={stats.sixes} />
              <CardStat label="50s" value={stats.fifties} />
              <CardStat label="100s" value={stats.hundreds} />
              <CardStat label="Highest score" value={stats.highest_score} />
              <CardStat label="Average" value={stats.batting_average.toFixed(2)} />
              <CardStat label="SR" value={stats.strike_rate.toFixed(2)} />
            </div>
          </div>

          <div className="profile-card profile-career-card">
            <div className="profile-section-heading">
              <div>
                <p className="profile-kicker">Career bowling</p>
              </div>
              <Crosshair size={20} />
            </div>
            <div className="profile-stat-grid">
              <CardStat label="Overs" value={stats.overs_bowled} />
              <CardStat label="Wickets" value={stats.wickets} />
              <CardStat label="Runs conceded" value={stats.runs_conceded} />
              <CardStat label="Economy" value={stats.economy.toFixed(2)} />
              <CardStat label="Best bowling" value={stats.best_bowling_figures} />
              <CardStat label="3W hauls" value={stats.three_wicket_hauls} />
              <CardStat label="5W hauls" value={stats.five_wicket_hauls} />
            </div>
          </div>
        </section>

        <section className="profile-card fielding-card">
          <div className="profile-section-heading">
            <div>
              <p className="profile-kicker">Fielding</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="profile-stat-grid fielding-grid">
            <CardStat label="Catches" value={stats.catches} />
            <CardStat label="Run outs" value={stats.run_outs} />
          </div>
        </section>

        <section className="profile-card profile-about-card">
          <p className="profile-kicker">About</p>
          <p className="profile-about-text">{player.bio || "This player has not added a bio yet."}</p>
        </section>
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <div className="hero-stat"><p>{label}</p><strong>{value}</strong></div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="profile-metric"><div className="profile-metric-icon">{icon}</div><div><p>{label}</p><strong>{value}</strong></div></div>;
}

function CardStat({ label, value }: { label: string; value: number | string }) {
  return <div className="profile-card-stat"><p>{label}</p><strong>{value}</strong></div>;
}
