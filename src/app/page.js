"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get } from "firebase/database";
import { auth, database } from "@/firebase";
import toast from "react-hot-toast";
import {
  ApertureIcon,
  CalendarIcon,
  CopyIcon,
  FileTextIcon,
  GearSixIcon,
  GridFourIcon,
  IdentificationBadgeIcon,
  PackageIcon,
  SealIcon,
  TagSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMpcItem, setSelectedMpcItem] = useState(null);

  const LIST = [];
  const displayList = list.length > 0 ? list : LIST;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists() && snapshot.val().admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Erro ao verificar permissões de admin:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const candidatosRef = ref(database, "candidatos");

    const unsubscribeData = onValue(
      candidatosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const listaFormatada = Object.keys(data).map((key) => ({
            ...data[key],
          }));

          listaFormatada.sort((a, b) => b.code.localeCompare(a.code));
          setList(listaFormatada);
        } else {
          setList([]);
        }
        setLoadingData(false);
      },
      (error) => {
        console.error("Erro ao buscar candidatos:", error);
        setLoadingData(false);
      },
    );

    return () => unsubscribeData();
  }, []);

  const totalCandidatos = displayList.length;
  const emAnalise = displayList.filter(
    (item) => item.status === "Em análise",
  ).length;
  const preliminares = displayList.filter(
    (item) => item.status === "Preliminar",
  ).length;
  const provisorios = displayList.filter(
    (item) => item.status === "Provisório",
  ).length;

  const getStatusClass = (status) => {
    if (!status) return "em-analise";
    return status
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
  };

  const handleCopyMpcReport = () => {
    if (selectedMpcItem?.mpcReport) {
      navigator.clipboard.writeText(selectedMpcItem.mpcReport);
      toast.success("MPC Report copiado para a área de transferência!");
    } else {
      toast.error("Não há relatório para copiar.");
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
          minHeight: "100vh",
        }}
      >
        <p
          className="login-text"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Sincronizando dados com o servidor...
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

  return (
    <main>
      <header>
        <div className="box box-total">
          <b>{totalCandidatos}</b>
          <small>Total de candidatos</small>
        </div>
        <div className="box box-review">
          <b>{emAnalise}</b>
          <small>Em análise</small>
        </div>
        <div className="box box-preliminar">
          <b>{preliminares}</b>
          <small>Preliminares</small>
        </div>
        <div className="box box-provisional">
          <b>{provisorios}</b>
          <small>Provisórios</small>
        </div>
      </header>

      <div className="container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <div className="icon-label" title="Código">
                    <span>Código</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="Set">
                    <span>Set</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="Data">
                    <span>Data</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="Quadrante">
                    <span>Quadrante</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="PS">
                    <span>PS</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="Observador">
                    <span>Observador</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="Status">
                    <span>Status</span>
                  </div>
                </th>
                <th>
                  <div className="icon-label" title="MPC Report">
                    <span>MPC</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      paddingBlock: "30px",
                      color: "var(--dark-gray)",
                    }}
                  >
                    Nenhum candidato a asteroide registrado até o momento.
                  </td>
                </tr>
              ) : (
                displayList.map((item, index) => (
                  <tr key={item.code || index}>
                    <td>
                      <div className="withbtn-field">
                        {isAdmin ? (
                          <Link href={`/admin/candidatos/${item.code}`}>
                            {item.code}
                          </Link>
                        ) : (
                          <>{item.code}</>
                        )}
                      </div>
                    </td>
                    <td>{item.set}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.quadrant}</td>
                    <td>{item.ps}</td>
                    <td>
                      {isAdmin ? (
                        <Link href={`/admin/membros/${item.observerUid}`}>
                          {item.observer}
                        </Link>
                      ) : (
                        item.observer
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-text status-${getStatusClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                      <span
                        className={`status-badge status-${getStatusClass(item.status)}`}
                        title={item.status}
                      ></span>
                    </td>
                    <td>
                      {item.mpcReport ? (
                        <button
                          className="btn icon"
                          onClick={() => setSelectedMpcItem(item)}
                          title="Ver MPC Report"
                        >
                          <FileTextIcon size={20} />
                        </button>
                      ) : (
                        <span style={{ color: "var(--dark-gray)" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DO MPC REPORT */}
      {selectedMpcItem && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <button
              className="modal-close-btn"
              onClick={() => setSelectedMpcItem(null)}
            >
              <XIcon size={20} />
            </button>

            <h2 className="modal-code">{selectedMpcItem.code} - MPC Report</h2>

            <div className="modal-infos" style={{ marginTop: "16px" }}>
              <textarea
                readOnly
                value={
                  selectedMpcItem.mpcReport || "Nenhum relatório cadastrado."
                }
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

            <button
              className="btn login-submit-btn"
              onClick={handleCopyMpcReport}
            >
              <CopyIcon size={20} />
              Copiar MPC Report
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
