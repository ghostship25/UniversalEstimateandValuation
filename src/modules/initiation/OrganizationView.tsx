import React, { useState } from 'react';
import { Building2, Save, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { ZoneInfo } from '../../types';

interface OrganizationViewProps {
  selectedZone: ZoneInfo;
  showToast: (msg: string) => void;
}

export const OrganizationView: React.FC<OrganizationViewProps> = ({
  selectedZone,
  showToast
}) => {
  const [orgName, setOrgName] = useState('Capital City Metropolitan City Office');
  const [department, setDepartment] = useState('Department of Infrastructure Development');
  const [address, setAddress] = useState(`Teku, ${selectedZone.name_en}, ${selectedZone.province}`);
  const [email, setEmail] = useState('info@example.org');
  const [phone, setPhone] = useState('+1-555-0100');
  const [panNo, setPanNo] = useState('600123456');

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Organization & Department details updated.');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              INITIATION (Master Data)
            </span>
            <span className="text-blue-200 text-xs font-mono">• Organization Setup</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Organization & Department Profile</h2>
          <p className="text-xs text-blue-100 mt-1">
            Configure Local Authority, Ministry, or Department letterhead credentials for BOQ & MB PDF exports.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          Government Office & Ministry Profile
        </h3>

        <form onSubmit={handleSaveOrg} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office / Local Authority Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department / Division</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Address & Zone</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">PAN / Tax Register Number</label>
              <input
                type="text"
                value={panNo}
                onChange={(e) => setPanNo(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone Line</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow text-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Office Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
