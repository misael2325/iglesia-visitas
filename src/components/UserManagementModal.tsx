import React, { useState } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  KeyRound, 
  Check, 
  Mail, 
  Lock, 
  User, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser | null;
  onAddUser: (newUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onResetPassword: (userId: string, newPass: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
  onUpdateUserRole,
  onResetPassword,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('secretaria');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset password states
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !password) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setErrorMsg('Ya existe un usuario con este correo electrónico.');
      return;
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: password,
      role,
      createdAt: new Date().toISOString(),
    };

    onAddUser(newUser);
    setName('');
    setEmail('');
    setPassword('');
    setShowAddForm(false);
  };

  const handleConfirmReset = (userId: string) => {
    if (!newPasswordValue.trim()) return;
    onResetPassword(userId, newPasswordValue.trim());
    setResettingUserId(null);
    setNewPasswordValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/40 rounded-lg text-indigo-200 border border-indigo-400/30">
              <Users className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Gestión de Usuarios y Servidores</h2>
              <p className="text-xs text-slate-300">Administra quiénes tienen acceso al registro de la iglesia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Total de usuarios registrados: <strong className="text-slate-900 dark:text-white">{users.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancelar' : '+ Crear Nuevo Usuario'}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add User Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Registrar Nuevo Servidor o Líder
              </h3>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Hermana Sara López"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña segura"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rol / Cargo en la Iglesia</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="secretaria">Secretaría (Solo Asistencia y Reportes)</option>
                    <option value="directiva_clubes">Directiva de Clubes (Solo módulo de Clubes)</option>
                    <option value="pastor">Pastor (Supervisión Pastoral General)</option>
                    <option value="anciano">Anciano de Iglesia (Supervisión y Asistencia)</option>
                    <option value="administrador">Administrador General (Control Total)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Correo Electrónico</th>
                  <th className="px-4 py-3">Rol / Nivel</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {users.map((usr) => {
                  const isMainAdmin = usr.email.toLowerCase() === 'misaeldelossantosamador23@gmail.com';
                  const isCurrent = currentUser?.id === usr.id;

                  return (
                    <tr key={usr.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isMainAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}>
                            {usr.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{usr.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                (Tu sesión actual)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        {usr.email}
                      </td>

                      <td className="px-4 py-3">
                        {isMainAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin Principal
                          </span>
                        ) : (
                          <select
                            value={usr.role}
                            onChange={(e) => onUpdateUserRole(usr.id, e.target.value as UserRole)}
                            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md py-1 px-2 text-slate-800 dark:text-slate-200"
                          >
                            <option value="secretaria">Secretaría (Asistencia y Reportes)</option>
                            <option value="directiva_clubes">Directiva de Clubes (Solo Clubes)</option>
                            <option value="pastor">Pastor</option>
                            <option value="anciano">Anciano</option>
                            <option value="administrador">Administrador</option>
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Reset Password Button */}
                          {resettingUserId === usr.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="password"
                                value={newPasswordValue}
                                onChange={(e) => setNewPasswordValue(e.target.value)}
                                placeholder="Nueva clave"
                                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md w-24 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmReset(usr.id)}
                                className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                                title="Guardar contraseña"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setResettingUserId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResettingUserId(usr.id);
                                setNewPasswordValue('');
                              }}
                              className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-[11px]"
                              title="Cambiar contraseña de este usuario"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Clave</span>
                            </button>
                          )}

                          {/* Delete button (cannot delete main admin) */}
                          {!isMainAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que deseas eliminar al usuario ${usr.name}?`)) {
                                onDeleteUser(usr.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>La cuenta principal de administrador siempre permanece protegida.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
