"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { ref, update, serverTimestamp, get } from "firebase/database";
import { auth, database } from "@/firebase"; 
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [method, setMethod] = useState("password"); 
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const emailForSignIn = window.localStorage.getItem("emailForSignIn");
      if (!emailForSignIn) {
        setShowEmailConfirmation(true);
      } else {
        processEmailLinkLogin(emailForSignIn);
      }
    }
  }, []);

  // FUNÇÃO CORRIGIDA: Não reseta o Admin e mantém a chave 'nome' consistente
  const saveUserData = async (user) => {
    try {
      const userRef = ref(database, `usuarios/${user.uid}`);
      
      // Busca se o usuário já tem um registro salvo no Database
      const snapshot = await get(userRef);
      
      let updates = {};

      if (snapshot.exists()) {
        // Se o usuário já existe, só atualizamos o carimbo de último login e o e-mail
        updates = {
          lastLogin: serverTimestamp(),
          email: user.email,
        };
      } else {
        // Se for um usuário completamente novo, definimos os valores padrão de cadastro
        updates = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "Usuário sem Nome", // Corrigido de 'name' para 'nome'
          lastLogin: serverTimestamp(),
          admin: false // Só ganha false se for a primeira criação da conta
        };
      }
      
      await update(userRef, updates);
    } catch (error) {
      console.error("Erro ao sincronizar dados do usuário no Realtime Database:", error);
    }
  };

  const processEmailLinkLogin = (emailToAuth) => {
    setLoading(true);
    const toastId = toast.loading("Confirmando seu link de acesso...");

    signInWithEmailLink(auth, emailToAuth, window.location.href)
      .then(async (result) => {
        window.localStorage.removeItem("emailForSignIn");
        
        await saveUserData(result.user);

        toast.success("Autenticado com sucesso! Redirecionando...", {
          id: toastId,
        });
        router.push("/");
      })
      .catch((error) => {
        console.error(error);
        toast.error("Erro ao validar o link ou link expirado.", {
          id: toastId,
        });
      })
      .finally(() => {
        setLoading(false);
        setShowEmailConfirmation(false);
      });
  };

  const handleManualEmailConfirmation = (e) => {
    e.preventDefault();
    if (!confirmEmail) {
      toast.error("Por favor, digite o seu e-mail.");
      return;
    }
    processEmailLinkLogin(confirmEmail);
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
      }
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Enviando link...");

    const actionCodeSettings = {
      url: window.location.origin + "/login",
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      toast.success("Link de login enviado! Verifique sua caixa de entrada.", {
        id: toastId,
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar o e-mail de acesso.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="center-container">
        <div className="login-box">
          {showEmailConfirmation ? (
            <form
              onSubmit={handleManualEmailConfirmation}
              className="login-form"
            >
              <h2>Confirme seu e-mail</h2>
              <p className="login-text">
                Você abriu o link em uma sessão diferente. Insira o e-mail onde
                recebeu o link para confirmar:
              </p>
              <div className="input-group">
                <label>E-mail de Confirmação</label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
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
                {loading ? "Confirmando..." : "Concluir Login"}
              </button>
            </form>
          ) : (
            <>
              <h2>Acesso ao SARA</h2>

              <div className="login-tabs">
                <button
                  type="button"
                  onClick={() => setMethod("password")}
                  className={`login-tab-btn ${method === "password" ? "active" : ""}`}
                >
                  Senha
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("link")}
                  className={`login-tab-btn ${method === "link" ? "active" : ""}`}
                >
                  Link por E-mail
                </button>
              </div>

              {method === "password" ? (
                <form onSubmit={handlePasswordLogin} className="login-form">
                  <div className="input-group">
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="login-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Senha</label>
                    <input
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
                </form>
              ) : (
                <form onSubmit={handleLinkLogin} className="login-form">
                  <div className="input-group">
                    <label>E-mail</label>
                    <input
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
                    {loading ? "Enviando..." : "Enviar Link de Acesso"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}