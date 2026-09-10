import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Picks from "./pages/Picks";
import Leagues from "./pages/Leagues";
import Tracker from "./pages/Tracker";
import Profile from "./pages/Profile";
import BottomNav from "./components/BottomNav";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/picks" element={<Picks />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
