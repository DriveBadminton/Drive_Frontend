import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/*없는 경로는 홈으로*/}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
