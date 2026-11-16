import React, { useState } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  KeyRound, 
  Check,
  Edit3
} from 'lucide-react';
import { 
  AppUser, 
  ASSIGNABLE_USER_ROLES, 
  getRoleDisplayName, 
  getUserRoles, 
  UserRole 
} from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser | null;
  onAddUser: (newUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUserRoles: (userId: string, newRoles: UserRole[]) => void;
  onResetPassword: (userId: string, newPass: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
  onUpdateUserRoles,
  onResetPassword,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['secretaria']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline multi-role editing state
  const [editingRolesUserId, setEditingRolesUserId] = useState<string | null>(null);
  const [draftEditRoles, setDraftEditRoles] = useState<UserRole[]>([]);

  // Reset password states
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  if (!isOpen) return null;

  const toggleCreateRole = (targetRole: UserRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(targetRole)) {
        if (prev.length === 1) return prev; // Al menos 1 perfil requerido
        return prev.filter((r) => r !== targetRole);
      }
      return [...prev, targetRole];
    });
  };

  const toggleEditRole = (targetRole: UserRole) => {
    setDraftEditRoles((prev) => {
      if (prev.includes(targetRole)) {
        if (prev.length === 1) return prev; // Al menos 1 perfil requerido
        return prev.filter((r) => r !== targetRole);
      }
      return [...prev, targetRole];
    });
  };

  const handleStartEditRoles = (usr: AppUser) => {
    setEditingRolesUserId(usr.id);
    setDraftEditRoles(getUserRoles(usr));
  };

  const handleSaveEditRoles = (userId: string) => {
    if (draftEditRoles.length === 0) return;
    onUpdateUserRoles(userId, draftEditRoles);
    setEditingRolesUserId(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !password) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    if (selectedRoles.length === 0) {
      setErrorMsg('Selecciona al menos un perfil o rol para el usuario.');
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
      role: selectedRoles[0],
      roles: selectedRoles,
      createdAt: new Date().toISOString(),
    };

    onAddUser(newUser);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRoles(['secretaria']);
    setShowAddForm(false);
  };

  const handleConfirmReset = (userId: string) => {
    if (!newPasswordValue.trim()) return;
    onResetPassword(userId, newPasswordValue.trim());
    setResettingUserId(null);
    setNewPasswordValue('');
  };

  const getRoleBadgeClass = (r: UserRole) => {
    const found = ASSIGNABLE_USER_ROLES.find((m) => m.value === r);
    return (
      found?.badgeClass ||
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-600/40 rounded-lg text-indigo-200 border border-indigo-400/30 shrink-0">
              <Users className="w-5 h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">Gestión de Usuarios y Perfiles</h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Asigna uno, dos o más perfiles/roles a cada usuario según sus funciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Total de usuarios registrados: <strong className="text-slate-900 dark:text-white">{users.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="min-h-[38px] px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancelar' : '+ Crear Nuevo Usuario'}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Add User Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="p-4 sm:p-5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Registrar Nuevo Servidor o Líder
              </h3>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Hermana Sara López"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña segura"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Multi-role Selector for New User */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Perfiles / Roles Asignados (puedes marcar uno, dos o más)
                  </label>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                    {selectedRoles.length} {selectedRoles.length === 1 ? 'perfil' : 'perfiles'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ASSIGNABLE_USER_ROLES.map((item) => {
                    const active = selectedRoles.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleCreateRole(item.value)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                          active
                            ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400 shadow-xs'
                            : 'bg-white/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                            active
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            {item.shortDesc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
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
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          )}

          {/* Users List (Responsive Cards/Rows with Inline Multi-Role Editor) */}
          <div className="space-y-3">
            {users.map((usr) => {
              const isMainAdmin = usr.email.toLowerCase() === 'misaeldelossantosamador23@gmail.com';
              const isCurrent = currentUser?.id === usr.id;
              const userRoles = getUserRoles(usr);
              const isEditingThisUser = editingRolesUserId === usr.id;

              return (
                <div
                  key={usr.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                          isMainAdmin
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {usr.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                            {usr.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                              Tu sesión actual
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                          {usr.email}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isMainAdmin && !isEditingThisUser && (
                        <button
                          type="button"
                          onClick={() => handleStartEditRoles(usr)}
                          className="min-h-[34px] px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Perfiles</span>
                        </button>
                      )}

                      {/* Reset Password Button */}
                      {resettingUserId === usr.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="password"
                            value={newPasswordValue}
                            onChange={(e) => setNewPasswordValue(e.target.value)}
                            placeholder="Nueva clave"
                            className="px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg w-28 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmReset(usr.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Guardar contraseña"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUserId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setResettingUserId(usr.id);
                            setNewPasswordValue('');
                          }}
                          className="min-h-[34px] px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1.5 transition-colors"
                          title="Cambiar contraseña de este usuario"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
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
                          className="min-h-[34px] px-2.5 py-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Assigned Roles Display */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                      Perfiles asignados:
                    </span>
                    {isMainAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Admin Principal (Acceso Total)
                      </span>
                    ) : (
                      userRoles.map((r) => (
                        <span
                          key={r}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getRoleBadgeClass(r)}`}
                        >
                          {getRoleDisplayName(r)}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Inline Multi-Role Editor Drawer */}
                  {isEditingThisUser && !isMainAdmin && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Selecciona los perfiles/roles para {usr.name} (puedes elegir 1, 2 o más):
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                          {draftEditRoles.length} {draftEditRoles.length === 1 ? 'perfil' : 'perfiles'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ASSIGNABLE_USER_ROLES.map((item) => {
                          const checked = draftEditRoles.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => toggleEditRole(item.value)}
                              className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                                checked
                                  ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400 shadow-xs'
                                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div
                                className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-400 dark:border-slate-600'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                                  {item.label}
                                </span>
                                <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                  {item.shortDesc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingRolesUserId(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditRoles(usr.id)}
                          className="px-4 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar Perfiles</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
