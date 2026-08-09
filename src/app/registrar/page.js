"use client";

import { auth, database } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref, runTransaction, set as setDb } from "firebase/database";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function RegistrarCandidato() {
  const [set, setSet] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [ps, setPs] = useState("PS1");
  const [mpcReport, setMpcReport] = useState("");
  const [observer, setObserver] = useState("");
  const [observerUid, setObserverUid] = useState("");
  const [nextCode, setNextCode] = useState("NPC....");
  const [assignedNumber, setAssignedNumber] = useState(null);
  const [loading, setLoading] = useState(false);

  // Ref de controle para evitar a execução duplicada do React Strict Mode
  const hasReservedRef = useRef(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setObserverUid(user.uid);

        try {
          const userDbRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userDbRef);

          if (snapshot.exists() && snapshot.val().name) {
            setObserver(snapshot.val().name);
          } else {
            setObserver(
              user.displayName || user.email || "Usuário Autenticado",
            );
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

  // Lógica do Código Temporário Concorrente com Trava
  useEffect(() => {
    // Se já tiver feito a reserva nesta montagem, ignora a segunda chamada do Strict Mode
    if (hasReservedRef.current) return;
    hasReservedRef.current = true;

    const reserveTempCode = async () => {
      try {
        const configRef = ref(database, "config");

        const result = await runTransaction(configRef, (currentConfig) => {
          if (!currentConfig) {
            return { lastCodeNumber: 0, tempCodeNumber: 1 };
          }

          const lastNumber = currentConfig.lastCodeNumber || 0;
          let tempNumber = currentConfig.tempCodeNumber || 0;

          if (tempNumber <= lastNumber) {
            tempNumber = lastNumber + 1;
          } else {
            tempNumber += 1;
          }

          return {
            ...currentConfig,
            tempCodeNumber: tempNumber,
          };
        });

        if (result.committed) {
          const reserved = result.snapshot.val().tempCodeNumber;
          setAssignedNumber(reserved);
          setNextCode(`NPC${String(reserved).padStart(4, "0")}`);
        }
      } catch (error) {
        console.error("Erro ao reservar código temporário:", error);
        setNextCode("NPCXXXX");
      }
    };

    reserveTempCode();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Você precisa estar logado para registrar um candidato.");
      return;
    }

    if (!assignedNumber) {
      toast.error("Aguarde a atribuição do código temporário.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Registrando candidato...");

    try {
      const formattedCode = `NPC${String(assignedNumber).padStart(4, "0")}`;
      const currentDate = new Date().toISOString().split("T")[0];

      const novoCandidato = {
        code: formattedCode,
        set: set,
        date: currentDate,
        quadrant: quadrant,
        ps: ps,
        mpcReport: mpcReport,
        observer: observer,
        observerUid: observerUid,
        status: "Em análise",
      };

      const novoCandidatoRef = ref(database, `candidatos/${formattedCode}`);
      await setDb(novoCandidatoRef, novoCandidato);

      const lastCodeRef = ref(database, "config/lastCodeNumber");
      await runTransaction(lastCodeRef, (currentLast) => {
        const current = currentLast || 0;
        return assignedNumber > current ? assignedNumber : current;
      });

      toast.success(`Candidato ${formattedCode} registrado com sucesso!`, {
        id: toastId,
      });
      router.push("/");
    } catch (error) {
      console.error("Erro ao registrar:", error);
      toast.error("Erro ao registrar o candidato. Tente novamente.", {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center-container">
      <div className="login-box">
        <h2>Registrar Candidato</h2>

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
                />
                PS2
              </label>
            </div>
          </div>

          <div className="input-group">
            <label>MPC Report</label>
            <textarea
              value={mpcReport}
              onChange={(e) => setMpcReport(e.target.value)}
              className="login-input"
              rows={5}
              placeholder="Cole aqui o MPC Report, mesmo que haja mais de um candidato."
            />
          </div>

          <div className="input-group">
            <label>Observador</label>
            <div className="static-observer-field">
              {observer || "Carregando perfil do DB..."}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !observerUid || !assignedNumber}
            className="btn login-submit-btn"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
