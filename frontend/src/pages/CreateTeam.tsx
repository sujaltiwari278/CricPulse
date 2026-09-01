import { ArrowLeft, Camera, Check, Shield, Upload, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { playersApi, teamsApi, type Player } from "../api/cricpulse";

const COUNTRIES = [
  "India",
  "Australia",
  "England",
  "New Zealand",
  "South Africa",
  "Pakistan",
  "Sri Lanka",
  "Bangladesh",
  "Afghanistan",
  "West Indies",
  "Ireland",
  "Zimbabwe",
  "Nepal",
  "United States",
  "United Arab Emirates",
  "Canada",
  "Netherlands",
  "Scotland",
];

export default function CreateTeam() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    city: "",
    country: "India",
    description: "",
    logo_url: "",
  });

  async function searchPlayers() {
    try {
      setSearching(true);
      setError("");
      setPlayers(await playersApi.search(query.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to search players.");
    } finally {
      setSearching(false);
    }
  }

  function togglePlayer(id: number) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 11) return current;
      setError("");
      return [...current, id];
    });
  }

  function handleLogo(file?: File) {
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Logo must be under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logo_url: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.short_name.trim()) {
      setError("Team name and short name are required.");
      return;
    }

    if (selected.length < 5) {
      setError("Select at least 5 players.");
      return;
    }

    try {
      setSaving(true);
      const team = await teamsApi.create({
        ...form,
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        city: form.city.trim(),
        country: form.country,
        description: form.description.trim(),
        player_ids: selected,
      });
      navigate(`/teams/${team.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/teams" className="mb-5 inline-flex items-center gap-2 font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} />
          Teams
        </Link>

        <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-[0_20px_55px_rgba(7,17,31,.16)] md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <label className="relative flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-emerald-400 text-slate-950 shadow-lg">
                <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => handleLogo(event.target.files?.[0])} />
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Team logo" className="h-full w-full object-cover" />
                ) : (
                  <Camera size={27} />
                )}
                <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-md bg-white text-emerald-700 shadow">
                  <Upload size={11} />
                </span>
              </label>

              <div>
                <p className="text-xs font-black uppercase tracking-[.25em] text-emerald-400">Team Centre</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Create your cricket team.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Build a real squad, add its identity, and choose the players who can appear in your matches.
                </p>
              </div>
            </div>

            <div className="min-w-[130px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Squad</p>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-3xl font-black">{selected.length}</strong>
                <span className="pb-1 text-sm text-slate-400">/ 11</span>
              </div>
              <p className="text-xs text-emerald-300">Minimum 5 players</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-600">Team Identity</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Club details</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Set the basic identity shown throughout CricPulse.</p>
              </div>
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Shield size={21} />
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Team name">
                <input
                  required
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Mumbai Tigers"
                />
              </Field>

              <Field label="Short name">
                <input
                  required
                  maxLength={10}
                  className="input uppercase"
                  value={form.short_name}
                  onChange={(event) => setForm((current) => ({ ...current, short_name: event.target.value.toUpperCase() }))}
                  placeholder="MT"
                />
              </Field>

              <Field label="Country">
                <select className="input" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}>
                  {COUNTRIES.map((country) => <option key={country}>{country}</option>)}
                </select>
              </Field>

              <Field label="City">
                <input
                  className="input"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Mumbai"
                />
              </Field>

              <Field label="Description">
                <textarea
                  className="input"
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="A short description of your club."
                />
              </Field>
            </div>

            <button type="submit" disabled={saving || selected.length < 5} className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Creating team…" : "Create team"}
            </button>
          </section>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-600">Squad Selection</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Choose 5–11 players</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Search real CricPulse profiles and tap players to add them to your squad.</p>
              </div>
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users size={21} />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchPlayers();
                  }
                }}
                placeholder="Search player name or username"
              />
              <button type="button" onClick={() => void searchPlayers()} disabled={searching} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
                {searching ? "Searching…" : "Search"}
              </button>
            </div>

            {players.length === 0 ? (
              <div className="mt-4 grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Users size={25} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-800">Search for real players</h3>
                  <p className="mt-1 text-sm text-slate-500">Players must have a CricPulse profile before they can join the team.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {players.map((player) => {
                  const chosen = selected.includes(player.id);
                  return (
                    <button
                      type="button"
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${chosen ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-sm"}`}
                    >
                      <span className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-100 font-black text-emerald-800">
                        {player.photo_url ? <img src={player.photo_url} alt="" className="h-full w-full object-cover" /> : player.display_name[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-slate-900">{player.display_name}</strong>
                        <span className="mt-0.5 block truncate text-xs font-bold text-emerald-700">@{player.username}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-slate-400">{player.role || "Player"}</span>
                      </span>
                      {chosen && <Check size={18} className="flex-shrink-0 text-emerald-700" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Minimum 5 · Maximum 11</span>
              <span className="text-emerald-700">{selected.length} selected</span>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[.08em] text-slate-600">{label}</span>
      {children}
    </label>
  );
}
