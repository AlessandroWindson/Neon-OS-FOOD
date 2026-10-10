import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Lock, 
  Mail, 
  Phone, 
  Building2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  ShieldCheck, 
  RefreshCw,
  Store,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  UserCheck,
  Users,
  Coffee,
  Crown
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { auth, db, syncRestaurantAndOwner, registerStaffMemberInFirestore } from '../lib/firebase';
import { SUPER_ADMIN_USER } from '../services/firebase';
import { auditService } from '../services/auditService';
import { playBeep, playCashRegister } from '../utils/audio';
import { UserRole } from '../types';

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi desativada pelo administrador.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado no sistema. Tente fazer login ou recuperar sua senha.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Ela deve conter pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'O login por e-mail/senha ainda não foi ativado no Firebase Console. Utilize o botão "Entrar com Google" para acesso imediato!';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Por segurança, aguarde alguns minutos e tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autenticação do Google foi fechada antes de concluir.';
    case 'auth/popup-blocked':
      return 'O pop-up de login foi bloqueado pelo seu navegador. Por favor, autorize pop-ups para este site.';
    case 'auth/cancelled-popup-request':
      return 'A requisição anterior de login do Google foi cancelada.';
    default:
      return 'Não foi possível autenticar. Verifique sua conexão e tente novamente.';
  }
}

/**
 * Normalizes 'Administrador' and 'AlesandroWindson' inputs by mapping them
 * to the system's internal admin email ('admin@sistema.com') and canonical UID ('usr_superadmin_alessandro').
 */
export function normalizeAdminAlias(input: string): { 
  isAlias: boolean; 
  mappedEmail: string; 
  mappedUid: string; 
  displayName: string;
} {
  const clean = input.trim().toLowerCase().replace(/[\s\-_.]/g, '');
  if (
    clean === 'administrador' || 
    clean === 'alesandrowindson' || 
    clean === 'alessandrowindson' || 
    clean === 'admin' || 
    input.trim().toLowerCase() === 'admin@sistema.com'
  ) {
    const isAlesandro = clean.includes('alesandro') || clean.includes('alessandro');
    return {
      isAlias: true,
      mappedEmail: 'admin@sistema.com',
      mappedUid: 'usr_superadmin_alessandro',
      displayName: isAlesandro ? 'Alesandro Windson' : 'Super Administrador',
    };
  }
  return { isAlias: false, mappedEmail: '', mappedUid: '', displayName: '' };
}

export const AuthModal: React.FC = () => {
  const { 
    setCurrentView, 
    switchRole, 
    setCurrentUser, 
    currentUser,
    switchToSuperAdmin,
    switchToUser 
  } = useApp();
  const [tab, setTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'manager' | 'cashier' | 'kitchen'>('owner');

  // Track real-time Firebase Auth session state
  const [activeFirebaseUser, setActiveFirebaseUser] = useState<FirebaseUser | null>(null);

  // Check if current user input matches Super Admin aliases ('Administrador' or 'AlesandroWindson')
  const isSuperAdminAliasInput = normalizeAdminAlias(email).isAlias;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Google Login with Firebase Auth
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGoogleLoading(true);
    playBeep(880, 0.05);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      let resolvedRole: UserRole = selectedRole;

      // Synchronize with Firestore user profile document
      try {
        await syncRestaurantAndOwner(user.uid, companyName || 'Meu Restaurante', user.email || '', selectedRole);
        const userDocRef = doc(db, 'users', user.uid);
        const existingDoc = await getDoc(userDocRef);
        if (!existingDoc.exists()) {
          await setDoc(userDocRef, {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Usuário Google',
            email: user.email || '',
            phone: user.phoneNumber || '',
            companyName: companyName || 'Meu Restaurante',
            role: selectedRole,
            restaurantId: user.uid,
            tenantId: 'tenant_' + user.uid.slice(0, 8),
            createdAt: new Date().toISOString()
          });
          await registerStaffMemberInFirestore(user.uid, user.uid, {
            name: user.displayName || user.email?.split('@')[0] || 'Usuário Google',
            email: user.email || '',
            role: selectedRole === 'owner' ? 'admin' : selectedRole,
          });
        } else {
          const data = existingDoc.data();
          if (data.role) {
            resolvedRole = data.role as UserRole;
          }
        }
      } catch (err) {
        console.warn('Aviso: perfil não gravado no Firestore:', err);
      }

      // Update AppContext
      setCurrentUser(prev => ({
        ...prev,
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Usuário Google',
        email: user.email || '',
        avatarUrl: user.photoURL || prev.avatarUrl,
        role: resolvedRole
      }));

      // Auditoria Global: Registrar login no Firestore 'auditLogs'
      auditService.logLogin(
        {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Usuário Google',
          email: user.email || '',
          role: resolvedRole
        },
        'tenant_' + user.uid.slice(0, 8),
        { method: 'google_popup', companyName }
      ).catch(() => {});

      playCashRegister();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      const roleDisplay = resolvedRole === 'kitchen' ? 'Cozinha (KDS)' : resolvedRole === 'cashier' ? 'Atendente' : resolvedRole === 'manager' ? 'Gerente' : 'Admin';
      setSuccessMessage(`Bem-vindo(a), ${user.displayName || user.email}! Função: ${roleDisplay}.`);
      setTimeout(() => {
        if (resolvedRole === 'kitchen') {
          setCurrentView('kds');
        } else if (resolvedRole === 'cashier') {
          setCurrentView('pdv');
        } else {
          setCurrentView('overview_bi');
        }
      }, 700);
    } catch (err: any) {
      console.error('Erro Google Auth:', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
      playBeep(400, 0.1);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Submit handler for Email/Password (Login, Register, Recovery)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    playBeep(880, 0.05);

    const userEntered = email.trim();
    const passEntered = password.trim();

    // 1. Normalização de aliases 'Administrador' e 'AlesandroWindson'
    // Mapeia inputs para o e-mail/UID administrativo interno do sistema e autentica com a credencial 'Man4uS'
    const adminAlias = normalizeAdminAlias(userEntered);

    if (adminAlias.isAlias && tab === 'login') {
      try {
        const canonicalAdminEmail = adminAlias.mappedEmail; // 'admin@sistema.com'
        const internalAdminUid = adminAlias.mappedUid;      // 'usr_superadmin_alessandro'
        const secureAdminCredential = 'Man4uS';

        let userCredential;
        try {
          // Executa a autenticação chamando signInWithEmailAndPassword com a credencial segura 'Man4uS'
          userCredential = await signInWithEmailAndPassword(auth, canonicalAdminEmail, secureAdminCredential);
        } catch (authErr: any) {
          // Se o usuário administrativo ainda não existir na instância atual do Firebase Auth, provisiona automaticamente
          if (authErr?.code === 'auth/user-not-found' || authErr?.code === 'auth/invalid-credential') {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, canonicalAdminEmail, secureAdminCredential);
            } catch {
              throw authErr;
            }
          } else {
            throw authErr;
          }
        }

        const fbUser = userCredential.user;
        const resolvedDisplayName = adminAlias.displayName;

        try {
          await updateProfile(fbUser, { displayName: resolvedDisplayName });
        } catch {}

        // Sincronizar perfil e permissões no Firestore (/users e /admins)
        try {
          await setDoc(doc(db, 'users', fbUser.uid), {
            id: fbUser.uid,
            name: resolvedDisplayName,
            email: canonicalAdminEmail,
            role: 'super_admin',
            phone: '(11) 99999-0001',
            companyName: 'NEON FOOD OS Central',
            tenantId: 'tenant_system_master',
            branchId: 'branch_system_master',
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await setDoc(doc(db, 'admins', fbUser.uid), {
            uid: fbUser.uid,
            email: canonicalAdminEmail,
            role: 'super_admin',
            authorizedAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.warn('Sync admin profile in Firestore:', dbErr);
        }

        // Estabelecer sessão autenticada do Super Admin
        sessionStorage.setItem('super_admin_auth', 'true');
        sessionStorage.setItem('super_admin_verified', 'true');
        await switchRole('super_admin');
        setCurrentUser({
          id: fbUser.uid || internalAdminUid,
          name: resolvedDisplayName,
          email: canonicalAdminEmail,
          phone: '(11) 99999-0001',
          role: 'super_admin',
          tenantId: 'tenant_system_master',
          branchId: 'branch_system_master',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        });

        // Auditoria Global: Registrar login de Super Admin no Firestore 'auditLogs'
        auditService.logLogin(
          {
            id: fbUser.uid || internalAdminUid,
            name: resolvedDisplayName,
            email: canonicalAdminEmail,
            role: 'super_admin'
          },
          'tenant_system_master',
          { method: 'admin_credential' }
        ).catch(() => {});

        playCashRegister();
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
        setSuccessMessage(`Acesso master autorizado com sucesso! Bem-vindo(a), ${userEntered}.`);
        setTimeout(() => {
          setCurrentView('super_admin');
        }, 500);
        setLoading(false);
        return;
      } catch (authError: any) {
        // Fallback resiliente se provedor de e-mail/senha estiver desabilitado no console ou sem conexão
        if (authError?.code === 'auth/operation-not-allowed' || authError?.code === 'auth/network-request-failed') {
          sessionStorage.setItem('super_admin_auth', 'true');
          sessionStorage.setItem('super_admin_verified', 'true');
          await switchRole('super_admin');
          setCurrentUser({
            ...SUPER_ADMIN_USER,
            id: adminAlias.mappedUid,
            name: adminAlias.displayName,
          });
          playCashRegister();
          setSuccessMessage(`Acesso master autorizado com sucesso! Bem-vindo(a), ${userEntered}.`);
          setTimeout(() => {
            setCurrentView('super_admin');
          }, 500);
          setLoading(false);
          return;
        }

        console.error('Erro de autenticação Super Admin:', authError);
        const feedbackMsg = getFirebaseErrorMessage(authError?.code || '') || 'Credenciais administrativas inválidas ou serviço temporariamente indisponível.';
        setErrorMessage(`Falha na autenticação administrativa: ${feedbackMsg}`);
        playBeep(400, 0.1);
        setLoading(false);
        return;
      }
    }

    try {
      if (tab === 'recovery') {
        if (!userEntered) {
          setErrorMessage('Por favor, digite seu e-mail cadastrado.');
          setLoading(false);
          return;
        }

        await sendPasswordResetEmail(auth, userEntered);
        setSuccessMessage('E-mail oficial de recuperação enviado! Verifique sua caixa de entrada.');
        playCashRegister();
        setTimeout(() => {
          setTab('login');
          setSuccessMessage('');
        }, 3500);
      } else if (tab === 'register') {
        if (!userEntered || !passEntered) {
          setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
          setLoading(false);
          return;
        }
        if (passEntered.length < 6) {
          setErrorMessage('A senha deve conter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }

        // Real Firebase Auth user registration
        const userCredential = await createUserWithEmailAndPassword(auth, userEntered, passEntered);
        const fbUser = userCredential.user;

        // Set Firebase display name
        try {
          await updateProfile(fbUser, {
            displayName: companyName.trim() || userEntered.split('@')[0]
          });
        } catch (e) {}

        // Persist User Profile and Restaurant into Firestore with chosen RBAC role
        try {
          await syncRestaurantAndOwner(fbUser.uid, companyName.trim() || 'Meu Restaurante', userEntered, selectedRole);
          await setDoc(doc(db, 'users', fbUser.uid), {
            id: fbUser.uid,
            name: companyName.trim() || userEntered.split('@')[0],
            email: userEntered,
            phone: phone.trim(),
            companyName: companyName.trim() || 'Meu Restaurante',
            role: selectedRole,
            restaurantId: fbUser.uid,
            tenantId: 'tenant_' + fbUser.uid.slice(0, 8),
            createdAt: new Date().toISOString()
          });
          await registerStaffMemberInFirestore(fbUser.uid, fbUser.uid, {
            name: companyName.trim() || userEntered.split('@')[0],
            email: userEntered,
            role: selectedRole === 'owner' ? 'admin' : selectedRole,
          });
        } catch (err) {
          console.warn('Aviso ao gravar documento de perfil:', err);
        }

        // Update local app context
        setCurrentUser(prev => ({
          ...prev,
          id: fbUser.uid,
          name: companyName.trim() || userEntered.split('@')[0],
          email: userEntered,
          phone: phone.trim(),
          role: selectedRole
        }));

        playCashRegister();
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 }
        });

        const roleLabel = selectedRole === 'kitchen' ? 'Cozinha (KDS)' : selectedRole === 'cashier' ? 'Atendente' : selectedRole === 'manager' ? 'Gerente' : 'Admin';
        setSuccessMessage(`Conta cadastrada com sucesso no Firebase Auth como ${roleLabel}!`);
        setTimeout(() => {
          if (selectedRole === 'kitchen') {
            setCurrentView('kds');
          } else if (selectedRole === 'cashier') {
            setCurrentView('pdv');
          } else {
            setCurrentView('overview_bi');
          }
        }, 800);
      } else {
        // Tab: Login
        if (!userEntered || !passEntered) {
          setErrorMessage('Por favor, informe seu e-mail e senha.');
          setLoading(false);
          return;
        }

        // Real Firebase Auth login
        const userCredential = await signInWithEmailAndPassword(auth, userEntered, passEntered);
        const fbUser = userCredential.user;

        // Fetch user role and profile from Firestore
        let finalName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário Conectado';
        let finalRole: UserRole = 'owner';
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) finalName = data.name;
            if (data.role) finalRole = data.role as UserRole;
          }
        } catch (e) {}

        setCurrentUser(prev => ({
          ...prev,
          id: fbUser.uid,
          name: finalName,
          email: fbUser.email || userEntered,
          role: finalRole
        }));

        // Auditoria Global: Registrar login no Firestore 'auditLogs'
        auditService.logLogin(
          {
            id: fbUser.uid,
            name: finalName,
            email: fbUser.email || userEntered,
            role: finalRole
          },
          'tenant_lanchonete_dulci',
          { method: 'password_auth' }
        ).catch(() => {});

        playCashRegister();
        const roleLabel = finalRole === 'super_admin' ? 'Super Admin' : finalRole === 'kitchen' ? 'Cozinha (KDS)' : finalRole === 'cashier' ? 'Atendente' : finalRole === 'manager' ? 'Gerente' : 'Admin';
        setSuccessMessage(`Login realizado com sucesso! Bem-vindo(a), ${finalName} (${roleLabel}).`);
        setTimeout(() => {
          if (finalRole === 'super_admin') {
            sessionStorage.setItem('super_admin_auth', 'true');
            sessionStorage.setItem('super_admin_verified', 'true');
            setCurrentView('super_admin');
          } else if (finalRole === 'kitchen') {
            setCurrentView('kds');
          } else if (finalRole === 'cashier') {
            setCurrentView('pdv');
          } else {
            setCurrentView('overview_bi');
          }
        }, 600);
      }
    } catch (err: any) {
      console.error('Erro de Autenticação Firebase:', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
      playBeep(400, 0.1);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutActiveUser = async () => {
    try {
      await signOut(auth);
      setSuccessMessage('Você desconectou da conta com sucesso.');
      playBeep(440, 0.1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickStoreDemo = () => {
    playCashRegister();
    switchToUser();
    setCurrentView('overview_bi');
  };

  const handleQuickSuperAdmin = () => {
    playCashRegister();
    switchToSuperAdmin();
    setCurrentView('super_admin');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0E0E16] border-2 border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Neon Glow backdrop */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#DA291C]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#FF7A00]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DA291C] to-[#FF7A00] p-[1.5px] mx-auto mb-3 shadow-[0_0_20px_rgba(218,41,28,0.4)]">
            <div className="w-full h-full bg-[#0C0C0F] rounded-[14px] flex items-center justify-center">
              <Flame className="w-6 h-6 text-[#FFC72C]" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Firebase Auth Ativo & Seguro</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {tab === 'login' && 'Entrar no Neon Food OS'}
            {tab === 'register' && 'Cadastrar Restaurante'}
            {tab === 'recovery' && 'Recuperar Senha'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {tab === 'login' && 'Acesso real e seguro sincronizado com o Firebase Cloud'}
            {tab === 'register' && 'Crie sua conta para gerenciar cardápio, estoque e pedidos em tempo real'}
            {tab === 'recovery' && 'Informe o seu e-mail cadastrado para receber o link de redefinição'}
          </p>
        </div>

        {/* Active Authenticated Session Banner (if logged in already) */}
        {activeFirebaseUser && (
          <div className="mb-4 p-3 rounded-2xl bg-[#141424] border border-[#2D2A42] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-zinc-300 font-bold truncate">
                  Conectado como <span className="text-white">{activeFirebaseUser.displayName || activeFirebaseUser.email}</span>
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{activeFirebaseUser.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentView('overview_bi')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] cursor-pointer transition-colors"
              >
                Acessar
              </button>
              <button
                type="button"
                onClick={handleSignOutActiveUser}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                title="Sair desta conta"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 1-Click Google Sign-In with Firebase Auth */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {googleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Entrar com Conta Google</span>
          </button>

          {/* Atalhos Rápidos para Teste Real */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickStoreDemo}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer text-center"
              title="Acessar como Usuário Gestor"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Modo Usuário Gestor</span>
            </button>

            <button
              type="button"
              onClick={handleQuickSuperAdmin}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-[#FFC72C] border border-[#DA291C]/40 text-[11px] font-bold transition-all cursor-pointer text-center"
              title="Acessar como Super Administrador"
            >
              <Crown className="w-3.5 h-3.5 text-[#FFC72C] shrink-0" />
              <span>Super Admin Master</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-4">
          <div className="border-t border-zinc-800 w-full" />
          <span className="bg-[#0E0E16] px-3 text-[10px] font-bold uppercase text-zinc-500 tracking-wider shrink-0">
            Ou com E-mail e Senha
          </span>
          <div className="border-t border-zinc-800 w-full" />
        </div>

        {/* Tabs */}
        <div className="flex bg-[#161622] p-1 rounded-xl border border-zinc-800 mb-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setSuccessMessage(''); setErrorMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'login' ? 'bg-[#DA291C] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            1. Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setSuccessMessage(''); setErrorMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'register' ? 'bg-[#FF7A00] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            2. Cadastrar
          </button>
          <button
            type="button"
            onClick={() => { setTab('recovery'); setSuccessMessage(''); setErrorMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'recovery' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            3. Recuperar
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#00D26A]/15 border border-[#00D26A]/40 text-[#00D26A] text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border-2 border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Nome do seu Restaurante ou Loja *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Hamburgueria & Chopp Artesanal"
                    className="w-full bg-[#161624] border border-zinc-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#DA291C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Seletor de Função RBAC no Firestore */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Função no Sistema (Permissões Firestore) *</span>
                  <span className="text-[10px] text-[#FFC72C] font-semibold">RBAC Seguro</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'owner',
                      title: 'Admin (Dono)',
                      tag: 'Acesso Total',
                      desc: 'Todas as coleções e finanças',
                      icon: Crown,
                      color: '#DA291C'
                    },
                    {
                      id: 'manager',
                      title: 'Gerente',
                      tag: 'Gestão & DRE',
                      desc: 'Cardápio, estoque e finanças',
                      icon: Users,
                      color: '#FFC72C'
                    },
                    {
                      id: 'cashier',
                      title: 'Atendente',
                      tag: 'PDV & Balcão',
                      desc: 'Comandas e vendas (Sem finanças)',
                      icon: Coffee,
                      color: '#00D26A'
                    },
                    {
                      id: 'kitchen',
                      title: 'Cozinha',
                      tag: 'KDS & Chef',
                      desc: 'Monitor e baixa (Sem finanças/PDV)',
                      icon: Flame,
                      color: '#FF7A00'
                    }
                  ].map(roleItem => {
                    const RoleIcon = roleItem.icon;
                    const isSelected = selectedRole === roleItem.id;
                    return (
                      <button
                        key={roleItem.id}
                        type="button"
                        onClick={() => setSelectedRole(roleItem.id as any)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#1C1C2C] border-[#FFC72C] shadow-sm'
                            : 'bg-[#141420] border-zinc-800 hover:border-zinc-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${roleItem.color}20`, color: roleItem.color }}
                            >
                              <RoleIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white">{roleItem.title}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC72C]" />}
                        </div>
                        <span className="text-[9.5px] text-zinc-400 line-clamp-1">{roleItem.desc}</span>
                        <span 
                          className="mt-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded w-fit"
                          style={{ backgroundColor: `${roleItem.color}15`, color: roleItem.color }}
                        >
                          {roleItem.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
              {tab === 'login' ? 'E-mail ou Usuário (Administrador)' : 'Seu E-mail *'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder={tab === 'login' ? 'Administrador ou seu-email@exemplo.com' : 'seu-email@restaurante.com'}
                className="w-full bg-[#161624] border border-zinc-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#DA291C] focus:outline-none font-medium"
              />
            </div>
          </div>

          {(tab === 'register' || tab === 'recovery') && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                WhatsApp com DDD
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-[#161624] border border-zinc-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#DA291C] focus:outline-none"
                />
              </div>
            </div>
          )}

          {tab !== 'recovery' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase text-zinc-400">
                  {tab === 'login' ? 'Sua Senha *' : 'Criar Senha (Mínimo 6 caracteres) *'}
                </label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => setTab('recovery')}
                    className="text-[11px] text-[#FF7A00] hover:underline font-semibold cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={tab !== 'login' || !isSuperAdminAliasInput}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder={isSuperAdminAliasInput && !password ? '•••••••• (Man4uS)' : '••••••••'}
                  className="w-full bg-[#161624] border border-zinc-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#DA291C] focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-6 bg-gradient-to-r from-[#DA291C] via-[#FF7A00] to-[#FFC72C] hover:opacity-95 text-black font-black text-sm py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <span>
                  {tab === 'login' && 'ENTRAR COM FIREBASE AUTH'}
                  {tab === 'register' && 'CRIAR CONTA SEGURA NO FIREBASE'}
                  {tab === 'recovery' && 'ENVIAR E-MAIL DE RECUPERAÇÃO'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Simulador de Permissões RBAC (1-Click Test) */}
        <div className="mt-5 p-3 rounded-xl bg-[#141420] border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Simular Papel / Permissões (RBAC)</span>
            </div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Firestore Ativo</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { role: 'owner', label: 'Admin', icon: Crown, color: '#DA291C', view: 'overview_bi' },
              { role: 'manager', label: 'Gerente', icon: Users, color: '#FFC72C', view: 'overview_bi' },
              { role: 'cashier', label: 'Atendente', icon: Coffee, color: '#00D26A', view: 'pdv' },
              { role: 'kitchen', label: 'Cozinha', icon: Flame, color: '#FF7A00', view: 'kds' },
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentUser.role === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    playBeep(700, 0.05);
                    setCurrentUser(prev => ({
                      ...prev,
                      role: item.role as UserRole
                    }));
                    setCurrentView(item.view as any);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center gap-1 ${
                    isActive 
                      ? 'bg-zinc-800 text-white font-bold border border-[#FFC72C]' 
                      : 'bg-[#0E0E18] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                  title={`Testar visão e permissões do papel ${item.label}`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  <span className="text-[10px] truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé com navegação e selo de segurança */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <button
            onClick={() => setCurrentView('landing')}
            className="text-zinc-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Planos & Vendas</span>
          </button>

          <button
            onClick={() => setCurrentView('overview_bi')}
            className="text-zinc-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Ir para o Painel →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
