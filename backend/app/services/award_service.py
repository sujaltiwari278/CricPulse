from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.match import Delivery, Innings, Match, MatchPlayer
from app.models.player import Player
from app.models.tournament import Tournament, TournamentTeam
from app.services.result_service import ResultService

CREDITED_WICKETS = {"BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"}

@dataclass
class Candidate:
    player_id: int
    player_name: str
    team_name: str
    batting_score: float = 0.0
    bowling_score: float = 0.0
    fielding_score: float = 0.0
    runs: int = 0
    wickets: int = 0
    catches: int = 0
    run_outs: int = 0
    balls: int = 0
    fours: int = 0
    sixes: int = 0
    runs_conceded: int = 0
    legal_bowling_balls: int = 0
    dot_balls: int = 0
    maidens: int = 0
    dismissed_in: set[int] = field(default_factory=set)
    batted_in: set[int] = field(default_factory=set)
    impact: float = 0.0

def _names(db: Session, ids: set[int]) -> dict[int, str]:
    if not ids: return {}
    return {p.id: p.display_name for p in db.scalars(select(Player).where(Player.id.in_(ids))).all()}

def _candidates(db: Session, match_id: int) -> list[Candidate]:
    match = db.get(Match, match_id)
    if not match: raise ValueError("Match not found.")
    roster = db.scalars(select(MatchPlayer).where(MatchPlayer.match_id == match_id)).all()
    team_by_player = {r.player_id: r.team_id for r in roster}
    deliveries = db.scalars(select(Delivery).join(Innings, Delivery.innings_id == Innings.id).where(Innings.match_id == match_id).order_by(Delivery.id)).all()
    ids = set(team_by_player)
    for d in deliveries: ids.update(p for p in (d.striker_id,d.bowler_id,d.fielder_id,d.dismissed_player_id) if p is not None)
    names = _names(db, ids); team_names={match.team_a_id:match.team_a.name, match.team_b_id:match.team_b.name}
    cs={pid:Candidate(pid,names.get(pid,f"Player {pid}"),team_names.get(team_by_player.get(pid),"")) for pid in ids}
    over_runs: dict[tuple[int,int], int] = defaultdict(int)
    over_balls: dict[tuple[int,int], int] = defaultdict(int)
    over_bowler: dict[tuple[int,int], int] = {}
    for d in deliveries:
        a=cs[d.striker_id]; a.batted_in.add(d.innings_id); a.runs+=d.batter_runs; a.balls+=int(d.legal); a.fours+=int(d.batter_runs==4); a.sixes+=int(d.batter_runs==6)
        b=cs[d.bowler_id]; b.legal_bowling_balls+=int(d.legal); b.dot_balls+=int(d.legal and d.total_runs==0); b.runs_conceded += 0 if d.extra_type in ("BYE","LEG_BYE") else d.total_runs; over_runs[(d.innings_id,d.over_number)] += d.total_runs; over_balls[(d.innings_id,d.over_number)] += int(d.legal); over_bowler[(d.innings_id,d.over_number)] = d.bowler_id
        if d.dismissed_player_id:
            cs[d.dismissed_player_id].dismissed_in.add(d.innings_id)
            if d.wicket_type in CREDITED_WICKETS: b.wickets += 1
        if d.fielder_id and d.wicket_type == "CAUGHT": cs[d.fielder_id].catches += 1
        if d.fielder_id and d.wicket_type == "RUN_OUT": cs[d.fielder_id].run_outs += 1
    for (iid,_over), balls in over_balls.items():
        pid=over_bowler.get((iid,_over));
        if pid and balls == 6 and over_runs[(iid,_over)] == 0: cs[pid].maidens += 1
    for c in cs.values():
        sr=c.runs*100/c.balls if c.balls else 0
        notout=5 if c.batted_in and len(c.dismissed_in & c.batted_in) < len(c.batted_in) else 0
        c.batting_score=c.runs+1.5*c.fours+3*c.sixes+max(0,sr-100)*0.15+notout
        econ=c.runs_conceded*6/c.legal_bowling_balls if c.legal_bowling_balls else 0
        c.bowling_score=c.wickets*24+c.dot_balls*0.7+c.maidens*8+(max(0,8-econ)*4 if c.legal_bowling_balls else 0)-(max(0,econ-9)*3 if c.legal_bowling_balls else 0)
        c.fielding_score=c.catches*8+c.run_outs*12
    try: result=ResultService.summary(db,match_id); winner_id=result.get("winner",{}).get("id") if result.get("winner") else None
    except Exception: winner_id=None
    for c in cs.values(): c.impact=(c.batting_score+c.bowling_score+c.fielding_score)*(1.12 if winner_id and team_by_player.get(c.player_id)==winner_id else 1.0)
    return sorted(cs.values(),key=lambda c:(c.impact,c.wickets,c.runs,c.fielding_score),reverse=True)

def _reason(c:Candidate)->str:
    p=[]
    if c.runs:p.append(f"{c.runs} runs")
    if c.wickets:p.append(f"{c.wickets} wicket{'s' if c.wickets!=1 else ''}")
    f=c.catches+c.run_outs
    if f:p.append(f"{f} fielding dismissal{'s' if f!=1 else ''}")
    return " · ".join(p) or "Best overall impact"

def _out(c:Candidate)->dict[str,Any]:
    return {"player_id":c.player_id,"player_name":c.player_name,"team_name":c.team_name,"impact_score":round(c.impact,2),"batting_score":round(c.batting_score,2),"bowling_score":round(c.bowling_score,2),"fielding_score":round(c.fielding_score,2),"reason":_reason(c)}

class AwardService:
    @classmethod
    def match(cls,db:Session,match_id:int)->dict[str,Any]:
        m=db.get(Match,match_id)
        if not m: raise ValueError("Match not found.")
        if m.status!="COMPLETED": return {"match_id":match_id,"man_of_the_match":None,"leaderboard":[]}
        ranked=_candidates(db,match_id); lead=[_out(c) for c in ranked if c.impact>0][:10]
        return {"match_id":match_id,"man_of_the_match":lead[0] if lead else None,"leaderboard":lead}
    @classmethod
    def tournament(cls,db:Session,tournament_id:int)->dict[str,Any]:
        t=db.get(Tournament,tournament_id)
        if not t: raise ValueError("Tournament not found.")
        team_ids=set(db.scalars(select(TournamentTeam.team_id).where(TournamentTeam.tournament_id==tournament_id)).all())
        matches=db.scalars(select(Match).where(Match.status=="COMPLETED",Match.team_a_id.in_(team_ids),Match.team_b_id.in_(team_ids)).order_by(Match.created_at)).all()
        if t.start_date: matches=[m for m in matches if m.created_at.date()>=t.start_date]
        if t.end_date: matches=[m for m in matches if m.created_at.date()<=t.end_date]
        agg:{} = {}
        for m in matches:
            for c in _candidates(db,m.id):
                if c.impact<=0: continue
                r=agg.setdefault(c.player_id,{"player_id":c.player_id,"player_name":c.player_name,"team_name":c.team_name,"total":0.0,"matches":0,"bat":0.0,"bowl":0.0,"field":0.0})
                r["total"]+=c.impact; r["matches"]+=1; r["bat"]+=c.batting_score; r["bowl"]+=c.bowling_score; r["field"]+=c.fielding_score
        rows=[]
        for r in agg.values():
            avg=r["total"]/r["matches"]; score=r["total"]*0.75+avg*0.25+min(r["matches"],5)*2
            rows.append({"player_id":r["player_id"],"player_name":r["player_name"],"team_name":r["team_name"],"impact_score":round(score,2),"batting_score":round(r["bat"],2),"bowling_score":round(r["bowl"],2),"fielding_score":round(r["field"],2),"reason":f"{r['matches']} matches · {round(r['total'],1)} total impact","matches_played":r["matches"],"average_impact":round(avg,2)})
        rows.sort(key=lambda r:(r["impact_score"],r["average_impact"],r["batting_score"]+r["bowling_score"],r["fielding_score"]),reverse=True)
        return {"tournament_id":tournament_id,"man_of_the_series":rows[0] if rows else None,"leaderboard":rows[:10]}
