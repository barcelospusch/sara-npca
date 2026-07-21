"use client";

import { auth, database } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref, remove, set, update } from "firebase/database";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function EditarMembro({ params }) {
  const { uid } = use(params);

  const [userData, setUserData] = useState(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

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

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (uid === auth.currentUser.uid) {
      toast.error(
        "Você não pode alterar seus próprios privilégios de administrador.",
      );
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

  const handleDeleteAccess = async () => {
    if (uid === auth.currentUser.uid) {
      toast.error("Você não pode excluir seu próprio acesso.");
      return;
    }

    const confirmar = window.confirm(
      `Tem certeza absoluta de que deseja revogar o acesso de ${userData?.nome || "este usuário"}? Ele será removido do banco e bloqueado.`,
    );

    if (!confirmar) return;

    setSaving(true);
    const toastId = toast.loading("Revogando acessos e limpando registros...");

    try {
      const blacklistRef = ref(database, `banidos/${uid}`);
      await set(blacklistRef, {
        banned: true,
        email: userData.email,
        date: new Date().toISOString(),
      });

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
      <main
        className="center-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Toaster position="top-right" reverseOrder={false} />
        <p
          className="login-text"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Carregando perfil do membro...
        </p>
      </main>
    );
  }

  return (
    <main>
      <div className="container" style={{ marginTop: "24px" }}>
        <div
          className="login-box"
          style={{ maxWidth: "600px", margin: "0 auto", padding: "30px" }}
        >
          <h2>{userData.name}</h2>
          <br/>
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

          <hr/>

          <div
            className="danger-zone"
          >
            <h3>
              Zona de Perigo
            </h3>
            <p
              style={{
                color: "var(--dark-gray)",
                fontSize: "14px",
                margin: "0 0 16px 0",
              }}
            >
              Ao revogar o acesso, os dados do perfil do membro serão limpos e o
              UID dele entrará na lista de banidos do banco, impedindo que ele
              utilize a plataforma mesmo que esteja autenticado.
            </p>

            <button
              type="button"
              onClick={handleDeleteAccess}
              disabled={saving}
              className="btn"
            >
              Excluir Registro
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
