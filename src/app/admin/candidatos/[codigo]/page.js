"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, update, remove } from "firebase/database";
import { auth, database } from "@/firebase";
import toast from "react-hot-toast";
import { ArrowLeftIcon, TrashIcon } from "@phosphor-icons/react";

export default function EditarCandidato({ params }) {
  // Desembrulha o código dinâmico da URL (ex: NPC0001)
  const { codigo } = use(params);

  const [set, setSet] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [ps, setPs] = useState("PS1");
  const [status, setStatus] = useState("Em análise"); // Estado para gerenciar o status do candidato
  const [candidatoData, setCandidatoData] = useState(null);
  const [mpcReport, setMpcReport] = useState(""); // Estado para armazenar o MPC Report

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  // 1. Validação de Segurança: Garante que o usuário logado é um administrador
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

  // 2. Busca as informações atuais do candidato a asteroide pelo código
  useEffect(() => {
    if (loadingAuth) return;

    const fetchCandidatoData = async () => {
      try {
        const candidatoRef = ref(database, `candidatos/${codigo}`);
        const snapshot = await get(candidatoRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setCandidatoData(data);

          // Preenche os estados iniciais dos inputs com o que já está no banco
          setSet(data.set || "");
          setQuadrant(data.quadrant || "");
          setPs(data.ps || "PS1");
          setStatus(data.status || "Em análise"); // Sincroniza o status vindo do banco
          setMpcReport(data.mpcReport || "MPC Report não submetido"); // Sincroniza o MPC Report vindo do banco
        } else {
          toast.error("Candidato não encontrado no banco de dados.");
          router.push("/");
        }
      } catch (error) {
        console.error("Erro ao buscar dados do candidato:", error);
        toast.error("Erro ao carregar dados do candidato.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchCandidatoData();
  }, [loadingAuth, codigo, router]);

  // 3. Atualiza os dados modificados no Realtime Database
  const handleUpdateCandidato = async (e) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Atualizando informações do candidato...");

    try {
      const candidatoRef = ref(database, `candidatos/${codigo}`);

      // Atualiza as propriedades com os novos valores definidos nos inputs
      const updates = {
        set: set,
        quadrant: quadrant,
        ps: ps,
        status: status, // Inclui o status atualizado no payload enviado ao banco
        mpcReport: mpcReport, // Inclui o MPC Report atualizado no payload enviado ao banco
      };

      await update(candidatoRef, updates);

      toast.success(`Candidato ${codigo} atualizado com sucesso!`, {
        id: toastId,
      });
      router.push("/");
    } catch (error) {
      console.error("Erro ao atualizar o candidato:", error);
      toast.error("Falha ao salvar as alterações.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // 4. Remove o registro do candidato do banco de dados
  const handleDeleteCandidato = async () => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir permanentemente o candidato ${codigo}?`,
    );

    if (!confirmDelete) return;

    setDeleting(true);
    const toastId = toast.loading("Removendo candidato...");

    try {
      const candidatoRef = ref(database, `candidatos/${codigo}`);
      await remove(candidatoRef);

      toast.success(`Candidato ${codigo} excluído com sucesso!`, {
        id: toastId,
      });
      router.push("/");
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      toast.error("Erro ao tentar remover o candidato.", { id: toastId });
      setDeleting(false);
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
        <p
          className="login-text"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Buscando registro do candidato...
        </p>
      </main>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusOptionStyle = (value) => {
    const selected = status === value;

    return {
      backgroundColor: selected ? "rgba(255, 255, 255, 0.16)" : "transparent",
      border: selected
        ? "1px solid rgba(255, 255, 255, 0.6)"
        : "1px solid transparent",
      color: selected ? "#ffffff" : "var(--text-color, #fff)",
      boxShadow: selected ? "0 0 0 2px rgba(255, 255, 255, 0.15)" : "none",
      transition: "all 0.2s ease",
    };
  };

  return (
    <main>
      <header style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div></div>
        <div style={{ backgroundColor: "transparent" }}>
          <Link
            href="/"
            className="btn secondary"
            style={{ fontSize: "14px", textDecoration: "none" }}
          >
            <ArrowLeftIcon />
            Voltar ao Dashboard
          </Link>
        </div>
      </header>

      <div className="container" style={{ marginTop: "24px" }}>
        <div
          className="login-box"
          style={{ maxWidth: "600px", margin: "0 auto", padding: "30px" }}
        >
          <div className="code-highlight-banner">
            <strong>{codigo}</strong>
          </div>
          {/* Informações de metadados não editáveis (Contexto para o Admin) */}
          <div
            style={{
              marginBottom: "24px",
              borderBottom: "1px solid #333",
              paddingBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--dark-gray)",
                  display: "block",
                }}
              >
                Observador
              </span>
              <strong>
                <a href={`/admin/membros/${candidatoData?.observerUid}`}>
                  {candidatoData?.observer}
                </a>
              </strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--dark-gray)",
                  display: "block",
                }}
              >
                Data de Registro
              </span>
              <span>{formatDate(candidatoData?.date)}</span>
            </div>
          </div>

          {/* Formulário de Edição */}
          <form onSubmit={handleUpdateCandidato} className="login-form">
            <div className="input-group">
              <label htmlFor="set">Set</label>
              <input
                id="set"
                name="set"
                type="text"
                value={set}
                onChange={(e) => setSet(e.target.value)}
                required
                disabled={saving || deleting}
                className="login-input"
                placeholder="Ex: XY49 p00"
              />
            </div>

            <div className="input-group">
              <label htmlFor="quadrant">Quadrante</label>
              <input
                id="quadrant"
                name="quadrant"
                type="text"
                value={quadrant}
                onChange={(e) => setQuadrant(e.target.value)}
                required
                disabled={saving || deleting}
                className="login-input"
              />
            </div>

            <div className="input-group">
              <span className="label">PS</span>
              <div className="input-ratio">
                <label
                  htmlFor="ps1"
                  className={`ratio-label ${ps === "PS1" ? "selected" : ""}`}
                >
                  <input
                    id="ps1"
                    type="radio"
                    name="ps"
                    value="PS1"
                    checked={ps === "PS1"}
                    onChange={(e) => setPs(e.target.value)}
                    disabled={saving || deleting}
                  />
                  PS1
                </label>
                <label
                  htmlFor="ps2"
                  className={`ratio-label ${ps === "PS2" ? "selected" : ""}`}
                >
                  <input
                    id="ps2"
                    type="radio"
                    name="ps"
                    value="PS2"
                    checked={ps === "PS2"}
                    onChange={(e) => setPs(e.target.value)}
                    disabled={saving || deleting}
                  />
                  PS2
                </label>
              </div>
            </div>

            <div className="input-group">
              <span className="label">Status da Análise</span>
              <div className="input-ratio">
                <label
                  className={`ratio-label ${status === "Em análise" ? "selected review" : ""}`}
                  htmlFor="status-review"
                >
                  <input
                    id="status-review"
                    type="radio"
                    name="status"
                    value="Em análise"
                    checked={status === "Em análise"}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving || deleting}
                  />
                  Em análise
                </label>
                <label
                  className={`ratio-label ${status === "Preliminar" ? "selected preliminar" : ""}`}
                  htmlFor="status-preliminar"
                >
                  <input
                    id="status-preliminar"
                    type="radio"
                    name="status"
                    value="Preliminar"
                    checked={status === "Preliminar"}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving || deleting}
                  />
                  Preliminar
                </label>
                <label
                  className={`ratio-label ${status === "Provisório" ? "selected provisional" : ""}`}
                  htmlFor="status-provisional"
                >
                  <input
                    id="status-provisional"
                    type="radio"
                    name="status"
                    value="Provisório"
                    checked={status === "Provisório"}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving || deleting}
                  />
                  Provisório
                </label>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="mpcReport">MPC Report</label>
              <textarea
                id="mpcReport"
                readOnly
                value={mpcReport || "Nenhum relatório cadastrado."}
                rows={10}
                className="login-input"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  resize: "vertical",
                  width: "100%",
                  minHeight: "200px",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleDeleteCandidato}
                disabled={saving || deleting}
                className="btn icon login-submit-btn"
                style={{ flex: 0.2 }}
              >
                <TrashIcon />
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(mpcReport)
                    .then(() => {
                      toast.success(
                        "MPC Report copiado para a área de transferência!",
                      );
                    })
                    .catch((err) => {
                      console.error(
                        "Erro ao copiar para a área de transferência:",
                        err,
                      );
                      toast.error("Falha ao copiar o MPC Report.");
                    });
                }}
                disabled={saving || deleting}
                className="btn login-submit-btn"
                style={{ flex: 0.4 }}
              >
                Copiar MPC Report
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="btn login-submit-btn"
                style={{ flex: 0.4 }}
              >
                {saving ? "Salvando Alterações..." : "Salvar Modificações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
