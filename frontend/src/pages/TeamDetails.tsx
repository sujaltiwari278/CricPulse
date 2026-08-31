import { ArrowLeft, MapPin, Shield, Users, Trophy, Target, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { teamsApi, type Team, type TeamStats } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

export default function TeamDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const teamId = Number(id);
    Promise.all([teamsApi.get(teamId), teamsApi.stats(teamId)])
      .then(([teamData, teamStats]) => {
        setTeam(teamData);
        setStats(teamStats);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load team."));
  }, [id]);

  if (error) return <main className="min-h-screen bg-slate-50 p-6 md:p-10"><div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">{error}</div></main>;
  if (!team || !stats) return <main className="min-h-screen bg-slate-50 p-10 text-center font-bold text-slate-500">Loading team...</main>;

  const owner = user?.id === team.owner_id;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/teams" className="mb-5 inline-flex items-center gap-2 font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Teams</Link>

        <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-5">
                <div className="team-detail-logo">{team.logo_url ? <img src={team.logo_url} alt={team.name} /> : team.short_name}</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">CricPulse team</p>
                  <h1 className="mt-1 text-3xl font-black md:text-5xl">{team.name}</h1>
                  <p className="mt-2 flex items-center gap-1 text-slate-300"><MapPin size={15}/>{team.city || "Global team"}</p>
                </div>
              </div>
              {owner && <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">Team owner</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-white/10 md:grid-cols-4">
            <HeroStat label="Matches" value={stats.matches} />
            <HeroStat label="Wins" value={stats.wins} />
            <HeroStat label="Losses" value={stats.losses} />
            <HeroStat label="Win rate" value={`${stats.win_percentage.toFixed(1)}%`} />
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric icon={<Trophy size={18}/>} label="Completed" value={stats.completed_matches} />
          <Metric icon={<TrendingUp size={18}/>} label="Runs scored" value={stats.runs_for} />
          <Metric icon={<Target size={18}/>} label="Runs conceded" value={stats.runs_against} />
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Squad</p><h2 className="mt-1 text-2xl font-black">{team.members.length} players</h2></div>
            <Users className="text-emerald-600"/>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {team.members.map((m, i) => (
              <Link key={m.player_id} to={`/players/${m.player_id}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm">
                <div className="team-member-avatar">{m.photo_url ? <img src={m.photo_url} alt=""/> : i + 1}</div>
                <div className="min-w-0">
                  <p className="truncate font-black">{m.display_name}</p>
                  <p className="truncate text-xs font-bold text-emerald-600">@{m.username}</p>
                  {m.role && <p className="mt-1 text-xs font-semibold text-slate-400">{m.role}</p>}
                </div>
                <Shield size={17} className="ml-auto shrink-0 text-slate-300 group-hover:text-emerald-600"/>
              </Link>
            ))}
          </div>
          {team.description && <p className="mt-8 rounded-2xl bg-slate-50 p-5 leading-7 text-slate-600">{team.description}</p>}
        </section>
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return <div className="p-5 text-center md:p-6"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black md:text-3xl">{value}</p></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">{icon}</div><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="text-xl font-black text-slate-900">{value.toLocaleString()}</p></div></div>;
}
