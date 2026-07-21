"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { auth, database } from "@/firebase";
import toast from "react-hot-toast";

export default function EditarCandidato({ params }) {
  // Desembrulha o código dinâmico da URL (ex: NPC0001)
  const { codigo } = use(params);

  const [set, setSet] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [ps, setPs] = useState("PS1");
  const [status, setStatus] = useState("Em análise"); // Estado para gerenciar o status do candidato
  const [candidatoData, setCandidatoData] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

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
        status: status // Inclui o status atualizado no payload enviado ao banco
      };

      await update(candidatoRef, updates);

      toast.success(`Candidato ${codigo} atualizado com sucesso!`, { id: toastId });
      router.push("/");
    } catch (error) {
      console.error("Erro ao atualizar o candidato:", error);
      toast.error("Falha ao salvar as alterações.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuth || loadingData) {
    return (
      <main className="center-container" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p className="login-text" style={{ fontFamily: "'Space Mono', monospace" }}>
          Buscando registro do candidato...
        </p>
      </main>
    );
  }

  return (
    <main>
      <header style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p>{codigo}</p>
        </div>
        <div style={{backgroundColor: "transparent"}}>
          <Link href="/" className="btn secondary" style={{ fontSize: "14px", textDecoration: "none" }}>
            Voltar ao Painel
          </Link>
        </div>
      </header>

      <div className="container" style={{ marginTop: "24px" }}>
        <div className="login-box" style={{ maxWidth: "600px", margin: "0 auto", padding: "30px" }}>
          
          {/* Informações de metadados não editáveis (Contexto para o Admin) */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #333", paddingBottom: "16px", display: "flex", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "12px", color: "var(--dark-gray)", display: "block" }}>Observador</span>
              <strong>{candidatoData?.observer}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "var(--dark-gray)", display: "block" }}>Data de Registro</span>
              <span>{candidatoData?.date}</span>
            </div>
          </div>

          {/* Formulário de Edição */}
          <form onSubmit={handleUpdateCandidato} className="login-form">
            <div className="input-group">
              <label>Set</label>
              <input
                type="text"
                value={set}
                onChange={(e) => setSet(e.target.value)}
                required
                disabled={saving}
                className="login-input"
                placeholder="Ex: XY49 p00"
              />
            </div>

            <div className="input-group">
              <label>Quadrante</label>
              <input
                type="text"
                value={quadrant}
                onChange={(e) => setQuadrant(e.target.value)}
                required
                disabled={saving}
                className="login-input"
              />
            </div>

            <div className="input-group">
              <label>PS</label>
              <select
                value={ps}
                onChange={(e) => setPs(e.target.value)}
                disabled={saving}
                className="login-input"
                style={{ paddingInline: "8px" }}
              >
                <option value="PS1">PS1</option>
                <option value="PS2">PS2</option>
              </select>
            </div>

            {/* Novo input dropdown para gerenciar o Status do objeto */}
            <div className="input-group">
              <label>Status da Análise</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={saving}
                className="login-input"
                style={{ paddingInline: "8px" }}
              >
                <option value="Em análise">Em análise</option>
                <option value="Preliminar">Preliminar</option>
                <option value="Provisório">Provisório</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn login-submit-btn"
              style={{ marginTop: "16px" }}
            >
              {saving ? "Salvando Alterações..." : "Salvar Modificações"}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}