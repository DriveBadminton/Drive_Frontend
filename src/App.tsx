import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom'
import Home from "./pages/Home.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                {/*없는 경로는 홈으로*/}
                <Route path="*" element={<Navigate to={"/"} replace />} />
            </Routes>
        </BrowserRouter>
    )
}
