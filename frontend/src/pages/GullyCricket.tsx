import { ArrowLeft, CircleDot, MapPin, Swords } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { matchesApi, teamsApi, type Team } from "../api/cricpulse";

export default function GullyCricket() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState("8");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    teamsApi.list().then(setTeams).catch((e) => setError(e instanceof Error ? e.message : "Unable to load teams."));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!teamA || !teamB) return setError("Select both registered teams.");
    if (teamA === teamB) return setError("A match must have two different teams.");
    try {
      setSaving(true);
      const match = await matchesApi.create({
        team_a_id: Number(teamA),
        team_b_id: Number(teamB),
        format: "GULLY",
        overs: Number(overs),
        venue: venue || undefined,
        location: location || undefined,
        description: "CricPulse Gully Cricket rules: toss winner bats first; no LBW; one-bounce-one-hand catch is a valid wicket.",
      });
      navigate(`/matches/${match.id}/score`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create Gully Cricket match.");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 font-bold text-slate-500"><ArrowLeft size={16}/>Home</Link>
        <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-7 md:grid-cols-[1.3fr_.7fr] md:p-10">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950"><CircleDot size={14}/> Gully Cricket</div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">Cricket from the street,<br/><span className="text-emerald-400">scored properly.</span></h1>
              <p className="mt-4 max-w-2xl text-slate-300">Use the same real registered teams and players as normal CricPulse matches. Only the scoring rules change for Gully Cricket.</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300">CricPulse Gully Rules</p>
              <ul className="mt-4 space-y-3 text-sm font-bold text-slate-200">
                <li>• Toss winner bats first automatically</li>
                <li>• No LBW</li>
                <li>• One-bounce-one-hand catch = wicket</li>
                <li>• Six legal balls = one over</li>
                <li>• Normal wides/no-balls are recorded</li>
              </ul>
            </div>
          </div>
        </section>

        {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-3"><div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><Swords/></div><div><h2 className="text-2xl font-black text-slate-950">Create Gully Match</h2><p className="text-sm font-semibold text-slate-500">Select your existing teams — no dummy teams or players.</p></div></div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-black text-slate-700">Team A</span><select required value={teamA} onChange={e=>setTeamA(e.target.value)} className="input"><option value="">Select registered team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-black text-slate-700">Team B</span><select required value={teamB} onChange={e=>setTeamB(e.target.value)} className="input"><option value="">Select registered team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-black text-slate-700">Overs</span><select value={overs} onChange={e=>setOvers(e.target.value)} className="input">{[4,6,8,10,12,15,20].map(n=><option key={n} value={n}>{n} overs</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-black text-slate-700">Ground / Venue</span><input className="input" value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Optional"/></label>
            <label className="grid gap-2 md:col-span-2"><span className="text-sm font-black text-slate-700"><MapPin size={15} className="mr-1 inline"/>Location</span><input className="input" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Optional location"/></label>
          </div>
          <button disabled={saving || teams.length < 2} className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Creating match..." : "Create Gully Cricket Match"}</button>
          {teams.length < 2 && <p className="mt-3 text-center text-sm font-semibold text-slate-500">Create at least two teams first.</p>}
        </form>
      </div>
    </main>
  );
}
