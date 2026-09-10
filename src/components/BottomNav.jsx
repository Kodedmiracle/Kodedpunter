import { NavLink } from "react-router-dom";
import { Home as HomeIcon, TrendingUp, Trophy, LineChart, User } from "lucide-react";

const tabs = [
  { to: "/", icon: HomeIcon, label: "Home" },
  { to: "/picks", icon: TrendingUp, label: "Picks" },
  { to: "/leagues", icon: Trophy, label: "Leagues" },
  { to: "/tracker", icon: LineChart, label: "Tracker" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
