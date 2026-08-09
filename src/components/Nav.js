"use client";

import { auth, database } from "@/firebase";
import {
  ArrowCounterClockwiseIcon,
  ExportIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  SignInIcon,
  SignOutIcon,
  XIcon,
} from "@phosphor-icons/react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { get, ref, runTransaction } from "firebase/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados para o Modal de Alinhamento de Código
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastCodeNumber, setLastCodeNumber] = useState(0);
  const [tempCodeNumber, setTempCodeNumber] = useState(0);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [aligning, setAligning] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userRef = ref(database, `usuarios/${currentUser.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists() && snapshot.val().admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error(
            "Erro ao verificar permissão de admin na navbar:",
            error,
          );
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  // Buscar os contadores atuais no Firebase
  const fetchCounters = async () => {
    setLoadingCounters(true);
    try {
      const configRef = ref(database, "config");
      const snapshot = await get(configRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setLastCodeNumber(data.lastCodeNumber || 0);
        setTempCodeNumber(data.tempCodeNumber || 0);
      } else {
        setLastCodeNumber(0);
        setTempCodeNumber(0);
      }
    } catch (error) {
      console.error("Erro ao buscar contadores:", error);
      toast.error("Erro ao carregar contadores.");
    } finally {
      setLoadingCounters(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchCounters();
  };

  // Alinhar o contador temporário com o real
  const handleAlign = async () => {
    setAligning(true);
    const toastId = toast.loading("Alinhando contadores...");

    try {
      const tempRef = ref(database, "config/tempCodeNumber");

      await runTransaction(tempRef, () => {
        return lastCodeNumber;
      });

      setTempCodeNumber(lastCodeNumber);
      toast.success("Contadores alinhados com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao alinhar contadores:", error);
      toast.error("Erro ao alinhar contadores.", { id: toastId });
    } finally {
      setAligning(false);
    }
  };

  return (
    <>
      <nav>
        <div>
          <Link href="/">SARA-NPCA</Link>
        </div>
        <div>
          {!loading && (
            <>
              {user ? (
                <>
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin/membros"
                        className="btn secondary withicon"
                      >
                        <ShieldCheckIcon/>
                        <span>Painel</span>
                      </Link>
                      <button
                        className="btn icon secondary"
                        title="Atualizar sequência de códigos"
                        onClick={handleOpenModal}
                      >
                        <ArrowCounterClockwiseIcon />
                      </button>
                    </>
                  )}

                  <Link href="/registrar" className="btn withicon">
                    <PlusCircleIcon/>
                    <span>Registrar</span>
                  </Link>
                  <Link href="/exportar" className="btn icon" title="Exportar relatório">
                    <ExportIcon/>
                  </Link>
                  <span className="divider" />
                  <button onClick={handleLogout} className="icon" title="Sair">
                    <SignOutIcon />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn withicon" title="Entrar">
                    <SignInIcon />
                    <span>Entrar</span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>

      {/* MODAL DE ALINHAMENTO DE CONTADORES */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <button
              className="modal-close-btn"
              onClick={() => setIsModalOpen(false)}
            >
              <XIcon size={20} />
            </button>

            <h2>Sequência de Códigos</h2>

            {loadingCounters ? (
              <p
                style={{
                  marginBlock: "24px",
                  textAlign: "center",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                Carregando dados do servidor...
              </p>
            ) : (
              <>
                <div
                  className="modal-infos"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBlock: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px",
                      border: "2px solid var(--black)"
                    }}
                  >
                    <span>Último registrado:</span>
                    <strong style={{ fontFamily: "'Space Mono', monospace" }}>
                      NPC{String(lastCodeNumber).padStart(4, "0")} ({lastCodeNumber})
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px",
                      border: "2px solid var(--black)"
                    }}
                  >
                    <span>Contador Temporário:</span>
                    <strong style={{ fontFamily: "'Space Mono', monospace" }}>
                      NPC{String(tempCodeNumber).padStart(4, "0")} ({tempCodeNumber})
                    </strong>
                  </div>
                </div>

                <button
                  onClick={handleAlign}
                  disabled={aligning || tempCodeNumber === lastCodeNumber}
                  className="btn login-submit-btn"
                >
                  <ArrowCounterClockwiseIcon size={20} />
                  {aligning ? "Alinhando..." : "Alinhar Contadores"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}