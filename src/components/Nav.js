"use client";

import { auth, database } from "@/firebase";
import {
  ArrowCounterClockwiseIcon,
  BackspaceIcon,
  ChartBarIcon,
  ExportIcon,
  PlusIcon,
  ShieldCheckIcon,
  SignInIcon,
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

  const handleResetCounters = async () => {
    setAligning(true);
    const toastId = toast.loading("Zerando contadores...");

    try {
      const configRef = ref(database, "config");

      await runTransaction(configRef, (config) => ({
        ...(config || {}),
        lastCodeNumber: 0,
        tempCodeNumber: 0,
      }));

      setLastCodeNumber(0);
      setTempCodeNumber(0);
      toast.success("Contadores zerados com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao zerar contadores:", error);
      toast.error("Erro ao zerar contadores.", { id: toastId });
    } finally {
      setAligning(false);
    }
  };

  return (
    <>
      <nav className="site-nav" aria-label="Navegação principal">
        <div className="site-nav-brand">
          <Link href="/" className="site-nav-logo">
            SARA-NPCA
          </Link>
        </div>
        <div className="site-nav-actions">
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
                        <ShieldCheckIcon />
                        <span>Painel</span>
                      </Link>
                      <button
                        type="button"
                        className="btn withicon secondary"
                        title="Atualizar sequência de códigos"
                        aria-label="Atualizar sequência de códigos"
                        onClick={handleOpenModal}
                      >
                        <ArrowCounterClockwiseIcon />
                        <span>Align</span>
                      </button>
                      <Link
                        href="/estatisticas"
                        className="btn withicon secondary"
                        title="Estatísticas"
                        aria-label="Estatísticas"
                      >
                        <ChartBarIcon size={20} />
                        <span>Estatísticas</span>
                      </Link>
                      <span className="divider" />
                    </>
                  )}

                  <Link href="/registrar" className="btn withicon ">
                    <PlusIcon />
                    <span>Registrar</span>
                  </Link>
                  <Link
                    href="/exportar"
                    className="btn withicon secondary"
                    title="Exportar relatório"
                    aria-label="Exportar relatório"
                  >
                    <ExportIcon />
                    <span>Exportar</span>
                  </Link>
                  <span className="divider" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="secondary"
                    title="Sair"
                    aria-label="Sair"
                  >
                    <span>Sair</span>
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
        <div
          className="modal-backdrop"
          onMouseDown={() => setIsModalOpen(false)}
        >
          <div
            className="modal-content counter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="counter-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsModalOpen(false)}
              title="Fechar"
              aria-label="Fechar sequência de códigos"
            >
              <XIcon size={20} />
            </button>

            <h2 id="counter-modal-title">Sequência de Códigos</h2>

            {loadingCounters ? (
              <p className="counter-loading">Carregando dados do servidor...</p>
            ) : (
              <>
                <div className="modal-infos counter-infos">
                  <div className="counter-info">
                    <span>Último registrado:</span>
                    <strong>
                      NPC{String(lastCodeNumber).padStart(4, "0")} (
                      {lastCodeNumber})
                    </strong>
                  </div>

                  <div className="counter-info">
                    <span>Contador Temporário:</span>
                    <strong>
                      NPC{String(tempCodeNumber).padStart(4, "0")} (
                      {tempCodeNumber})
                    </strong>
                  </div>
                </div>

                <div className="counter-actions">
                  <button
                    type="button"
                    className="btn login-submit-btn icon"
                    onClick={handleResetCounters}
                    disabled={aligning}
                    title="Zerar contadores"
                    aria-label="Zerar contadores"
                  >
                    <BackspaceIcon size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={handleAlign}
                    disabled={aligning || tempCodeNumber === lastCodeNumber}
                    className="btn login-submit-btn"
                  >
                    <ArrowCounterClockwiseIcon size={20} />
                    {aligning ? "Alinhando..." : "Alinhar Contadores"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
