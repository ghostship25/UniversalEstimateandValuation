import React, { useState } from 'react';
import { Users, UserPlus, ShieldCheck, Mail, Building2, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../../types';

interface UserManagementViewProps {
  showToast: (msg: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ showToast }) => {
  const [users, setUsers] = useState<UserProfile[]>([
    {
      id: 'usr_1',
      name: 'Er. S. N. Adhikari',
      email: 'info@example.org',
      role: 'Senior Division Engineer',
      department: 'Department of Infrastructure Development',
      office: 'Capital City Metropolitan City',
      active: true
    },
    {
      id: 'usr_2',
      name: 'Er. B. K. Sharma',
      email: 'info@example.org',
      role: 'Site Engineer',
      department: 'Building & Housing Division',
      office: 'Capital City Office',
      active: true
    },
    {
      id: 'usr_3',
      name: 'Mr. Ramesh Karki',
      email: 'info@example.org',
      role: 'Accountant',
      department: 'Finance & Accounts Division',
      office: 'Central Office',
      active: true
    },
    {
      id: 'usr_4',
      name: 'Summit Builders Admin',
      email: 'contact@example.com',
      role: 'Contractor Admin',
      department: 'Contractor Representative',
      office: 'Site Office',
      active: true
    }
  ]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserProfile['role']>('Site Engineer');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role,
      department: 'Public Works Division',
      office: 'Local Authority Office',
      active: true
    };
    setUsers([...users, newUser]);
    setName('');
    setEmail('');
    showToast(`User ${name} added successfully.`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              ADMINISTRATION
            </span>
            <span className="text-blue-200 text-xs font-mono">• User Management</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">User Accounts & Role Permissions</h2>
          <p className="text-xs text-blue-100 mt-1">
            Manage system access for Senior Division Engineers, Site Engineers, Accounts Personnel, and Contractor Representatives.
          </p>
        </div>
      </div>

      {/* Form: Add User */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-600" />
          Create System User Account
        </h3>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name & Designations</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Er. Anish Thapa"
              className="w-full p-2.5 border rounded-xl font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. info@example.org"
              className="w-full p-2.5 border rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
            >
              <option value="Senior Division Engineer">Senior Division Engineer (Approver)</option>
              <option value="Site Engineer">Site Engineer (MB Logger)</option>
              <option value="Accountant">Accountant (IPC Payments)</option>
              <option value="Contractor Admin">Contractor Admin (Tenderer)</option>
              <option value="System Admin">System Administrator</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" /> Add User Account
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          Active System Users ({users.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2.5">User Name</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">Department</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{u.name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{u.email}</td>
                  <td className="p-2.5">
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600">{u.department}</td>
                  <td className="p-2.5 text-center">
                    <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
