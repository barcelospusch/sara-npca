"use client";

import { auth, database } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, push, ref, runTransaction, set as setDb } from "firebase/database";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function RegistrarCandidato() {
  const [set, setSet] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [mpcWithoutMovingObject, setMpcWithoutMovingObject] = useState(null);
  const [ps, setPs] = useState("PS1");
  const [mpcReport, setMpcReport] = useState("");
  const [observer, setObserver] = useState("");
  const [observerUid, setObserverUid] = useState("");
  const [nextCode, setNextCode] = useState("NPC....");
  const [assignedNumber, setAssignedNumber] = useState(null);
  const [assignedXyzNumber, setAssignedXyzNumber] = useState(null);
  const [loading, setLoading] = useState(false);

  // Ref de controle para evitar a execução duplicada do React Strict Mode
  const hasReservedRef = useRef(false);
  const hasReservedXyzRef = useRef(false);

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

  // Reservas concorrentes dos códigos, iniciadas após a escolha do tipo MPC.
  useEffect(() => {
    if (mpcWithoutMovingObject !== false || hasReservedRef.current) return;
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
  }, [mpcWithoutMovingObject]);

  useEffect(() => {
    if (mpcWithoutMovingObject !== true || hasReservedXyzRef.current) return;
    hasReservedXyzRef.current = true;

    const reserveXyzCode = async () => {
      try {
        const configRef = ref(database, "config");
        const result = await runTransaction(configRef, (currentConfig) => {
          const config = currentConfig || {};
          const lastNumber = config.lastXyzCodeNumber || 0;
          let tempNumber = config.tempXyzCodeNumber || 0;

          if (tempNumber <= lastNumber) {
            tempNumber = lastNumber + 1;
          } else {
            tempNumber += 1;
          }

          return {
            ...config,
            tempXyzCodeNumber: tempNumber,
          };
        });

        if (result.committed) {
          setAssignedXyzNumber(result.snapshot.val().tempXyzCodeNumber);
        }
      } catch (error) {
        hasReservedXyzRef.current = false;
        console.error("Erro ao reservar código XYZ:", error);
      }
    };

    reserveXyzCode();
  }, [mpcWithoutMovingObject]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Você precisa estar logado para registrar um candidato.");
      return;
    }

    if (mpcWithoutMovingObject === null) {
      toast.error("Selecione se há objetos em movimento no MPC Report.");
      return;
    }

    const codeNumber = mpcWithoutMovingObject
      ? assignedXyzNumber
      : assignedNumber;

    if (!codeNumber) {
      toast.error("Aguarde a atribuição do código temporário.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Registrando candidato...");

    try {
      const codePrefix = mpcWithoutMovingObject ? "XYZ" : "NPC";
      const formattedCode = `${codePrefix}${String(codeNumber).padStart(4, "0")}`;
      const currentDate = new Date().toISOString().split("T")[0];

      const novoCandidato = {
        code: formattedCode,
        set: set,
        date: currentDate,
        quadrant: mpcWithoutMovingObject ? 0 : quadrant,
        ps: ps,
        mpcReport: mpcReport,
        observerUid: observerUid,
        status: "Em análise",
      };

      const novoCandidatoRef = mpcWithoutMovingObject
        ? push(ref(database, "candidatos"))
        : ref(database, `candidatos/${formattedCode}`);
      await setDb(novoCandidatoRef, novoCandidato);

      const lastCodeRef = ref(
        database,
        mpcWithoutMovingObject
          ? "config/lastXyzCodeNumber"
          : "config/lastCodeNumber",
      );
      await runTransaction(lastCodeRef, (currentLast) =>
        codeNumber > (currentLast || 0) ? codeNumber : currentLast,
      );

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
    <main className="center-container registrar-page">
      <div className="login-box registrar-card">
        <h2>Registrar Candidato</h2>

        <div className="code-highlight-banner registrar-code" aria-live="polite">
          <strong>
            {mpcWithoutMovingObject === null
              ? "Selecione o tipo de MPC"
              : mpcWithoutMovingObject
                ? `XYZ${String(assignedXyzNumber || "....").padStart(4, "0")}`
                : nextCode}
          </strong>
        </div>

        <form onSubmit={handleRegister} className="login-form registrar-form">
          <div className="input-group">
            <span className="label">MPC Report</span>
            <div className="input-ratio">
              <label
                htmlFor="mpc-without-moving-object"
                className={`ratio-label ${mpcWithoutMovingObject ? "selected" : ""}`}
              >
                <input
                  id="mpc-without-moving-object"
                  type="radio"
                  name="mpc-object-status"
                  value="empty"
                  checked={mpcWithoutMovingObject === true}
                  required
                  onChange={() => {
                    setMpcWithoutMovingObject(true);
                    setQuadrant("0");
                  }}
                />
                MPC vazio
              </label>
              <label
                htmlFor="mpc-with-moving-object"
                  className={`ratio-label ${mpcWithoutMovingObject === false ? "selected" : ""}`}
              >
                <input
                  id="mpc-with-moving-object"
                  type="radio"
                  name="mpc-object-status"
                  value="moving"
                  checked={mpcWithoutMovingObject === false}
                  onChange={() => {
                    setMpcWithoutMovingObject(false);
                    setQuadrant("");
                  }}
                />
                Com objeto em movimento
              </label>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="set">Set</label>
            <input
              id="set"
              type="text"
              value={set}
              onChange={(e) => setSet(e.target.value)}
              required
              className="login-input"
              placeholder="Ex: 49-00"
            />
          </div>

          <div className="input-group">
            <label htmlFor="quadrant">Quadrante</label>
            <input
              id="quadrant"
              type="text"
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value)}
              required={!mpcWithoutMovingObject}
              disabled={mpcWithoutMovingObject}
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
            <label htmlFor="mpc-report">MPC Report</label>
            <textarea
              id="mpc-report"
              value={mpcReport}
              onChange={(e) => setMpcReport(e.target.value)}
              className="login-input"
              rows={5}
              placeholder="Cole aqui o MPC Report, mesmo que haja mais de um candidato."
            />
          </div>

          <div className="input-group">
            <span className="label">Observador</span>
            <div className="static-observer-field registrar-observer" aria-live="polite">
              {observer || "Carregando perfil do DB..."}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !observerUid ||
              mpcWithoutMovingObject === null ||
              (mpcWithoutMovingObject ? !assignedXyzNumber : !assignedNumber)
            }
            className="btn login-submit-btn registrar-submit"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
