import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import CourtManager from "./pages/Dashboard.tsx";
import CreateTournament from "./pages/tournaments/CreateTournament.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/Home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/court_manager" element={<CourtManager />} />
        <Route path="/player-search" element={<Home />} />
        <Route path="/tournament-search" element={<Home />} />
        <Route path="/create-tournament" element={<CreateTournament />} />
        {/*없는 경로는 홈으로*/}
        <Route path="*" element={<Navigate to="/court_manager" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
