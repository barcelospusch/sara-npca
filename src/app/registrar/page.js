"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, runTransaction, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { database, auth } from "@/firebase";
import toast, { Toaster } from "react-hot-toast";

export default function RegistrarCandidato() {
  const [set, setSet] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [ps, setPs] = useState("PS1");
  const [observer, setObserver] = useState("");
  const [observerUid, setObserverUid] = useState("");
  const [nextCode, setNextCode] = useState("NPC...."); // Estado para o código em tempo real
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. Monitora o usuário logado e busca o nome salvo no Realtime Database
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setObserverUid(user.uid);
        
        try {
          // Acessa o nó que salvamos na página de login
          const userDbRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userDbRef);
          
          if (snapshot.exists() && snapshot.val().name) {
            setObserver(snapshot.val().name);
          } else {
            // Fallback caso o nó ainda não tenha o campo nome por algum motivo
            setObserver(user.displayName || user.email || "Usuário Autenticado");
          }
        } catch (error) {
          console.error("Erro ao buscar nome do observador no DB:", error);
          setObserver(user.displayName || "Usuário Autenticado");
        }
      } else {
        setObserver("Desconectado");
        setObserverUid("");
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Busca o próximo código disponível no banco de dados assim que a página carrega
  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const counterRef = ref(database, "config/lastCodeNumber");
        const snapshot = await get(counterRef);
        
        let lastNumber = 0;
        if (snapshot.exists()) {
          lastNumber = snapshot.val();
        }
        
        const nextNumber = lastNumber + 1;
        setNextCode(`NPC${String(nextNumber).padStart(4, "0")}`);
      } catch (error) {
        console.error("Erro ao buscar próximo código:", error);
        setNextCode("NPCXXXX");
      }
    };

    fetchNextCode();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Você precisa estar logado para registrar um candidato.");
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading("Gerando código único e registrando...");
    const counterRef = ref(database, "config/lastCodeNumber");

    try {
      const result = await runTransaction(counterRef, (currentValue) => {
        if (currentValue === null) {
          return 1;
        }
        return currentValue + 1;
      });

      if (result.committed) {
        const nextNumber = result.snapshot.val();
        const formattedCode = `NPC${String(nextNumber).padStart(4, "0")}`;
        const currentDate = new Date().toISOString().split("T")[0];

        const novoCandidato = {
          code: formattedCode,
          set: set,
          date: currentDate,
          quadrant: quadrant,
          ps: ps,
          observer: observer,
          observerUid: observerUid,
          status: "Em análise",
        };

        const novoCandidatoRef = ref(database, `candidatos/${formattedCode}`);

        await runTransaction(novoCandidatoRef, (currentData) => {
          if (currentData === null) {
            return novoCandidato;
          }
          return;
        });

        toast.success(`Candidato ${formattedCode} registrado com sucesso!`, {
          id: toastId,
        });
        router.push("/");
      } else {
        throw new Error("A transação não foi concluída.");
      }
    } catch (error) {
      console.error("Erro ao registrar:", error);
      toast.error("Erro ao gerar o código. Tente novamente.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-main">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="login-box">
        <h2>Registrar Candidato</h2>
        
        {/* Banner com o código gerado em tempo real na tela */}
        <div className="code-highlight-banner">
          <strong>{nextCode}</strong>
        </div>

        <form onSubmit={handleRegister} className="login-form">
          <div className="input-group">
            <label>Set</label>
            <input
              type="text"
              value={set}
              onChange={(e) => setSet(e.target.value)}
              required
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
              className="login-input"
            />
          </div>

          <div className="input-group">
            <label>PS</label>
            <select
              value={ps}
              onChange={(e) => setPs(e.target.value)}
              className="login-input"
              style={{ paddingInline: "6px" }}
            >
              <option value="PS1">PS1</option>
              <option value="PS2">PS2</option>
            </select>
          </div>

          <div className="input-group">
            <label>Observador</label>
            <div className="static-observer-field">
              {observer || "Carregando perfil do DB..."}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !observerUid}
            className="btn login-submit-btn"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </main>
  );
}