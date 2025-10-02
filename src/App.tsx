import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import CourtManager from "./pages/Dashboard.tsx";
import PlayerSearch from "./pages/search/PlayerSearch.tsx";
import TournamentSearch from "./pages/search/TournamentSearch.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<CourtManager />} />
        <Route path="/player-search" element={<PlayerSearch />} />
        <Route path="/tournament-search" element={<TournamentSearch />} />
        <Route path="/court-manager" element={<CourtManager />} />
        {/*없는 경로는 홈으로*/}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
