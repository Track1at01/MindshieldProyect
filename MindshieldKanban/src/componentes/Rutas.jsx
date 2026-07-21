import { Route, Routes, useNavigate, useLocation, Navigate } from "react-router-dom";
import Dashboard from "./dashboard/dashboard";

function Rutas() {
    return (
        <Routes>
            <Route path="Login" element={<Login />} />
            <Route path="Dashboard" element={<Dashboard />} />
        </Routes>
    )
}