"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, update, remove, set } from "firebase/database";
import { auth, database } from "@/firebase";
import toast, { Toaster } from "react-hot-toast";

export default function EditarMembro({ params }) {
  // Desembrulha os parâmetros dinâmicos da URL (uid) no Next.js App Router
  const { uid } = use(params);
  
  const [userData, setUserData] = useState(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();

  // 1. Validação de Segurança: Garante que o usuário logado é realmente um administrador
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);

          if (!snapshot.exists() || snapshot.val().admin !== true) {
            toast.error("Acesso negado. Permissão insuficiente.");
            router.push("/");
          } else {
            setLoadingAuth(false);
          }
        } catch (error) {
          console.error("Erro ao validar admin:", error);
          router.push("/");
        }
      } else {
        toast.error("Você precisa estar logado.");
        router.push("/");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // 2. Busca as informações específicas do membro que está sendo editado
  useEffect(() => {
    if (loadingAuth) return;

    const fetchMembroData = async () => {
      try {
        const membroRef = ref(database, `usuarios/${uid}`);
        const snapshot = await get(membroRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setUserData(data);
          setIsAdminRole(data.admin || false);
        } else {
          toast.error("Membro não encontrado no banco de dados.");
          router.push("/admin/membros");
        }
      } catch (error) {
        console.error("Erro ao buscar dados do membro:", error);
        toast.error("Erro ao carregar dados.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchMembroData();
  }, [loadingAuth, uid, router]);

  // Salva a alteração da role (Administrador / Colaborador)
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (uid === auth.currentUser.uid) {
      toast.error("Você não pode alterar seus próprios privilégios de administrador.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Atualizando privilégios...");

    try {
      const membroRef = ref(database, `usuarios/${uid}`);
      await update(membroRef, { admin: isAdminRole });

      toast.success("Função atualizada com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Falha ao salvar alterações.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Executa a exclusão de acesso no banco de dados e coloca na Blacklist
  const handleDeleteAccess = async () => {
    if (uid === auth.currentUser.uid) {
      toast.error("Você não pode excluir seu próprio acesso.");
      return;
    }

    const confirmar = window.confirm(
      `Tem certeza absoluta de que deseja revogar o acesso de ${userData?.nome || "este usuário"}? Ele será removido do banco e bloqueado.`
    );

    if (!confirmar) return;

    setSaving(true);
    const toastId = toast.loading("Revogando acessos e limpando registros...");

    try {
      // 1. Grava o UID na rota de banidos/blacklist para impedir novos logins do Auth
      const blacklistRef = ref(database, `banidos/${uid}`);
      await set(blacklistRef, {
        banned: true,
        email: userData.email,
        date: new Date().toISOString()
      });

      // 2. Remove o nó do usuário do banco de dados
      const membroRef = ref(database, `usuarios/${uid}`);
      await remove(membroRef);

      toast.success("Acesso revogado e removido com sucesso!", { id: toastId });
      router.push("/admin/membros");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao processar exclusão no servidor.", { id: toastId });
      setSaving(false);
    }
  };

  if (loadingAuth || loadingData) {
    return (
      <main className="login-main" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Toaster position="top-right" reverseOrder={false} />
        <p className="login-text" style={{ fontFamily: "'Space Mono', monospace" }}>
          Carregando perfil do membro...
        </p>
      </main>
    );
  }

  return (
    <main>
      <Toaster position="top-right" reverseOrder={false} />

      <header style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p>{userData.name}</p>
        </div>
        <div style={{backgroundColor: "transparent"}}>
          <Link href="/admin/membros" className="btn secondary">
            Voltar para Lista
          </Link>
        </div>
      </header>

      <div className="container" style={{ marginTop: "24px" }}>
        <div className="login-box" style={{ maxWidth: "600px", margin: "0 auto", padding: "30px" }}>

          <form onSubmit={handleSaveRole} className="login-form">
            <div className="input-group">
              <label>Nível de Permissão (Função)</label>
              <select
                value={isAdminRole ? "true" : "false"}
                onChange={(e) => setIsAdminRole(e.target.value === "true")}
                className="login-input"
                disabled={saving}
                style={{ paddingInline: "8px" }}
              >
                <option value="false">Observador</option>
                <option value="true">Administrador</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn login-submit-btn"
              style={{ marginTop: "8px" }}
            >
              {saving ? "Salvando..." : "Atualizar Permissão"}
            </button>
          </form>

          <hr style={{ marginBlock: "32px", borderColor: "#333" }} />

          {/* Seção 2: Zona de Perigo / Excluir Acesso */}
          <div style={{ border: "1px solid #ff4a4a40", padding: "20px", borderRadius: "6px", backgroundColor: "#ff4a4a05" }}>
            <h4 style={{ color: "#ff4a4a", margin: "0 0 8px 0" }}>Zona de Perigo</h4>
            <p style={{ color: "var(--dark-gray)", fontSize: "14px", margin: "0 0 16px 0" }}>
              Ao revogar o acesso, os dados do perfil do membro serão limpos e o UID dele entrará na lista de banidos do banco, impedindo que ele utilize a plataforma mesmo que esteja autenticado.
            </p>
            
            <button
              type="button"
              onClick={handleDeleteAccess}
              disabled={saving}
              className="btn"
              style={{ backgroundColor: "#ff4a4a", color: "#fff", border: "none", width: "100%" }}
            >
              Excluir Registro e Revogar Acesso
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}