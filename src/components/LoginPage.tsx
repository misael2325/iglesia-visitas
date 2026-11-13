import React, { useState } from 'react';
import { 
  Church, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  onRegisterUser: (newUser: AppUser) => { success: boolean; message: string; user?: AppUser };
  allUsers: AppUser[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onRegisterUser,
  allUsers,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('secretaria');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const foundUser = allUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password
    );

    if (!foundUser) {
      setErrorMsg('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
      return;
    }

    const updatedUser: AppUser = {
      ...foundUser,
      lastLogin: new Date().toISOString(),
    };

    onLoginSuccess(updatedUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor ingresa tu nombre y apellido.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Ingresa una dirección de correo electrónico válida.');
      return;
    }

    if (password.length < 5) {
      setErrorMsg('La contraseña debe tener al menos 5 caracteres.');
      return;
    }

    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      setErrorMsg('Ya existe una cuenta registrada con este correo.');
      return;
    }

    const isMainAdmin = cleanEmail === 'misaeldelossantosamador23@gmail.com';
    const finalRole: UserRole = isMainAdmin ? 'administrador' : role;

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password,
      role: finalRole,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    const res = onRegisterUser(newUser);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    onLoginSuccess(newUser);
  };

  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-slate-100 pt-safe pb-safe">
      {/* Background Architectural Grid & Subtle Navy Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Formal Seal */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 shadow-md">
            <Church className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">Eclesia</span>
            <span className="text-[11px] text-slate-400 tracking-wide uppercase font-semibold">Sistema de Gestión & Asistencia</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Acceso Restringido a Servidores y Liderazgo</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Card Title Bar */}
          <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-5 text-center border-b border-slate-800/80 bg-slate-900/90">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {mode === 'login' ? 'Iniciar Sesión' : 'Registro de Servidor'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {mode === 'login'
                ? 'Ingresa tus credenciales para acceder al registro de conferencias y asistencia.'
                : 'Crea tu usuario para registrar visitas y marcar asistencia en actividades.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex border-b border-slate-800 px-5 sm:px-8 pt-3 gap-4">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`pb-2.5 min-h-[40px] text-xs font-bold transition-colors border-b-2 ${
                mode === 'login'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingresar con mi cuenta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`pb-2.5 min-h-[40px] text-xs font-bold transition-colors border-b-2 ${
                mode === 'register'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Crear nueva cuenta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="p-5 sm:p-8 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@iglesia.org"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Rol / Cargo en la Iglesia
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="secretaria">Secretaría (Asistencia y Reportes únicamente)</option>
                  <option value="directiva_clubes">Directiva de Clubes (Solo módulo de Clubes)</option>
                  <option value="pastor">Pastor (Supervisión General)</option>
                  <option value="anciano">Anciano de Iglesia (Supervisión y Asistencia)</option>
                  <option value="administrador">Administrador General (Control Total)</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full min-h-[48px] py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
              >
                <span>{mode === 'login' ? 'Entrar al Portal' : 'Completar Registro'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer Note */}
          <div className="px-8 py-4 bg-slate-950/80 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
            <span>Sistema seguro con respaldo en la nube y sincronización eclesiástica</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        <span>Eclesia · Plataforma Institucional de Iglesia · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};
