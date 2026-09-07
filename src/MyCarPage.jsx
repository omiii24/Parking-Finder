import React, { useState, useEffect, useCallback } from "react";
import { Car, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { trpc } from "./utils/trpc";

function CarForm({ initial, onCancel, onSave }) {
  const [brand, setBrand] = useState(initial?.brand || "");
  const [model, setModel] = useState(initial?.model || "");
  const [carNumber, setCarNumber] = useState(initial?.carNumber || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim() || !carNumber.trim()) return;
    onSave({ brand: brand.trim(), model: model.trim(), carNumber: carNumber.trim().toUpperCase() });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand (e.g. Maruti Suzuki)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model (e.g. Swift)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <input value={carNumber} onChange={(e) => setCarNumber(e.target.value)} placeholder="Car number (e.g. MH02AB1234)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </div>
      <div className="flex gap-2 self-end">
        <button type="button" onClick={onCancel} className="flex items-center gap-1 text-sm text-gray-500 px-3 py-1.5 rounded-lg border border-gray-300">
          <X size={14} /> Cancel
        </button>
        <button type="submit" className="flex items-center gap-1 text-sm text-white bg-blue-600 px-3 py-1.5 rounded-lg">
          <Check size={14} /> Save
        </button>
      </div>
    </form>
  );
}

export default function MyCarPage({ user }) {
  const [carsList, setCarsList] = useState([]);
  const [status, setStatus] = useState("loading");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchCars = useCallback(async () => {
    try {
      const data = await trpc.cars.list.query({ userId: user.id });
      setCarsList(data);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [user.id]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const handleAdd = async (values) => {
    const updated = await trpc.cars.add.mutate({ userId: user.id, ...values });
    setCarsList(updated);
    setAdding(false);
  };

  const handleUpdate = async (id, values) => {
    await trpc.cars.update.mutate({ id, ...values });
    setEditingId(null);
    fetchCars();
  };

  const handleDelete = async (id) => {
    const updated = await trpc.cars.delete.mutate({ id, userId: user.id });
    setCarsList(updated);
  };

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">My Cars</h2>
          <p className="text-sm text-gray-500">Saved vehicles for {user.name}</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
            <Plus size={16} /> Add Car
          </button>
        )}
      </div>

      {adding && <CarForm onCancel={() => setAdding(false)} onSave={handleAdd} />}

      {status === "loading" ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : status === "error" ? (
        <p className="text-sm text-red-500">Couldn't load your cars — make sure the backend server is running.</p>
      ) : carsList.length === 0 && !adding ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-300 rounded-xl">
          No cars saved yet. Click "Add Car" to add one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {carsList.map((c) =>
            editingId === c.id ? (
              <CarForm
                key={c.id}
                initial={c}
                onCancel={() => setEditingId(null)}
                onSave={(values) => handleUpdate(c.id, values)}
              />
            ) : (
              <div key={c.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-600 rounded-lg p-2"><Car size={18} /></div>
                  <div>
                    <p className="font-semibold text-gray-900">{c.brand} {c.model}</p>
                    <p className="text-sm text-gray-500 font-mono">{c.carNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingId(c.id)} className="text-gray-400 hover:text-blue-600 p-1.5"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 size={16} /></button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
