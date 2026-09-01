import { ArrowLeft, MapPin, Play, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { matchesApi, type Match } from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

export default function MatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      matchesApi
        .get(+id)
        .then(setMatch)
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : "Match not found."
          )
        );
    }
  }, [id]);

  async function deleteMatch() {
    if (!id || !match || deleting) return;
    const confirmed = window.confirm(
      `Delete ${match.team_a.name} vs ${match.team_b.name}?\n\nThis permanently removes the match, Playing XI, innings and ball-by-ball scoring data.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      await matchesApi.delete(+id);
      navigate("/", { replace: true });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to delete match."
      );
      setDeleting(false);
    }
  }

  if (!match) {
    return (
      <main className="p-8">
        {error ? (
          <div className="mx-auto max-w-3xl rounded-2xl bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : (
          <p className="text-center font-bold text-slate-500">
            Loading match...
          </p>
        )}
      </main>
    );
  }

  const owner = user?.id === match.creator_id;

  const format =
    match.format === "TEST"
      ? `${match.test_days}-day Test · ${match.overs_per_day} overs/day`
      : `${match.format} · ${match.overs} overs`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 font-bold text-slate-500"
        >
          <ArrowLeft size={16} />
          Home
        </Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <header className="bg-slate-950 p-7 text-white md:p-10">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.25em] text-emerald-400">
                  {match.status}
                </p>

                <h1 className="mt-2 text-3xl font-black md:text-5xl">
                  {match.team_a.name}{" "}
                  <span className="text-slate-500">vs</span>{" "}
                  {match.team_b.name}
                </h1>

                <p className="mt-3 font-bold text-slate-300">
                  {format}
                </p>

                {(match.venue || match.location) && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                    <MapPin size={15} />
                    {[match.venue, match.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>

              <div className="hidden h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-slate-950 sm:flex">
                <Shield size={36} />
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-6 md:p-10">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Team
                name={match.team_a.name}
                short={match.team_a.short_name}
              />
              <Team
                name={match.team_b.name}
                short={match.team_b.short_name}
              />
            </div>

            {owner && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-red-600">
                      Danger zone
                    </p>
                    <h2 className="mt-1 text-xl font-black text-red-950">
                      Delete this match
                    </h2>
                    <p className="mt-1 text-sm text-red-800">
                      Permanently remove this match and all of its scoring
                      data.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={deleteMatch}
                    disabled={deleting}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 size={17} />
                    {deleting ? "Deleting..." : "Delete match"}
                  </button>
                </div>
              </div>
            )}

            {owner &&
              (match.status === "CREATED" ||
                match.status === "TOSS_PENDING" ||
                match.status === "TOSS_COMPLETED" ||
                match.status === "READY") && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                        Match control
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">
                        Open match scorer
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Set the Playing XI, complete the toss, choose the
                        opening players, and start ball-by-ball scoring.
                      </p>
                    </div>

                    <Link
                      to={`/matches/${match.id}/score`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700"
                    >
                      <Play size={17} />
                      Go to toss & scorer
                    </Link>
                  </div>
                </div>
              )}

            {match.status === "LIVE" && (
              <div className="rounded-3xl bg-slate-950 p-8 text-center text-white">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  LIVE
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Live scoring
                </h2>
                <p className="mt-2 text-slate-400">
                  The match is live. Record every delivery from the scorer.
                </p>

                <Link
                  to={`/matches/${match.id}/score`}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950"
                >
                  <Play size={17} />
                  Open live scorer
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Team({
  name,
  short,
}: {
  name: string;
  short: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">
        {short}
      </div>
      <p className="text-xl font-black">{name}</p>
    </div>
  );
}
