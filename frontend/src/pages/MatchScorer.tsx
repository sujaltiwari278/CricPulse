import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleDot,
  RotateCcw,
  Save,
  Trophy,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  matchesApi,
  teamsApi,
  type Innings,
  type Match,
  type Team,
} from "../api/cricpulse";
import { useAuth } from "../context/AuthContext";

const WICKETS = [
  "NONE",
  "BOWLED",
  "CAUGHT",
  "RUN_OUT",
  "LBW",
  "STUMPED",
  "HIT_WICKET",
  "RETIRED_HURT",
  "TIMED_OUT",
] as const;

const EXTRAS = [
  "NONE",
  "WIDE",
  "NO_BALL",
  "BYE",
  "LEG_BYE",
] as const;

type ExtraType = (typeof EXTRAS)[number];
type WicketType = (typeof WICKETS)[number];

export default function MatchScorer() {
  const { id } = useParams();
  const { user } = useAuth();

  const matchId = Number(id);

  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{
    a: Team | null;
    b: Team | null;
  }>({
    a: null,
    b: null,
  });

  const [xi, setXi] = useState<{
    a: number[];
    b: number[];
  }>({
    a: [],
    b: [],
  });

  const [innings, setInnings] = useState<Innings[]>([]);
  const [matchResult, setMatchResult] = useState<Awaited<ReturnType<typeof matchesApi.result>> | null>(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Toss
  const [call, setCall] = useState<"HEADS" | "TAILS">("HEADS");
  const [tossText, setTossText] = useState("");
  const [flipping, setFlipping] = useState(false);

  // Opening players
  const [battingTeam, setBattingTeam] = useState("");
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  // Delivery
  const [extra, setExtra] = useState<ExtraType>("NONE");
  const [extraRuns, setExtraRuns] = useState("1");
  const [noBallBatterRuns, setNoBallBatterRuns] = useState("0");

  const [wicket, setWicket] = useState<WicketType>("NONE");
  const [dismissed, setDismissed] = useState("");
  const [fielder, setFielder] = useState("");


  const current = innings.find((item) => item.status === "LIVE") ?? null;
  const lastInnings = innings[innings.length - 1];

  async function refresh() {
    if (!matchId) return;

    const loadedMatch = await matchesApi.get(matchId);

    const setup = await matchesApi.playingXI(matchId);

    const teamAPlayers =
      setup.playing_xi.find(
        (item) => item.team_id === loadedMatch.team_a.id
      )?.players.map((player) => player.id) ?? [];

    const teamBPlayers =
      setup.playing_xi.find(
        (item) => item.team_id === loadedMatch.team_b.id
      )?.players.map((player) => player.id) ?? [];

    const [teamA, teamB, loadedInnings] = await Promise.all([
      teamsApi.get(loadedMatch.team_a.id),
      teamsApi.get(loadedMatch.team_b.id),
      matchesApi.innings(matchId),
    ]);

    setMatch(loadedMatch);

    setXi({
      a: teamAPlayers,
      b: teamBPlayers,
    });

    setTeams({
      a: teamA,
      b: teamB,
    });

    setInnings(loadedInnings);

    if (loadedMatch.status === "COMPLETED" && loadedMatch.format !== "TEST") {
      try {
        setMatchResult(await matchesApi.result(matchId));
      } catch {
        setMatchResult(null);
      }
    } else {
      setMatchResult(null);
    }

    // If an innings is already live, restore its player state.
    const liveInnings =
      loadedInnings.find((item) => item.status === "LIVE") ?? null;

    if (liveInnings) {
      setBattingTeam(String(liveInnings.batting_team.id));
      setStriker(String(liveInnings.striker?.id ?? ""));
      setNonStriker(String(liveInnings.non_striker?.id ?? ""));
      setBowler(String(liveInnings.bowler?.id ?? ""));
    } else {
      const previous = loadedInnings[loadedInnings.length - 1];
      if (previous) {
        setBattingTeam(String(previous.bowling_team.id));
      } else if (loadedMatch.toss_winner_id && loadedMatch.toss_decision) {
        const winnerBats = loadedMatch.toss_decision === "BAT";
        setBattingTeam(String(winnerBats ? loadedMatch.toss_winner_id : (loadedMatch.toss_winner_id === loadedMatch.team_a.id ? loadedMatch.team_b.id : loadedMatch.team_a.id)));
      } else {
        setBattingTeam("");
      }
      setStriker("");
      setNonStriker("");
      setBowler("");
    }
  }

  useEffect(() => {
    refresh().catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load scorer."
      );
    });
  }, [matchId]);

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-center text-white">
        <p className="font-bold text-slate-300">
          {error || "Loading scorer..."}
        </p>
      </main>
    );
  }

  if (match.creator_id !== user?.id) {
    return (
      <main className="min-h-screen bg-slate-950 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-red-50 p-6 font-bold text-red-700">
          Only the match creator can operate the scorer.
        </div>
      </main>
    );
  }

  const teamAId = match.team_a.id;
  const teamBId = match.team_b.id;

  const teamIds = [teamAId, teamBId];

  function xiPlayers(teamId: number) {
    return teamId === teamAId
      ? teams.a?.members ?? []
      : teams.b?.members ?? [];
  }

  function battingPlayersFor(teamId: number) {
    return xiPlayers(teamId).filter((player) => {
      const selected =
        teamId === teamAId ? xi.a : xi.b;

      return selected.includes(player.player_id);
    });
  }

  function bowlingPlayersFor(teamId: number) {
    return xiPlayers(teamId).filter((player) => {
      const selected =
        teamId === teamAId ? xi.a : xi.b;

      return selected.includes(player.player_id);
    });
  }

  /*
   * IMPORTANT:
   * When batting team changes, striker/non-striker/bowler
   * from the previous team must be cleared.
   */
  function toggleXI(teamId: number, playerId: number) {
    setXi((current) => {
      const key = teamId === teamAId ? "a" : "b";

      const existing = current[key];

      if (existing.includes(playerId)) {
        return {
          ...current,
          [key]: existing.filter(
            (id) => id !== playerId
          ),
        };
      }

      if (existing.length >= 11) {
        return current;
      }

      return {
        ...current,
        [key]: [...existing, playerId],
      };
    });
  }

  async function saveXI() {
    try {
      setBusy(true);
      setError("");

      if (xi.a.length < 5 || xi.b.length < 5) {
        throw new Error(
          "Both teams must have at least 5 players in the playing XI."
        );
      }

      if (xi.a.length > 11 || xi.b.length > 11) {
        throw new Error(
          "A playing XI cannot contain more than 11 players."
        );
      }

      const setup = await matchesApi.setPlayingXI(
        matchId,
        {
          team_a_player_ids: xi.a,
          team_b_player_ids: xi.b,
        }
      );

      setXi({
        a:
          setup.playing_xi.find(
            (item) => item.team_id === teamAId
          )?.players.map((player) => player.id) ?? [],

        b:
          setup.playing_xi.find(
            (item) => item.team_id === teamBId
          )?.players.map((player) => player.id) ?? [],
      });

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save playing XI."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toss() {
    try {
      setBusy(true);
      setFlipping(true);
      setError("");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const result = await matchesApi.toss(matchId, teamAId, call);
      setMatch(result.match);
      setTossText(`${result.winner_team_name} won the toss · ${result.result}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Toss failed."
      );
    } finally {
      setBusy(false);
      setFlipping(false);
    }
  }

  async function decide(
    decision: "BAT" | "BOWL"
  ) {
    try {
      setBusy(true);
      setError("");

      const updated = await matchesApi.tossDecision(matchId, decision);
      setMatch(updated);
      const winnerBats = decision === "BAT";
      setBattingTeam(String(winnerBats ? updated.toss_winner_id : (updated.toss_winner_id === teamAId ? teamBId : teamAId)));
      setStriker(""); setNonStriker(""); setBowler("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save toss decision."
      );
    } finally {
      setBusy(false);
    }
  }

  async function startMatch() {
    try {
      setBusy(true);
      setError("");

      if (xi.a.length < 5 || xi.b.length < 5) {
        throw new Error(
          "Both teams need at least 5 players before the match can start."
        );
      }

      const updated = await matchesApi.start(matchId);

      setMatch(updated);

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start match."
      );
    } finally {
      setBusy(false);
    }
  }

  async function beginInnings() {
    setError("");

    if (!battingTeam) {
      setError("Select the batting team.");
      return;
    }

    if (!striker) {
      setError("Select the striker.");
      return;
    }

    if (!nonStriker) {
      setError("Select the non-striker.");
      return;
    }

    if (!bowler) {
      setError("Select the bowler.");
      return;
    }

    if (striker === nonStriker) {
      setError(
        "Striker and non-striker must be different players."
      );
      return;
    }

    const battingTeamId = Number(battingTeam);

    const bowlingTeamId =
      battingTeamId === teamAId
        ? teamBId
        : teamAId;

    const battingXI =
      battingTeamId === teamAId
        ? xi.a
        : xi.b;

    const bowlingXI =
      bowlingTeamId === teamAId
        ? xi.a
        : xi.b;

    if (!battingXI.includes(Number(striker))) {
      setError(
        "The striker must belong to the batting playing XI."
      );
      return;
    }

    if (!battingXI.includes(Number(nonStriker))) {
      setError(
        "The non-striker must belong to the batting playing XI."
      );
      return;
    }

    if (!bowlingXI.includes(Number(bowler))) {
      setError(
        "The bowler must belong to the bowling playing XI."
      );
      return;
    }

    try {
      setBusy(true);

      const createdInnings =
        await matchesApi.startInnings(
          matchId,
          {
            batting_team_id: battingTeamId,
            striker_id: Number(striker),
            non_striker_id: Number(nonStriker),
            bowler_id: Number(bowler),
          }
        );

      setInnings((current) => [
        ...current.filter(
          (item) => item.id !== createdInnings.id
        ),
        createdInnings,
      ]);

      setMatch((current) =>
        current
          ? {
              ...current,
              status: "LIVE",
            }
          : current
      );

      // Keep these values because they are now the active state.
      setBattingTeam(
        String(createdInnings.batting_team.id)
      );

      setStriker(
        String(createdInnings.striker?.id ?? "")
      );

      setNonStriker(
        String(createdInnings.non_striker?.id ?? "")
      );

      setBowler(
        String(createdInnings.bowler?.id ?? "")
      );

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start innings."
      );
    } finally {
      setBusy(false);
    }
  }

  async function stateUpdate(
    nextStriker: string,
    nextNonStriker: string,
    nextBowler: string
  ) {
    if (!current) return;

    if (!nextStriker || !nextNonStriker || !nextBowler) {
      setError(
        "Select striker, non-striker and bowler."
      );
      return;
    }

    if (nextStriker === nextNonStriker) {
      setError(
        "Striker and non-striker must be different."
      );
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updated =
        await matchesApi.updateState(
          matchId,
          current.id,
          {
            striker_id: Number(nextStriker),
            non_striker_id: Number(nextNonStriker),
            bowler_id: Number(nextBowler),
          }
        );

      setInnings((items) =>
        items.map((item) =>
          item.id === updated.id
            ? updated
            : item
        )
      );

      setStriker(nextStriker);
      setNonStriker(nextNonStriker);
      setBowler(nextBowler);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update innings state."
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendDelivery(
    data: Parameters<typeof matchesApi.delivery>[2]
  ) {
    if (!current) {
      setError("No live innings.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updated =
        await matchesApi.delivery(
          matchId,
          current.id,
          data
        );

      setInnings((items) =>
        items.map((item) =>
          item.id === updated.id
            ? updated
            : item
        )
      );

      if (
  match &&
  updated.status === "COMPLETED" &&
  updated.number === 2 &&
  match.format !== "TEST"
) {
        try {
          const finalResult = await matchesApi.result(matchId);
          setMatchResult(finalResult);
          setMatch((existing) => existing ? { ...existing, status: "COMPLETED" } : existing);
        } catch {
          // Final score is already persisted; result display can refresh on reload.
        }
      }

      setStriker(
        String(updated.striker?.id ?? "")
      );

      setNonStriker(
        String(updated.non_striker?.id ?? "")
      );

      setBowler(
        String(updated.bowler?.id ?? "")
      );

      /*
       * If a wicket has occurred and the backend has
       * removed the dismissed batter from the active state,
       * the scorer must choose a replacement batter.
       */
      if (
        updated.status === "LIVE" &&
        (!updated.striker ||
          !updated.non_striker)
      ) {
        setError(
          "Wicket recorded. Select the new batter and apply player state."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record delivery."
      );
    } finally {
      setBusy(false);
    }
  }

  async function score(runs: number) {
    if (!current) return;

    await sendDelivery({
      batter_runs: runs,
      extra_type: "NONE",
      extra_runs: 0,
      wicket_type: "NONE",
    });
    resetDelivery();
  }

  async function quickExtra(type: "WIDE" | "NO_BALL", totalRuns: number) {
    if (!current) return;
    if (!current.striker || !current.non_striker || !current.bowler) {
      setError("Select striker, non-striker and bowler before scoring.");
      return;
    }
    await sendDelivery({
      batter_runs: type === "NO_BALL" ? totalRuns - 1 : 0,
      extra_type: type,
      // A wide's selected number is the complete wide total.
      // A no-ball always contributes exactly one no-ball extra;
      // the remainder is recorded as batter runs.
      extra_runs: type === "WIDE" ? totalRuns : 1,
      wicket_type: "NONE",
    });
    resetDelivery();
  }

  async function record() {
    if (!current) {
      setError("Start an innings first.");
      return;
    }

    if (!current.striker || !current.non_striker) {
      setError(
        "Select the striker and non-striker before recording a delivery."
      );
      return;
    }

    if (!current.bowler) {
      setError(
        "Select the bowler before recording a delivery."
      );
      return;
    }

    const parsedExtraRuns =
      extra === "NONE"
        ? 0
        : Number(extraRuns);

    const parsedNoBallRuns =
      extra === "NO_BALL"
        ? Number(noBallBatterRuns)
        : 0;

    if (extra !== "NONE") {
      if (
        !Number.isInteger(parsedExtraRuns) ||
        parsedExtraRuns < 1 ||
        parsedExtraRuns > 6
      ) {
        setError(
          "Extra runs must be between 1 and 6."
        );
        return;
      }
    }

    if (
      extra === "NO_BALL" &&
      (!Number.isInteger(parsedNoBallRuns) ||
        parsedNoBallRuns < 0 ||
        parsedNoBallRuns > 6)
    ) {
      setError(
        "No-ball batter runs must be between 0 and 6."
      );
      return;
    }

    if (
      wicket !== "NONE" &&
      !dismissed
    ) {
      setError(
        "Select the dismissed batter."
      );
      return;
    }

    if (
      (wicket === "CAUGHT" ||
        wicket === "RUN_OUT") &&
      !fielder
    ) {
      setError(
        wicket === "CAUGHT"
          ? "Select who took the catch."
          : "Select who completed the run-out."
      );
      return;
    }

    /*
     * Wides cannot have batter runs.
     * No-ball can have batter runs.
     */
    const batterRuns =
      extra === "NO_BALL"
        ? parsedNoBallRuns
        : 0;

    await sendDelivery({
      batter_runs: batterRuns,
      extra_type: extra,
      extra_runs: parsedExtraRuns,
      wicket_type: wicket,
      dismissed_player_id: dismissed
        ? Number(dismissed)
        : null,
      fielder_id: fielder
        ? Number(fielder)
        : null,
    });
    resetDelivery();
  }

  function resetDelivery() {
    setExtra("NONE");
    setExtraRuns("1");
    setNoBallBatterRuns("0");
    setWicket("NONE");
    setDismissed("");
    setFielder("");
    setError("");
  }

  const currentBattingRoster = current
    ? battingPlayersFor(current.batting_team.id)
    : [];

  const dismissedIds = new Set(
    current?.deliveries
      .filter((delivery) => delivery.dismissed_player_id != null)
      .map((delivery) => delivery.dismissed_player_id as number) ?? []
  );

  const activeBattingRoster = currentBattingRoster.filter(
    (player) => !dismissedIds.has(player.player_id)
  );

  const currentBowlingRoster = current
    ? bowlingPlayersFor(current.bowling_team.id)
    : [];

  const openingBatters = battingTeam
    ? battingPlayersFor(Number(battingTeam))
    : [];

  const openingBowlers = battingTeam
    ? bowlingPlayersFor(
        Number(battingTeam) === teamAId
          ? teamBId
          : teamAId
      )
    : [];

  // Never offer a player in both opener slots. Once a player is chosen
  // as striker/non-striker, that player disappears from the other list.
  const availableOpeningStrikers = openingBatters.filter(
    (player) => String(player.player_id) !== nonStriker
  );
  const availableOpeningNonStrikers = openingBatters.filter(
    (player) => String(player.player_id) !== striker
  );

  const availableCurrentStrikers = activeBattingRoster.filter(
    (player) => String(player.player_id) !== nonStriker
  );
  const availableCurrentNonStrikers = activeBattingRoster.filter(
    (player) => String(player.player_id) !== striker
  );

  return (
    <main className="scorer-shell cp-live-scorer">
      <style>{`        .cp-live-scorer{min-height:100vh;background:radial-gradient(circle at 88% 8%,rgba(27,156,101,.2),transparent 30%),radial-gradient(circle at 8% 90%,rgba(216,167,70,.1),transparent 26%),#0b1119;padding:28px 18px 56px;}        .cp-live-scorer .scorer-live-grid{gap:20px;align-items:start;}        .cp-live-scorer .scorer-live-grid > div,.cp-live-scorer .scorer-live-grid > section{border:1px solid rgba(255,255,255,.08);box-shadow:0 20px 45px rgba(0,0,0,.2);}        .cp-live-scorer .run-pad button{min-height:60px;border:1px solid rgba(255,255,255,.06);box-shadow:0 8px 18px rgba(0,0,0,.16);transition:transform .14s ease,background .14s ease;}        .cp-live-scorer .run-pad button:hover:not(:disabled){transform:translateY(-2px);background:#138a5b;}        .cp-live-scorer .quick-extra-grid button{min-height:42px;}        .cp-result-card{margin-top:20px;border-radius:28px;padding:32px 24px;text-align:center;background:linear-gradient(135deg,#0b1320,#174430);color:#fff;border:1px solid rgba(89,225,173,.2);box-shadow:0 24px 55px rgba(0,0,0,.22);}        .cp-result-kicker{font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#63e6ad;}        .cp-result-icon{width:58px;height:58px;margin:14px auto;border-radius:18px;display:grid;place-items:center;background:rgba(216,167,70,.15);color:#e2b75a;}        .cp-result-label{margin:0;color:#aebbc3;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;}        .cp-result-winner{margin:7px 0 4px;font-size:38px;line-height:1.05;font-weight:950;letter-spacing:-.04em;}        .cp-result-text{margin:0;color:#dbe5e9;font-size:14px;}        .cp-result-score-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px;text-align:left;}        .cp-result-score{padding:14px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);}        .cp-result-score span{display:block;color:#8fa0aa;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}        .cp-result-score strong{display:block;margin-top:5px;font-size:15px;color:#fff;}        @media(max-width:700px){.cp-live-scorer{padding:18px 12px 40px}.cp-result-score-grid{grid-template-columns:1fr}.cp-result-winner{font-size:30px}}      `}</style>
      <div className="mx-auto max-w-7xl">

        <Link
          to={`/matches/${match.id}`}
          className="mb-4 inline-flex items-center gap-2 font-black text-slate-300 hover:text-white"
        >
          <ArrowLeft size={16} />
          Match centre
        </Link>

        {/* HEADER */}
        <header className="scorer-scoreboard rounded-3xl bg-white p-5 shadow-2xl md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.25em] text-emerald-600">
                Live scorer
              </p>

              <h1 className="mt-1 text-3xl font-black md:text-5xl">
                {match.team_a.name}
                <span className="mx-2 text-slate-300">
                  vs
                </span>
                {match.team_b.name}
              </h1>

              <p className="mt-2 text-sm font-bold text-slate-500">
                Status: {match.status}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-xs font-black text-emerald-400">
                {match.format}
              </p>

              <p className="font-black">
                {match.overs
                  ? `${match.overs} overs`
                  : `${match.test_days} days · ${match.overs_per_day} overs/day`}
              </p>
            </div>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="my-4 rounded-2xl border border-red-300 bg-red-100 p-4 font-bold text-red-800">
            {error}
          </div>
        )}

        {/* PRE MATCH */}
        {match.status !== "LIVE" &&
          match.status !== "INNINGS_BREAK" &&
          match.status !== "COMPLETED" && (
            <section className="mt-5 grid gap-5 lg:grid-cols-2">

              {/* PLAYING XI */}
              <div className="rounded-3xl bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Playing XI
                    </p>

                    <h2 className="text-2xl font-black">
                      Select 5–11 players
                    </h2>
                  </div>

                  <button
                    onClick={saveXI}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white disabled:opacity-50"
                  >
                    <Save size={16} />
                    Save XI
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {teamIds.map((teamId) => {
                    const selected =
                      teamId === teamAId
                        ? xi.a
                        : xi.b;

                    return (
                      <div
                        key={teamId}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <h3 className="font-black">
                          {teamId === teamAId
                            ? match.team_a.name
                            : match.team_b.name}

                          <span className="ml-2 text-emerald-600">
                            {selected.length}/11
                          </span>
                        </h3>

                        <div className="mt-3 grid gap-2">
                          {xiPlayers(teamId).map(
                            (player) => {
                              const active =
                                selected.includes(
                                  player.player_id
                                );

                              return (
                                <button
                                  type="button"
                                  key={player.player_id}
                                  onClick={() =>
                                    toggleXI(
                                      teamId,
                                      player.player_id
                                    )
                                  }
                                  className={`flex items-center justify-between rounded-xl border p-3 text-left font-bold transition ${
                                    active
                                      ? "border-emerald-500 bg-emerald-50"
                                      : "border-slate-200 bg-white hover:border-emerald-300"
                                  }`}
                                >
                                  <span>
                                    {player.display_name}
                                  </span>

                                  {active && (
                                    <Check
                                      size={17}
                                      className="text-emerald-600"
                                    />
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TOSS */}
              <div className="rounded-3xl bg-white p-6">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Toss
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Coin toss
                </h2>

                {match.status === "CREATED" && (
                  <>
                    <p className="mt-2 text-sm text-slate-500">
                      {match.team_a.name} will call the toss. Choose a side, then flip.
                    </p>
                    <div className={`toss-coin ${flipping ? "is-flipping" : ""}`}>
                      <span>{flipping ? "" : match.toss_result === "HEADS" ? "H" : match.toss_result === "TAILS" ? "T" : call === "HEADS" ? "H" : "T"}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() =>
                          setCall("HEADS")
                        }
                        className={`rounded-xl border-2 p-4 font-black ${
                          call === "HEADS"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200"
                        }`}
                      >
                        HEADS
                      </button>

                      <button
                        onClick={() =>
                          setCall("TAILS")
                        }
                        className={`rounded-xl border-2 p-4 font-black ${
                          call === "TAILS"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200"
                        }`}
                      >
                        TAILS
                      </button>
                    </div>

                    <button
                      onClick={toss}
                      disabled={busy}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-black text-white disabled:opacity-50"
                    >
                      <CircleDot size={18} />
                      {busy
                        ? "Flipping..."
                        : "Flip the coin"}
                    </button>
                  </>
                )}

                {tossText && (
                  <div className="mt-5 rounded-2xl bg-emerald-50 p-4 font-black text-emerald-800">
                    {tossText}
                  </div>
                )}

                {match.status ===
                  "TOSS_COMPLETED" && (
                  <div className="mt-5">
                    <p className="mb-3 font-black">
                      What does the toss winner choose?
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          decide("BAT")
                        }
                        disabled={busy}
                        className="flex-1 rounded-xl bg-emerald-600 py-3 font-black text-white"
                      >
                        Bat
                      </button>

                      <button
                        onClick={() =>
                          decide("BOWL")
                        }
                        disabled={busy}
                        className="flex-1 rounded-xl bg-slate-950 py-3 font-black text-white"
                      >
                        Bowl
                      </button>
                    </div>
                  </div>
                )}

                {match.status === "READY" && (
                  <button
                    onClick={startMatch}
                    disabled={
                      busy ||
                      xi.a.length < 5 ||
                      xi.b.length < 5
                    }
                    className="mt-5 w-full rounded-xl bg-emerald-600 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy
                      ? "Starting..."
                      : "Start match"}
                  </button>
                )}
              </div>
            </section>
          )}

        {match.status === "COMPLETED" && match.format !== "TEST" && (
          <section className="cp-result-card" aria-live="polite">
            <span className="cp-result-kicker">Match complete</span>
            <div className="cp-result-icon"><Trophy size={30}/></div>
            <p className="cp-result-label">Winner</p>
            <h2 className="cp-result-winner">{matchResult?.winner?.name || "Match tied"}</h2>
            <p className="cp-result-text">{matchResult?.result_text || "The second innings is complete."}</p>
            {innings.length >= 2 && (
              <div className="cp-result-score-grid">
                {innings.slice(0,2).map((item)=>(
                  <div className="cp-result-score" key={item.id}>
                    <span>Innings {item.number}</span>
                    <strong>{item.batting_team.name} · {item.runs}/{item.wickets} ({item.overs})</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* LIVE MATCH */}
        {(match.status === "LIVE" ||
          match.status === "INNINGS_BREAK") && (
          <>
            {/* LIVE SCORER */}
            <section className="scorer-live-grid mt-5">

              <div className="rounded-3xl bg-white p-5 md:p-7">

                {current ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                          Innings {current.number}
                        </p>

                        <h2 className="text-4xl font-black">
                          {current.batting_team.short_name}{" "}
                          {current.runs}/
                          {current.wickets}
                        </h2>

                        <p className="font-bold text-slate-500">
                          {current.overs} overs ·{" "}
                          {current.batting_team.name} batting
                        </p>
                      </div>

                      <Trophy
                        className="text-emerald-600"
                        size={34}
                      />
                    </div>

                    {/* CURRENT BATTERS */}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-black text-slate-400">
                          STRIKER
                        </p>

                        <p className="mt-1 font-black">
                          {current.striker?.display_name ||
                            "New batter required"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-black text-slate-400">
                          NON-STRIKER
                        </p>

                        <p className="mt-1 font-black">
                          {current.non_striker?.display_name ||
                            "New batter required"}
                        </p>
                      </div>
                    </div>

                    {/* CHASE / INNINGS STATUS */}
                    {current.number === 2 && innings[0] && (
                      <div className="target-strip mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-emerald-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Target</p>
                          <p className="mt-1 text-2xl font-black text-emerald-950">{innings[0].runs + 1}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Need</p>
                          <p className="mt-1 text-2xl font-black text-slate-950">{Math.max(0, innings[0].runs + 1 - current.runs)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Balls left</p>
                          <p className="mt-1 text-2xl font-black text-slate-950">{match.overs ? Math.max(0, match.overs * 6 - current.legal_balls) : "∞"}</p>
                        </div>
                      </div>
                    )}

                    {/* CURRENT OVER */}
                    <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Current over</p>
                        <span className="text-xs font-black text-emerald-300">{current.overs}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {current.deliveries.filter((d) => d.over_number === (current.deliveries[current.deliveries.length - 1]?.over_number ?? 1)).slice(-8).map((d) => (
                          <span key={d.id} className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-black ${d.wicket_type ? "bg-red-500 text-white" : d.total_runs === 4 ? "bg-amber-300 text-slate-950" : d.total_runs === 6 ? "bg-emerald-400 text-slate-950" : "bg-white/10"}`}>
                            {d.wicket_type ? "W" : d.extra_type === "WIDE" ? `Wd${d.total_runs}` : d.extra_type === "NO_BALL" ? `Nb${d.total_runs}` : d.total_runs}
                          </span>
                        ))}
                        {current.deliveries.length === 0 && <span className="text-sm font-bold text-slate-500">No balls recorded yet</span>}
                      </div>
                    </div>

                    {/* RUN BUTTONS */}
                    <div className="scoring-pad-head mt-4"><span>RUNS</span><small>Tap the result of the ball</small></div>
                    <div className="run-pad mt-2 grid grid-cols-3 gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map(
                        (runs) => (
                          <button
                            key={runs}
                            disabled={
                              busy ||
                              !current.striker ||
                              !current.non_striker
                            }
                            onClick={() =>
                              score(runs)
                            }
                            className="rounded-2xl bg-slate-950 py-5 text-2xl font-black text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            {runs}
                          </button>
                        )
                      )}
                    </div>

                    {/* QUICK EXTRAS */}
                    <div className="extra-pad-panel mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-amber-900">Quick extras · total team runs</p>
                        <span className="text-xs font-bold text-amber-700">1–6 runs</span>
                      </div>
                      <div className="quick-extra-grid mt-2 grid grid-cols-6 gap-1.5">
                        {[1,2,3,4,5,6].map((runs) => (
                          <button key={`wd-${runs}`} disabled={busy || !current.striker || !current.non_striker || !current.bowler} onClick={() => quickExtra("WIDE", runs)} className="rounded-xl bg-white py-2.5 font-black text-amber-900 shadow-sm ring-1 ring-amber-200 disabled:opacity-40">
                            {runs}W
                          </button>
                        ))}
                      </div>
                      <div className="quick-extra-grid mt-2 grid grid-cols-6 gap-1.5">
                        {[1,2,3,4,5,6,7].map((runs) => (
                          <button key={`nb-${runs}`} disabled={busy || !current.striker || !current.non_striker || !current.bowler} onClick={() => quickExtra("NO_BALL", runs)} className="rounded-xl bg-slate-950 py-2.5 font-black text-white disabled:opacity-40">
                            {runs}NB
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* OTHER EXTRAS */}
                    <div className="other-extra-grid mt-3 grid grid-cols-2 gap-2">
                      <button disabled={busy} onClick={() => { setExtra("BYE"); setWicket("NONE"); }} className="rounded-xl border-2 border-sky-300 bg-sky-50 py-3 font-black">Bye</button>
                      <button disabled={busy} onClick={() => { setExtra("LEG_BYE"); setWicket("NONE"); }} className="rounded-xl border-2 border-sky-300 bg-sky-50 py-3 font-black">Leg-bye</button>
                    </div>

                    {/* ADVANCED */}
                    <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                      <h3 className="font-black">
                        Advanced delivery
                      </h3>

                      <div className="advanced-grid mt-3 grid gap-3 md:grid-cols-2">

                        <label className="grid gap-1 text-sm font-bold">
                          Extra type

                          <select
                            value={extra}
                            onChange={(event) =>
                              setExtra(
                                event.target
                                  .value as ExtraType
                              )
                            }
                            className="input"
                          >
                            {EXTRAS.map((value) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {value === "NONE"
                                  ? "Normal"
                                  : value}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1 text-sm font-bold">
                          Extra runs

                          <input
                            type="number"
                            min={
                              extra === "NONE"
                                ? 0
                                : 1
                            }
                            max={6}
                            value={extraRuns}
                            onChange={(event) =>
                              setExtraRuns(
                                event.target.value
                              )
                            }
                            className="input"
                          />
                        </label>

                        <label className="grid gap-1 text-sm font-bold">
                          No-ball bat runs (1 penalty + bat runs, up to 7 total)

                          {extra === "NO_BALL" ? (
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={
                                noBallBatterRuns
                              }
                              onChange={(event) =>
                                setNoBallBatterRuns(
                                  event.target.value
                                )
                              }
                              className="input"
                            />
                          ) : (
                            <span className="rounded-xl bg-slate-100 px-4 py-3 text-slate-400">
                              Only for no-ball
                            </span>
                          )}
                        </label>

                        <label className="grid gap-1 text-sm font-bold">
                          Wicket

                          <select
                            value={wicket}
                            onChange={(event) => {
                              const value =
                                event.target
                                  .value as WicketType;

                              setWicket(value);

                              if (
                                value ===
                                "NONE"
                              ) {
                                setDismissed("");
                                setFielder("");
                              }
                            }}
                            className="input"
                          >
                            {WICKETS.map(
                              (value) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {value === "NONE"
                                    ? "No wicket"
                                    : value.replace(
                                        "_",
                                        " "
                                      )}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        {wicket !== "NONE" && (
                          <label className="grid gap-1 text-sm font-bold">
                            Dismissed batter

                            <select
                              value={dismissed}
                              onChange={(event) =>
                                setDismissed(
                                  event.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">
                                Select batter
                              </option>

                              {activeBattingRoster.map(
                                (player) => (
                                  <option
                                    key={
                                      player.player_id
                                    }
                                    value={
                                      player.player_id
                                    }
                                  >
                                    {
                                      player.display_name
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        )}

                        {(wicket ===
                          "CAUGHT" ||
                          wicket ===
                            "RUN_OUT") && (
                          <label className="grid gap-1 text-sm font-bold">
                            {wicket ===
                            "CAUGHT"
                              ? "Who took the catch?"
                              : "Who completed the run-out?"}

                            <select
                              value={fielder}
                              onChange={(event) =>
                                setFielder(
                                  event.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">
                                Select fielder
                              </option>

                              {currentBowlingRoster.map(
                                (player) => (
                                  <option
                                    key={
                                      player.player_id
                                    }
                                    value={
                                      player.player_id
                                    }
                                  >
                                    {
                                      player.display_name
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        )}

                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={record}
                          disabled={
                            busy ||
                            !current.striker ||
                            !current.non_striker ||
                            !current.bowler
                          }
                          className="flex-1 rounded-xl bg-emerald-600 py-3 font-black text-white disabled:opacity-40"
                        >
                          {busy
                            ? "Recording..."
                            : "Record delivery"}
                        </button>

                        <button
                          type="button"
                          onClick={resetDelivery}
                          className="rounded-xl border px-4"
                        >
                          <RotateCcw size={17} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center">
                    <p className="font-bold text-slate-500">
                      Start the first innings below.
                    </p>
                  </div>
                )}
              </div>

            </section>

            {/* PLAYER STATE */}
            {current && (
              <section className="mt-5 rounded-3xl bg-white p-5 md:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Scorer controls
                    </p>

                    <h2 className="text-2xl font-black">
                      Set players
                    </h2>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {current.status}
                  </span>
                </div>

                <div className="player-state-grid mt-4 grid gap-3 md:grid-cols-3">

                  <label className="grid gap-1 text-sm font-bold">
                    Striker

                    <select
                      value={
                        striker ||
                        String(
                          current.striker?.id ??
                            ""
                        )
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        setStriker(value);
                        if (value === nonStriker) setNonStriker("");
                      }}
                      className="input"
                    >
                      <option value="">
                        Select
                      </option>

                      {availableCurrentStrikers.map(
                        (player) => (
                          <option
                            key={
                              player.player_id
                            }
                            value={
                              player.player_id
                            }
                          >
                            {
                              player.display_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm font-bold">
                    Non-striker

                    <select
                      value={
                        nonStriker ||
                        String(
                          current.non_striker?.id ??
                            ""
                        )
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        setNonStriker(value);
                        if (value === striker) setStriker("");
                      }}
                      className="input"
                    >
                      <option value="">
                        Select
                      </option>

                      {availableCurrentNonStrikers.map(
                        (player) => (
                          <option
                            key={
                              player.player_id
                            }
                            value={
                              player.player_id
                            }
                          >
                            {
                              player.display_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm font-bold">
                    Bowler

                    <select
                      value={
                        bowler ||
                        String(
                          current.bowler?.id ??
                            ""
                        )
                      }
                      onChange={(event) =>
                        setBowler(
                          event.target.value
                        )
                      }
                      className="input"
                    >
                      <option value="">
                        Select
                      </option>

                      {currentBowlingRoster
                        .filter((player) => {
                          // After an over ends, the previous bowler must not
                          // be offered as the next bowler. The backend also
                          // enforces this rule, so this is a UX guard rather
                          // than the only validation.
                          const previousOver =
                            current.deliveries
                              .filter((delivery) => delivery.over_number === Math.max(0, Math.ceil(current.legal_balls / 6)))
                              .at(-1);

                          const previousBowlerId = previousOver?.bowler_id;
                          const newOver = current.legal_balls > 0 && current.legal_balls % 6 === 0 && !current.bowler;

                          return !(
                            newOver &&
                            previousBowlerId === player.player_id
                          );
                        })
                        .map((player) => (
                          <option
                            key={player.player_id}
                            value={player.player_id}
                          >
                            {player.display_name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <button
                  disabled={
                    busy ||
                    !striker ||
                    !nonStriker ||
                    !bowler
                  }
                  onClick={() =>
                    stateUpdate(
                      striker,
                      nonStriker,
                      bowler
                    )
                  }
                  className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-40"
                >
                  Apply player state
                </button>
              </section>
            )}

            {/* START INNINGS */}
            {!current &&
              (match.status === "LIVE" ||
                match.status ===
                  "INNINGS_BREAK") && (
                <section className="mt-5 rounded-3xl bg-white p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                    {lastInnings
                      ? `Innings ${
                          lastInnings.number + 1
                        }`
                      : "Start innings"}
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Start innings {lastInnings ? lastInnings.number + 1 : 1}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    The batting team is selected automatically. Choose the two batters and the first bowler.
                  </p>

                  <div className="opening-player-grid mt-5 grid gap-3 md:grid-cols-4">

                    {/* BATTING TEAM — derived automatically from toss */}
                    <div className="auto-batting-team">
                      <span>BAT FIRST · FROM TOSS</span>
                      <strong>{battingTeam === String(match.team_a.id) ? match.team_a.name : match.team_b.name}</strong>
                    </div>

                    {/* STRIKER */}
                    <select
                      value={striker}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStriker(value);
                        if (value === nonStriker) setNonStriker("");
                      }}
                      disabled={!battingTeam}
                      className="input disabled:bg-slate-100"
                    >
                      <option value="">
                        Striker
                      </option>

                      {availableOpeningStrikers.map(
                        (player) => (
                          <option
                            key={
                              player.player_id
                            }
                            value={
                              player.player_id
                            }
                          >
                            {
                              player.display_name
                            }
                          </option>
                        )
                      )}
                    </select>

                    {/* NON STRIKER */}
                    <select
                      value={nonStriker}
                      onChange={(event) => {
                        const value = event.target.value;
                        setNonStriker(value);
                        if (value === striker) setStriker("");
                      }}
                      disabled={!battingTeam}
                      className="input disabled:bg-slate-100"
                    >
                      <option value="">
                        Non-striker
                      </option>

                      {availableOpeningNonStrikers.map(
                        (player) => (
                          <option
                            key={
                              player.player_id
                            }
                            value={
                              player.player_id
                            }
                          >
                            {
                              player.display_name
                            }
                          </option>
                        )
                      )}
                    </select>

                    {/* BOWLER */}
                    <select
                      value={bowler}
                      onChange={(event) =>
                        setBowler(
                          event.target.value
                        )
                      }
                      disabled={!battingTeam}
                      className="input disabled:bg-slate-100"
                    >
                      <option value="">
                        Bowler
                      </option>

                      {openingBowlers.map(
                        (player) => (
                          <option
                            key={
                              player.player_id
                            }
                            value={
                              player.player_id
                            }
                          >
                            {
                              player.display_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                    <button
                      type="button"
                      onClick={beginInnings}
                      disabled={
                        busy ||
                        !battingTeam ||
                        !striker ||
                        !nonStriker ||
                        !bowler
                      }
                      className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy
                        ? "Starting innings..."
                        : "Start innings"}
                    </button>

                    {battingTeam && (
                      <p className="text-sm font-bold text-slate-500">
                        {openingBatters.length} batting XI
                        players ·{" "}
                        {openingBowlers.length} bowling XI
                        players
                      </p>
                    )}
                  </div>
                </section>
              )}
          </>
        )}
      </div>
    </main>
  );
}