import { ArrowLeft, Edit3, MapPin, UserRound, Trophy, Activity, CircleDot, Target, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
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

  if (error) return <main className="min-h-screen bg-slate-50 p-6 md:p-10"><div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">{error}</div></main>;
  if (!player || !stats) return <main className="min-h-screen bg-slate-50 p-10 text-center font-bold text-slate-500">Loading player profile...</main>;

  const isMine = user?.id === player.user_id;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/players" className="mb-5 inline-flex items-center gap-2 font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Players</Link>

        <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-5">
                <div className="player-profile-photo">{player.photo_url ? <img src={player.photo_url} alt={player.display_name} /> : player.display_name[0]?.toUpperCase()}</div>
                <div>
                  <p className="mb-1 text-sm font-black text-emerald-400">@{player.username}</p>
                  <h1 className="text-3xl font-black md:text-5xl">{player.display_name}</h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {player.role && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{player.role}</span>}
                    {player.batting_style && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{player.batting_style}</span>}
                    {player.country && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">🌍 {player.country}</span>}{player.location && <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black"><MapPin size={12}/>{player.location}</span>}
                  </div>
                </div>
              </div>
              {isMine && <Link to="/players/me/edit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-black text-slate-950"><Edit3 size={16}/> Edit profile</Link>}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-white/10 md:grid-cols-4">
            <HeroStat label="Matches" value={stat(stats.matches)} />
            <HeroStat label="Runs" value={stat(stats.runs)} />
            <HeroStat label="Wickets" value={stat(stats.wickets)} />
            <HeroStat label="Catches" value={stat(stats.catches)} />
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<CircleDot size={18}/>} label="Batting average" value={stats.batting_average.toFixed(2)} />
          <Metric icon={<Activity size={18}/>} label="Strike rate" value={stats.strike_rate.toFixed(2)} />
          <Metric icon={<Target size={18}/>} label="Economy" value={stats.economy.toFixed(2)} />
          <Metric icon={<Trophy size={18}/>} label="Highest score" value={String(stats.highest_score)} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Career batting</p>
              <h2 className="mt-1 text-2xl font-black">Batting card</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <CardStat label="Innings" value={stats.batting_innings} />
              <CardStat label="Runs" value={stats.runs} />
              <CardStat label="Balls" value={stats.balls} />
              <CardStat label="Not out" value={stats.not_outs} />
              <CardStat label="4s" value={stats.fours} />
              <CardStat label="6s" value={stats.sixes} />
              <CardStat label="Average" value={stats.batting_average.toFixed(2)} />
              <CardStat label="SR" value={stats.strike_rate.toFixed(2)} />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Career bowling</p>
              <h2 className="mt-1 text-2xl font-black">Bowling card</h2>
            </div>
            <div className="space-y-3">
              <CardStat label="Overs" value={stats.overs_bowled} />
              <CardStat label="Wickets" value={stats.wickets} />
              <CardStat label="Runs conceded" value={stats.runs_conceded} />
              <CardStat label="Economy" value={stats.economy.toFixed(2)} />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="text-emerald-600" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Fielding</p>
              <h2 className="text-2xl font-black">Fielding record</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CardStat label="Catches" value={stats.catches} />
            <CardStat label="Run outs" value={stats.run_outs} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
            <Info label="Bowling style" value={player.bowling_style} />
            <Info label="CricPulse account" value={`@${player.username}`} icon={<UserRound size={16}/>}/>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">About</p>
          <p className="mt-3 leading-7 text-slate-600">{player.bio || "This player has not added a bio yet."}</p>
        </section>
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <div className="p-5 text-center md:p-6"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black md:text-3xl">{value}</p></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">{icon}</div><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="text-xl font-black text-slate-900">{value}</p></div></div>;
}

function CardStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;
}

function Info({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 flex items-center gap-2 font-bold text-slate-800">{icon}{value || "Not added"}</p></div>;
}
