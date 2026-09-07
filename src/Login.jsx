import React, { useState } from "react";
import { MapPin, LogIn, Car, Check } from "lucide-react";
import { trpc } from "./utils/trpc";

export default function Login({ onLogin }) {
  const [step, setStep] = useState("name"); // name | car
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [carNumber, setCarNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const loggedInUser = await trpc.auth.login.mutate({ name: name.trim() });
      const existingCars = await trpc.cars.list.query({ userId: loggedInUser.id });

      localStorage.setItem("pf_user", JSON.stringify(loggedInUser));

      if (existingCars.length > 0) {
        onLogin(loggedInUser); // already has a car saved, skip the car step
      } else {
        setUser(loggedInUser);
        setStep("car");
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't log in — make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleCarSubmit = async (e) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim() || !carNumber.trim()) return;
    setLoading(true);
    setError("");
    try {
      await trpc.cars.add.mutate({
        userId: user.id,
        brand: brand.trim(),
        model: model.trim(),
        carNumber: carNumber.trim().toUpperCase(),
      });
      onLogin(user);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your car — you can add it later from the My Car tab.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => onLogin(user);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-5">
        {step === "name" ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-blue-600 text-white rounded-lg p-2.5"><MapPin size={22} /></div>
              <h1 className="text-lg font-bold text-gray-900">Parking Finder</h1>
              <p className="text-sm text-gray-500 text-center">
                Enter your name to continue. This is a demo login — no password required.
              </p>
            </div>
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                <LogIn size={16} /> {loading ? "Logging in..." : "Continue"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-blue-600 text-white rounded-lg p-2.5"><Car size={22} /></div>
              <h1 className="text-lg font-bold text-gray-900">Add your car</h1>
              <p className="text-sm text-gray-500 text-center">
                Save your vehicle details so parking spots can show up tailored to your car. You can edit this later.
              </p>
            </div>
            <form onSubmit={handleCarSubmit} className="flex flex-col gap-3">
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Brand (e.g. Maruti Suzuki)"
                className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                autoFocus
              />
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model (e.g. Swift)"
                className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              <input
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value)}
                placeholder="Car number (e.g. MH02AB1234)"
                className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || !brand.trim() || !model.trim() || !carNumber.trim()}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                <Check size={16} /> {loading ? "Saving..." : "Save and continue"}
              </button>
              <button type="button" onClick={handleSkip} className="text-sm text-gray-400 text-center">
                Skip for now
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
