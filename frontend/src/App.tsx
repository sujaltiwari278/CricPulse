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
import Tournaments from "./pages/Tournaments";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* LOGIN PAGE IS PUBLIC */}
          <Route path="/auth" element={<Auth />} />

          {/* ALL OTHER PAGES REQUIRE LOGIN */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<><Navbar /><Home /></>} />

            <Route
              path="/players"
              element={<><Navbar /><Players /></>}
            />

            <Route
              path="/players/:id"
              element={<><Navbar /><PlayerProfile /></>}
            />

            <Route
              path="/players/me/edit"
              element={<><Navbar /><PlayerProfileEditor /></>}
            />

            <Route
              path="/teams"
              element={<><Navbar /><Teams /></>}
            />

            <Route
              path="/teams/:id"
              element={<><Navbar /><TeamDetails /></>}
            />

            <Route
              path="/teams/create"
              element={<><Navbar /><CreateTeam /></>}
            />

            <Route
              path="/matches"
              element={<><Navbar /><Matches /></>}
            />

            <Route
              path="/matches/:id"
              element={<><Navbar /><MatchDetails /></>}
            />

            <Route
              path="/matches/:id/edit"
              element={<><Navbar /><EditMatch /></>}
            />

            <Route
              path="/matches/create"
              element={<><Navbar /><CreateMatch /></>}
            />

            <Route
              path="/matches/:id/score"
              element={<><Navbar /><MatchScorer /></>}
            />

            <Route
              path="/tournaments"
              element={<><Navbar /><Tournaments /></>}
            />

          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}