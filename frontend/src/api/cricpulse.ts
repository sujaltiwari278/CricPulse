const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

function getAccessToken(): string | null {
  return localStorage.getItem("cricpulse_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your login session is invalid or expired. Please log out and log in again.");
    }
    throw new Error(body?.detail || `Request failed (${response.status})`);
  }

  return body as T;
}

export interface Player {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  location: string | null;
  bio: string | null;
  photo_url: string | null;
  country: string | null;
}

export interface PlayerStats {
  player_id: number;
  matches: number;
  batting_innings: number;
  runs: number;
  balls: number;
  highest_score: number;
  not_outs: number;
  batting_average: number;
  strike_rate: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs_bowled: string;
  runs_conceded: number;
  economy: number;
  catches: number;
  run_outs: number;
}

export interface TeamMember {
  player_id: number;
  username: string;
  display_name: string;
  role: string | null;
  photo_url: string | null;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  city: string | null;
  description: string | null;
  logo_url: string | null;
  country: string | null;
  owner_id: number;
  members: TeamMember[];
}

export interface TeamStats {
  team_id: number;
  matches: number;
  completed_matches: number;
  wins: number;
  losses: number;
  ties: number;
  runs_for: number;
  runs_against: number;
  win_percentage: number;
}

export const authApi = {
  deleteAccount: () => request<void>("/auth/me", { method: "DELETE" }),
};

export const playersApi = {
  search: (q = "") => request<Player[]>(`/players/search${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id: number) => request<Player>(`/players/${id}`),
  stats: (id: number) => request<PlayerStats>(`/players/${id}/stats`),
  me: () => request<Player>("/players/me"),
  create: (data: { display_name: string; role?: string | null; batting_style?: string | null; bowling_style?: string | null; location?: string | null; bio?: string | null; photo_url?: string | null; country?: string | null }) =>
    request<Player>("/players/me", { method: "POST", body: JSON.stringify(data) }),
  update: (data: { display_name?: string; role?: string | null; batting_style?: string | null; bowling_style?: string | null; location?: string | null; bio?: string | null; photo_url?: string | null; country?: string | null }) =>
    request<Player>("/players/me", { method: "PUT", body: JSON.stringify(data) }),
};

export const teamsApi = {
  list: (q = "") => request<Team[]>(`/teams${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id: number) => request<Team>(`/teams/${id}`),
  stats: (id: number) => request<TeamStats>(`/teams/${id}/stats`),
  create: (data: { name: string; short_name: string; city?: string; description?: string; logo_url?: string | null; country?: string | null; player_ids: number[] }) =>
    request<Team>("/teams", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Pick<Team, "name" | "short_name" | "city" | "description" | "logo_url" | "country">>) =>
    request<Team>(`/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  addMember: (id: number, player_id: number) =>
    request<Team>(`/teams/${id}/members`, { method: "POST", body: JSON.stringify({ player_id }) }),
  removeMember: (id: number, player_id: number) =>
    request<Team>(`/teams/${id}/members/${player_id}`, { method: "DELETE" }),
};

export type MatchFormat = "T20" | "ODI" | "CUSTOM" | "TEST";
export type MatchStatus = "CREATED" | "TOSS_PENDING" | "TOSS_COMPLETED" | "READY" | "LIVE" | "INNINGS_BREAK" | "COMPLETED";
export interface MatchTeamBrief { id:number; name:string; short_name:string; city:string|null; }
export interface Match { id:number; creator_id:number; team_a:MatchTeamBrief; team_b:MatchTeamBrief; format:MatchFormat; overs:number|null; test_days:number|null; overs_per_day:number|null; venue:string|null; location:string|null; latitude:number|null; longitude:number|null; description:string|null; status:MatchStatus; toss_winner_id:number|null; toss_result:"HEADS"|"TAILS"|null; toss_decision:"BAT"|"BOWL"|null; started_at:string|null; completed_at:string|null; created_at:string; }
export interface PlayerBrief { id:number; username:string; display_name:string; role:string|null; }
export interface PlayingXI { team_id:number; team_name:string; players:PlayerBrief[]; }
export interface MatchSetup { match:Match; playing_xi:PlayingXI[]; }
export interface TossResult { match:Match; result:"HEADS"|"TAILS"; winner_team_id:number; winner_team_name:string; }
export interface Delivery { id:number; innings_id:number; over_number:number; ball_number:number; striker_id:number; striker_name:string; non_striker_id:number; non_striker_name:string; bowler_id:number; bowler_name:string; batter_runs:number; extra_type:string|null; extra_runs:number; total_runs:number; legal:boolean; wicket_type:string|null; dismissed_player_id:number|null; dismissed_player_name:string|null; fielder_id:number|null; fielder_name:string|null; commentary:string; }
export interface Innings { id:number; number:number; batting_team:MatchTeamBrief; bowling_team:MatchTeamBrief; status:string; runs:number; wickets:number; legal_balls:number; overs:string; striker:PlayerBrief|null; non_striker:PlayerBrief|null; bowler:PlayerBrief|null; deliveries:Delivery[]; }
export interface ScorecardBatting { player_id:number; name:string; runs:number; balls:number; fours:number; sixes:number; dismissed:boolean; dismissal:string|null; }
export interface ScorecardBowling { player_id:number; name:string; balls:number; overs:string; maidens:number; runs:number; wickets:number; wides:number; no_balls:number; economy:number; }
export interface ScorecardInnings { id:number; number:number; batting_team:MatchTeamBrief; bowling_team:MatchTeamBrief; status:string; runs:number; wickets:number; overs:string; batting:ScorecardBatting[]; bowling:ScorecardBowling[]; extras:{wides:number;no_balls:number;byes:number;leg_byes:number;total:number}; fall_of_wickets:{wicket:number;score:number;over:string;player_id:number;player_name:string;dismissal:string;fielder:string|null}[]; partnerships:{wicket:number|null;runs:number;ended_at:number;dismissed:string|null}[]; over_summary:{over:number;runs:number}[]; }
export interface MatchScorecard { match_id:number; innings:ScorecardInnings[]; }
export interface AnalyticsOver { over:number; runs:number; }
export interface AnalyticsWormPoint { ball:number; runs:number; over:number; ball_number:number; }
export interface AnalyticsBatter { player_id:number; player_name:string; runs:number; balls:number; fours:number; sixes:number; strike_rate:number; }
export interface AnalyticsInnings { innings_id:number; number:number; batting_team:MatchTeamBrief; runs:number; wickets:number; overs:string; over_series:AnalyticsOver[]; worm:AnalyticsWormPoint[]; batters:AnalyticsBatter[]; }
export interface MatchResultInnings { innings:number; team:MatchTeamBrief; runs:number; wickets:number; overs:string; status:string; }
export interface MatchResult { match_id:number; status:MatchStatus; completed_at:string|null; result_type:string; result_text:string; winner:MatchTeamBrief|null; margin:number|null; target:number|null; runs_required:number|null; balls_remaining:number|null; required_run_rate:number|null; target_team:MatchTeamBrief|null; innings:MatchResultInnings[]; }

export const matchesApi = {
  list:(live=false)=>request<Match[]>(`/matches${live?"?live=true":""}`),
  get:(id:number)=>request<Match>(`/matches/${id}`),
  create:(data:{team_a_id:number;team_b_id:number;format:MatchFormat;overs?:number;test_days?:number;overs_per_day?:number;venue?:string;location?:string;latitude?:number;longitude?:number;description?:string})=>request<Match>("/matches",{method:"POST",body:JSON.stringify(data)}),
  update:(id:number,data:Partial<{format:MatchFormat;overs:number|null;test_days:number|null;overs_per_day:number|null;venue:string|null;location:string|null;latitude:number|null;longitude:number|null;description:string|null}>)=>request<Match>(`/matches/${id}`,{method:"PUT",body:JSON.stringify(data)}),
  toss:(id:number,team_id:number,call:"HEADS"|"TAILS")=>request<TossResult>(`/matches/${id}/toss`,{method:"POST",body:JSON.stringify({team_id,call})}),
  tossDecision:(id:number,decision:"BAT"|"BOWL")=>request<Match>(`/matches/${id}/toss-decision?decision=${decision}`,{method:"POST"}),
  playingXI:(id:number)=>request<MatchSetup>(`/matches/${id}/playing-xi`),
  setPlayingXI:(id:number,data:{team_a_player_ids:number[];team_b_player_ids:number[]})=>request<MatchSetup>(`/matches/${id}/playing-xi`,{method:"PUT",body:JSON.stringify(data)}),
  start:(id:number)=>request<Match>(`/matches/${id}/start`,{method:"POST"}),
  innings:(id:number)=>request<Innings[]>(`/matches/${id}/innings`),
  scorecard:(id:number)=>request<MatchScorecard>(`/matches/${id}/scorecard`),
  result:(id:number)=>request<MatchResult>(`/matches/${id}/result`),
  delete:(id:number)=>request<void>(`/matches/${id}`,{method:"DELETE"}),
  updateState:(matchId:number,inningsId:number,data:{striker_id:number;non_striker_id:number;bowler_id:number})=>request<Innings>(`/matches/${matchId}/innings/${inningsId}/state`,{method:"PATCH",body:JSON.stringify(data)}),
  startInnings:(id:number,data:{batting_team_id:number;striker_id:number;non_striker_id:number;bowler_id:number})=>request<Innings>(`/matches/${id}/innings/start`,{method:"POST",body:JSON.stringify(data)}),
  delivery:(matchId:number,inningsId:number,data:{batter_runs?:number;extra_type?:"NONE"|"WIDE"|"NO_BALL"|"BYE"|"LEG_BYE";extra_runs?:number;wicket_type?:"NONE"|"BOWLED"|"CAUGHT"|"RUN_OUT"|"LBW"|"STUMPED"|"HIT_WICKET"|"RETIRED_HURT"|"TIMED_OUT";dismissed_player_id?:number|null;fielder_id?:number|null;commentary?:string})=>request<Innings>(`/matches/${matchId}/innings/${inningsId}/deliveries`,{method:"POST",body:JSON.stringify(data)}),
};
