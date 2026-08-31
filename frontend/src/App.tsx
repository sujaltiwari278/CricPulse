import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import PlayerProfileEditor from "./pages/PlayerProfileEditor";
import Teams from "./pages/Teams";
import CreateTeam from "./pages/CreateTeam";
import TeamDetails from "./pages/TeamDetails";
import CreateMatch from "./pages/CreateMatch";
import MatchDetails from "./pages/MatchDetails";
import EditMatch from "./pages/EditMatch";
import MatchScorer from "./pages/MatchScorer";
import Matches from "./pages/Matches";
import Live from "./pages/Live";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/players" element={<Players />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/live" element={<Live />} />
          <Route path="/players/:id" element={<PlayerProfile />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetails />} />
          <Route path="/matches/:id" element={<MatchDetails />} />
          <Route path="/matches/:id/edit" element={<EditMatch />} />
          <Route element={<ProtectedRoute />}><Route path="/matches/:id/score" element={<MatchScorer />} /></Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/players/me/edit" element={<PlayerProfileEditor />} />
            <Route path="/teams/create" element={<CreateTeam />} />
            <Route path="/matches/create" element={<CreateMatch />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
