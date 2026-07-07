import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth, RequireAdmin, RequireApprovedDevice } from "@/routes/guards";
import Login from "@/pages/auth/Login";
import RetailerHome from "@/pages/retailer/Home";
import AdminDashboard from "@/pages/admin/Dashboard";

export default function App() {
  return (
    <BrowserRouter basename="/garment-platform">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route element={<RequireApprovedDevice />}>
              <Route path="/" element={<RetailerHome />} />
            </Route>
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
