import React, { useState } from 'react';
import { Globe, Plus, MapPin, CheckCircle2 } from 'lucide-react';
import { ZoneInfo } from '../types';

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddZone: (newZone: ZoneInfo) => void;
}

export const AddZoneModal: React.FC<AddZoneModalProps> = ({
  isOpen,
  onClose,
  onAddZone
}) => {
  const [nameEn, setNameEn] = useState('');
  const [province, setProvince] = useState('');
  const [region, setRegion] = useState<'Mountain' | 'Hills' | 'Plains' | 'Urban'>('Plains');
  const [laborMultiplier, setLaborMultiplier] = useState(1.0);
  const [materialMultiplier, setMaterialMultiplier] = useState(1.0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      alert('Please enter Zone English Name');
      return;
    }

    const createdZone: ZoneInfo = {
      id: `dist_${Date.now()}`,
      name_en: nameEn.trim(),
      province,
      region,
      labor_multiplier: Number(laborMultiplier) || 1.0,
      material_multiplier: Number(materialMultiplier) || 1.0
    };

    onAddZone(createdZone);
    setNameEn('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Add Custom Rates Location (Zone / Local Authority)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Rates Schedule Location / Name (Zone or Local Authority)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Metro Central, Plains North, Hill Region..."
              className="w-full p-2.5 border rounded-xl font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">State / Province</label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="e.g. State, Province or Region"
                className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Terrain Zone</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as any)}
                className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
              >
                <option value="Hills">Hills</option>
                <option value="Mountain">Mountain</option>
                <option value="Plains">Plains</option>
                <option value="Urban">Urban</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Labor Cost Multiplier</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="3.0"
                value={laborMultiplier}
                onChange={(e) => setLaborMultiplier(parseFloat(e.target.value) || 1.0)}
                className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Default 1.00</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Material Cost Multiplier</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="3.0"
                value={materialMultiplier}
                onChange={(e) => setMaterialMultiplier(parseFloat(e.target.value) || 1.0)}
                className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Default 1.00</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Save Zone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
