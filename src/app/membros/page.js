"use client";

import { auth } from "@/firebase";
import {
  createObserverAccount,
  deleteMemberProfile,
  getMemberProfile,
  subscribeToMembers,
  updateMemberProfile,
} from "@/lib/firebase/members";
import {
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  UserPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ListaMembros() {
  const [membros, setMembros] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [dataLoadError, setDataLoadError] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isMemberActive, setIsMemberActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);
  const [creatingMember, setCreatingMember] = useState(false);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getMemberProfile(user.uid);

          if (!profile || profile.admin !== true) {
            toast.error(
              "Acesso negado. Você não possui permissão de administrador.",
            );
            router.push("/");
          } else {
            setLoadingAuth(false);
          }
        } catch (error) {
          console.error("Erro ao validar admin:", error);
          toast.error(
            "Não foi possível validar o administrador no Realtime Database. Confira a URL do banco e as permissões de acesso.",
          );
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

    let requestedUid = new URLSearchParams(window.location.search).get("uid");

    const unsubscribe = subscribeToMembers(
      (listaMembrosFormatada) => {
        setMembros(listaMembrosFormatada);

        if (requestedUid) {
          const requestedMember = listaMembrosFormatada.find(
            (membro) => membro.uid === requestedUid,
          );

          if (requestedMember) {
            setSelectedMember(requestedMember);
            setMemberName(requestedMember.name || "");
            setMemberEmail(requestedMember.email || "");
            setIsAdminRole(Boolean(requestedMember.admin));
            setIsMemberActive(requestedMember.active !== false);
            requestedUid = null;
            window.history.replaceState({}, "", window.location.pathname);
          }
        }
        setLoadingData(false);
      },
      (path, error) => {
        console.error(`Erro ao ler dados de ${path}:`, error);
        setDataLoadError(
          `Não foi possível carregar os dados de ${path}. Confira a URL do Realtime Database e as permissões de acesso.`,
        );
        setLoadingData(false);
      },
    );

    return unsubscribe;
  }, [loadingAuth]);

  const handleOpenMember = (membro) => {
    setSelectedMember(membro);
    setMemberName(membro.name || "");
    setMemberEmail(membro.email || "");
    setIsAdminRole(Boolean(membro.admin));
    setIsMemberActive(membro.active !== false);
  };

  const handleCloseMember = () => {
    if (saving) return;
    setSelectedMember(null);
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    setCreatingMember(true);
    const toastId = toast.loading("Criando conta de observador...");

    try {
      const { firestoreSyncFailed } = await createObserverAccount({
        name: newMemberName,
        email: newMemberEmail,
        password: newMemberPassword,
      });

      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("");
      setShowNewMemberPassword(false);
      setShowCreateMember(false);
      toast.success(
        firestoreSyncFailed
          ? "Conta criada. Crie o Firestore padrão para sincronizar também nesse banco."
          : "Conta de observador criada com sucesso.",
        { id: toastId, duration: 6000 },
      );
    } catch (error) {
      console.error("Erro ao criar conta de observador:", error);
      const errorMessages = {
        "auth/email-already-in-use": "Já existe uma conta com este e-mail.",
        "auth/invalid-email": "O e-mail informado é inválido.",
        "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
        "auth/operation-not-allowed":
          "O login por e-mail e senha está desativado no Firebase.",
        "permission-denied":
          "O Firebase não permitiu salvar o perfil do observador.",
      };
      toast.error(
        errorMessages[error.code] ||
          error.message ||
          "Não foi possível criar a conta.",
        { id: toastId },
      );
    } finally {
      setCreatingMember(false);
    }
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
        active: isMemberActive,
      };

      await updateMemberProfile(selectedMember.uid, updatedMember);

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
      `Confirme a exclusão de ${selectedMember.name || "este usuário"}.`,
    );

    if (!confirmed) return;

    setSaving(true);
    const toastId = toast.loading("Excluindo membro...");

    try {
      await deleteMemberProfile(selectedMember.uid);

      setMembros((currentMembers) =>
        currentMembers.filter((member) => member.uid !== selectedMember.uid),
      );
      setSelectedMember(null);
      toast.success("Membro removido com sucesso!", {
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

  if (dataLoadError) {
    return (
      <main className="center-container members-loading">
        <p className="login-text members-loading-text">{dataLoadError}</p>
      </main>
    );
  }

  return (
    <main className="members-page">
      <div className="container members-container">
        <div className="members-toolbar">
          <p className="members-count">
            <b>Membros cadastrados:</b> {membros.length}
          </p>
          <button
            type="button"
            className="btn withicon member-create-trigger"
            onClick={() => setShowCreateMember(true)}
          >
            <UserPlusIcon size={20}/>
            Cadastrar Observador
          </button>
        </div>
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
                  <td colSpan={4} className="members-empty">
                    Nenhum membro encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                membros.map((membro) => (
                  <tr key={membro.uid}>
                    <td>
                      <div className="withbtn-field">
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
                        <button
                          type="button"
                          className="member-name-button"
                          onClick={() => handleOpenMember(membro)}
                        >
                          {membro.name || "Sem nome cadastrado"}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="withbtn-field">
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
                        {membro.email}
                      </div>
                    </td>
                    <td>
                      <div className="container-count-badge">
                        <span
                          className={`member-role ${membro.admin ? "member-role-admin" : "member-role-observer"}`}
                        >
                          {membro.admin ? "Administrador" : "Observador"}
                        </span>
                        <span
                          className={`member-role ${membro.active === false ? "member-status-inactive" : "member-status-active"}`}
                        >
                          {membro.active === false ? "Inativo" : "Ativo"}
                        </span>
                      </div>
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

      {showCreateMember && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !creatingMember && setShowCreateMember(false)}
        >
          <div
            className="modal-content member-modal member-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-member-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowCreateMember(false)}
              aria-label="Fechar cadastro de observador"
              title="Fechar"
              disabled={creatingMember}
            >
              <XIcon size={20} />
            </button>
            <h2 id="create-member-title">Cadastrar Observador</h2>
            <form onSubmit={handleCreateMember} className="login-form">
              <div className="input-group">
                <label htmlFor="new-member-name">Nome</label>
                <input
                  placeholder="Nome Sobrenome"
                  id="new-member-name"
                  type="text"
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                  className="login-input"
                  autoComplete="name"
                  required
                  disabled={creatingMember}
                />
              </div>
              <div className="input-group">
                <label htmlFor="new-member-email">E-mail</label>
                <input
                  placeholder="nome.sobrenome@email.com"
                  id="new-member-email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(event) => setNewMemberEmail(event.target.value)}
                  className="login-input"
                  autoComplete="email"
                  required
                  disabled={creatingMember}
                />
              </div>
              <div className="input-group">
                <label htmlFor="new-member-password">Senha</label>
                <div className="password-input-row">
                  <input
                    placeholder="@senha123#"
                    id="new-member-password"
                    type={showNewMemberPassword ? "text" : "password"}
                    value={newMemberPassword}
                    onChange={(event) =>
                      setNewMemberPassword(event.target.value)
                    }
                    className="login-input"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={creatingMember}
                  />
                  <button
                    type="button"
                    className="icon secondary password-toggle-button"
                    onClick={() =>
                      setShowNewMemberPassword((isVisible) => !isVisible)
                    }
                    aria-label={
                      showNewMemberPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    aria-pressed={showNewMemberPassword}
                    title={showNewMemberPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={creatingMember}
                  >
                    {showNewMemberPassword ? (
                      <EyeSlashIcon size={20} />
                    ) : (
                      <EyeIcon size={20} />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingMember}
                className="btn login-submit-btn member-save-button"
              >
                {creatingMember ? "Cadastrando..." : "Cadastrar observador"}
              </button>
            </form>
          </div>
        </div>
      )}

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
              Editar Membro
            </h2>

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
                <span className="label">Função</span>
                <div className="input-ratio">
                  {[
                    [false, "Observador"],
                    [true, "Administrador"],
                  ].map(([value, label]) => (
                    <label
                      key={label}
                      className={`ratio-label ${isAdminRole === value ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="member-role"
                        checked={isAdminRole === value}
                        onChange={() => setIsAdminRole(value)}
                        disabled={saving}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <span className="label">Status do membro</span>
                <div className="input-ratio">
                  {[
                    [true, "Ativo"],
                    [false, "Inativo"],
                  ].map(([value, label]) => (
                    <label
                      key={label}
                      className={`ratio-label ${isMemberActive === value ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="member-active"
                        checked={isMemberActive === value}
                        onChange={() => setIsMemberActive(value)}
                        disabled={saving}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn login-submit-btn member-save-button"
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
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
                Excluir membro
              </button>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
