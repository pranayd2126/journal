import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { User } from 'lucide-react';

interface AuthProps {
  user: any;
}

export default function Auth({ user }: AuthProps) {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (user) {
    return (
      <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{user.displayName}</p>
          <p className="text-xs text-zinc-500">{user.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <User className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">ZenTrader AI</h1>
        <p className="text-zinc-400 mt-2 max-w-sm">
          A private, AI-powered trading journal designed to enforce discipline and track performance.
        </p>
      </div>
      <button
        onClick={handleLogin}
        className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all transform active:scale-95 shadow-lg shadow-white/10"
      >
        Sign in with Google
      </button>
    </div>
  );
}
