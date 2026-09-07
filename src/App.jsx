import React, { useState, useEffect } from "react";
import { LogOut, MapPin, Car } from "lucide-react";
import ParkingFinder from "./ParkingFinder";
import MyCarPage from "./MyCarPage";
import Login from "./Login";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("parking");

  useEffect(() => {
    const stored = localStorage.getItem("pf_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pf_user");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div className="flex">
          <button
            onClick={() => setTab("parking")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 ${tab === "parking" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
          >
            <MapPin size={15} /> Parking Finder
          </button>
          <button
            onClick={() => setTab("mycar")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 ${tab === "mycar" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
          >
            <Car size={15} /> My Car
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Hi, {user.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {tab === "parking" ? <ParkingFinder user={user} /> : <MyCarPage user={user} />}
    </div>
  );
}
