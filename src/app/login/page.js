"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { ref, update, serverTimestamp, get } from "firebase/database";
import { auth, database } from "@/firebase"; 
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const saveUserData = async (user) => {
    try {
      const userRef = ref(database, `usuarios/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        await signOut(auth);
        throw new Error("Conta não cadastrada por um administrador.");
      }

      await update(userRef, {
        lastLogin: serverTimestamp(),
        email: user.email,
      });
    } catch (error) {
      console.error("Erro ao sincronizar dados do usuário no Realtime Database:", error);
      await signOut(auth);
      throw error;
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Autenticando...");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      await saveUserData(result.user);

      toast.success("Login efetuado com sucesso!", { id: toastId });
      router.push("/");
    } catch (error) {
      console.error(error);
      let errorMsg = "Ocorreu um erro ao fazer login.";
      if (error.code === "auth/invalid-credential") {
        errorMsg = "E-mail ou senha incorretos.";
      } else if (error.code === "auth/missing-password") {
        errorMsg = "Por favor, insira a senha.";
      } else if (error.message === "Conta não cadastrada por um administrador.") {
        errorMsg = error.message;
      } else if (error.code?.startsWith("auth/")) {
        errorMsg = "E-mail ou senha incorretos.";
      } else {
        errorMsg = "Não foi possível validar seu cadastro. Tente novamente.";
      }
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Enviando instruções...");

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Instruções de recuperação enviadas para seu e-mail.", {
        id: toastId,
        duration: 5000,
      });
      setShowPasswordReset(false);
    } catch (error) {
      console.error(error);
      const errorMsg = error.code === "auth/user-not-found"
        ? "Não encontramos uma conta com este e-mail."
        : "Não foi possível enviar as instruções de recuperação.";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="center-container login-layout">
        <div className="login-box login-card">
          <h2 className="login-title">Acesso ao SARA</h2>

          {showPasswordReset ? (
            <form onSubmit={handlePasswordReset} className="login-form">
              <p className="login-text">
                Informe seu e-mail para receber as instruções de recuperação.
              </p>
              <div className="input-group">
                <label htmlFor="reset-email">E-mail</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                  placeholder="nome@exemplo.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn login-submit-btn"
              >
                {loading ? "Enviando..." : "Enviar instruções"}
              </button>
              <button
                type="button"
                className="login-secondary-btn"
                onClick={() => setShowPasswordReset(false)}
              >
                Voltar para o login
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="login-form">
                  <div className="input-group">
                    <label htmlFor="password-email">E-mail</label>
                    <input
                      id="password-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="login-input"
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="password">Senha</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="login-input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn login-submit-btn"
                  >
                    {loading ? "Entrando..." : "Entrar com Senha"}
                  </button>
              <button
                type="button"
                className="login-secondary-btn"
                onClick={() => setShowPasswordReset(true)}
              >
                Esqueci minha senha
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}