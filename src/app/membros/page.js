"use client";

import { auth, database } from "@/firebase";
import { CopyIcon, XIcon } from "@phosphor-icons/react";
import { onAuthStateChanged } from "firebase/auth";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ListaMembros() {
  const [membros, setMembros] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);

          if (!snapshot.exists() || snapshot.val().admin !== true) {
            toast.error(
              "Acesso negado. Você não possui permissão de administrador.",
            );
            router.push("/");
          } else {
            setLoadingAuth(false);
          }
        } catch (error) {
          console.error("Erro ao validar admin:", error);
          toast.error("Erro de autenticação. Redirecionando...");
          router.push("/");
        }
      } else {
        toast.error("Você precisa estar logado para acessar esta área.");
        router.push("/");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;

    const usuariosRef = ref(database, "usuarios");
    const candidatosRef = ref(database, "candidatos");

    // Escuta alterações na coleção de usuários
    const unsubscribeUsuarios = onValue(
      usuariosRef,
      (usuariosSnapshot) => {
        // Escuta alterações na coleção de candidatos
        onValue(
          candidatosRef,
          (candidatosSnapshot) => {
            if (usuariosSnapshot.exists()) {
              const dadosUsuarios = usuariosSnapshot.val();
              const dadosCandidatos = candidatosSnapshot.exists()
                ? candidatosSnapshot.val()
                : {};

              // Converte o objeto de candidatos em array
              const listaCandidatos = Object.values(dadosCandidatos);

              const listaMembrosFormatada = Object.keys(dadosUsuarios).map(
                (uid) => {
                  // Filtra os candidatos registrados por este usuário específico (observerUid)
                  const candidatosDoMembro = listaCandidatos.filter(
                    (candidato) => candidato.observerUid === uid,
                  );

                  // Contagem por status referente aos candidatos do membro
                  const total = candidatosDoMembro.length;
                  const emAnalise = candidatosDoMembro.filter(
                    (c) =>
                      c.status === "Em análise" || c.status === "em_analise",
                  ).length;
                  const preliminar = candidatosDoMembro.filter(
                    (c) =>
                      c.status === "Preliminar" || c.status === "preliminar",
                  ).length;
                  const provisoria = candidatosDoMembro.filter(
                    (c) =>
                      c.status === "Provisória" ||
                      c.status === "Provisório" ||
                      c.status === "provisoria",
                  ).length;

                  return {
                    uid,
                    ...dadosUsuarios[uid],
                    totalRegistros: total,
                    emAnalise,
                    preliminar,
                    provisoria,
                  };
                },
              );

              // Ordena os membros do maior para o menor em relação ao total de registros
              listaMembrosFormatada.sort(
                (a, b) => b.totalRegistros - a.totalRegistros,
              );

              setMembros(listaMembrosFormatada);
            } else {
              setMembros([]);
            }
            setLoadingData(false);
          },
          (err) => {
            console.error("Erro ao ler dados de candidatos:", err);
            setLoadingData(false);
          },
        );
      },
      (err) => {
        console.error("Erro ao ler dados de usuários:", err);
        setLoadingData(false);
      },
    );

    return () => {
      unsubscribeUsuarios();
    };
  }, [loadingAuth]);

  const handleOpenMember = (membro) => {
    setSelectedMember(membro);
    setMemberName(membro.name || "");
    setMemberEmail(membro.email || "");
    setIsAdminRole(Boolean(membro.admin));
  };

  useEffect(() => {
    if (membros.length === 0) return;

    const requestedUid = new URLSearchParams(window.location.search).get("uid");
    if (!requestedUid) return;

    const requestedMember = membros.find(
      (membro) => membro.uid === requestedUid,
    );

    if (requestedMember) {
      handleOpenMember(requestedMember);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [membros]);

  const handleCloseMember = () => {
    if (saving) return;
    setSelectedMember(null);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();

    if (!selectedMember) return;
    if (!memberName.trim() || !memberEmail.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }

    if (
      selectedMember.uid === auth.currentUser?.uid &&
      isAdminRole !== Boolean(selectedMember.admin)
    ) {
      toast.error(
        "Você não pode alterar seus próprios privilégios de administrador.",
      );
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Atualizando privilégios...");

    try {
      const updatedMember = {
        name: memberName.trim(),
        email: memberEmail.trim(),
        admin: isAdminRole,
      };

      await update(ref(database, `usuarios/${selectedMember.uid}`), {
        ...updatedMember,
      });

      setMembros((currentMembers) =>
        currentMembers.map((member) =>
          member.uid === selectedMember.uid
            ? { ...member, ...updatedMember }
            : member,
        ),
      );
      setSelectedMember((member) =>
        member ? { ...member, ...updatedMember } : member,
      );
      toast.success("Dados do membro atualizados com sucesso!", {
        id: toastId,
      });
    } catch (error) {
      console.error("Erro ao atualizar função:", error);
      toast.error("Falha ao salvar alterações.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    if (selectedMember.uid === auth.currentUser?.uid) {
      toast.error("Você não pode excluir seu próprio acesso.");
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza absoluta de que deseja revogar o acesso de ${selectedMember.name || "este usuário"}? Ele será removido do banco e bloqueado.`,
    );

    if (!confirmed) return;

    setSaving(true);
    const toastId = toast.loading("Revogando acessos e limpando registros...");

    try {
      await set(ref(database, `banidos/${selectedMember.uid}`), {
        banned: true,
        email: selectedMember.email,
        date: new Date().toISOString(),
      });
      await remove(ref(database, `usuarios/${selectedMember.uid}`));

      setMembros((currentMembers) =>
        currentMembers.filter((member) => member.uid !== selectedMember.uid),
      );
      setSelectedMember(null);
      toast.success("Acesso revogado e removido com sucesso!", {
        id: toastId,
      });
    } catch (error) {
      console.error("Erro ao excluir membro:", error);
      toast.error("Erro ao processar exclusão no servidor.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuth || loadingData) {
    return (
      <main className="center-container members-loading">
        <p className="login-text members-loading-text">
          Verificando credenciais e carregando banco de dados...
        </p>
      </main>
    );
  }

  return (
    <main className="members-page">
      <div className="container members-container">
        <p className="members-count">
          <b>Membros cadastrados:</b> {membros.length}
        </p>
        <div className="table-responsive members-table">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Função</th>
                <th className="members-count-header">Candidatos Registrados</th>
              </tr>
            </thead>
            <tbody>
              {membros.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="members-empty"
                  >
                    Nenhum membro encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                membros.map((membro) => (
                  <tr key={membro.uid}>
                    <td>
                      <div className="withbtn-field">
                        <button
                          type="button"
                          className="member-name-button"
                          onClick={() => handleOpenMember(membro)}
                        >
                          {membro.name || "Sem nome cadastrado"}
                        </button>

                        <button
                          className="icon"
                          type="button"
                          title="Copiar nome"
                          aria-label={`Copiar nome de ${membro.name || "membro"}`}
                          onClick={() => {
                            navigator.clipboard.writeText(membro.name || "");
                            toast.success("Nome copiado!");
                          }}
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="withbtn-field">
                        {membro.email}
                        <button
                          className="icon"
                          type="button"
                          title="Copiar e-mail"
                          aria-label={`Copiar e-mail de ${membro.name || "membro"}`}
                          onClick={() => {
                            navigator.clipboard.writeText(membro.email || "");
                            toast.success("E-mail copiado!");
                          }}
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`member-role ${membro.admin ? "member-role-admin" : "member-role-observer"}`}
                      >
                        {membro.admin ? "Administrador" : "Observador"}
                      </span>
                    </td>
                    <td>
                      <div className="container-count-badge">
                        <p
                          className="count-badge count-badge-total"
                          title="Total"
                        >
                          {membro.totalRegistros || 0}
                        </p>
                        <p
                          className="count-badge count-badge-review"
                          title="Em Analise"
                        >
                          {membro.emAnalise || 0}
                        </p>
                        <p
                          className="count-badge count-badge-premilinar"
                          title="Preliminar"
                        >
                          {membro.preliminar || 0}
                        </p>
                        <p
                          className="count-badge count-badge-provisional"
                          title="Provisória"
                        >
                          {membro.provisoria || 0}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <div className="modal-backdrop" onMouseDown={handleCloseMember}>
          <div
            className="modal-content member-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleCloseMember}
              aria-label="Fechar configurações do membro"
              title="Fechar"
            >
              <XIcon size={20} />
            </button>

            <h2 id="member-modal-title">
              {selectedMember.name || "Membro sem nome"}
            </h2>
            <p className="member-modal-email">{selectedMember.email}</p>

            <form onSubmit={handleSaveRole} className="login-form">
              <div className="input-group">
                <label htmlFor="member-name">Nome</label>
                <input
                  id="member-name"
                  type="text"
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  className="login-input"
                  autoComplete="name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="input-group">
                <label htmlFor="member-email">E-mail</label>
                <input
                  id="member-email"
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  className="login-input"
                  autoComplete="email"
                  required
                  disabled={saving}
                />
              </div>

              <div className="input-group">
                <label htmlFor="member-role">Nível de Permissão (Função)</label>
                <select
                  id="member-role"
                  value={isAdminRole ? "true" : "false"}
                  onChange={(event) =>
                    setIsAdminRole(event.target.value === "true")
                  }
                  className="login-input"
                  disabled={saving}
                >
                  <option value="false">Observador</option>
                  <option value="true">Administrador</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn login-submit-btn member-save-button"
              >
                {saving ? "Salvando..." : "Atualizar Permissão"}
              </button>
            </form>

            <hr />

            <section className="danger-zone">
              <h3>Zona de Perigo</h3>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={saving}
                className="btn member-delete-button"
              >
                Revogar Acesso
              </button>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
