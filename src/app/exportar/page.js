"use client";

import { database } from "@/firebase";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { get, ref } from "firebase/database";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ExportarPage() {
  const [candidates, setCandidates] = useState([]);
  const [observersList, setObserversList] = useState([]);
  const [selectedObservers, setSelectedObservers] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportMode, setExportMode] = useState("simplificado"); // "simplificado" ou "avancado"

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Buscar todos os candidatos
        const candidatosRef = ref(database, "candidatos");
        const snapshot = await get(candidatosRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const lista = Object.keys(data).map((key) => ({
            ...data[key],
          }));

          setCandidates(lista);

          // Extract observadores únicos registrados nos candidatos
          const mapObservadores = new Map();
          lista.forEach((item) => {
            if (item.observer) {
              const id = item.observerUid || item.observer;
              if (!mapObservadores.has(id)) {
                mapObservadores.set(id, {
                  id: id,
                  name: item.observer,
                });
              }
            }
          });

          const obsList = Array.from(mapObservadores.values());
          setObserversList(obsList);
          // Por padrão, seleciona todos os observadores
          setSelectedObservers(obsList.map((o) => o.id));
        }
      } catch (error) {
        console.error("Erro ao buscar dados para exportação:", error);
        toast.error("Erro ao carregar dados do banco.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handler para marcar/desmarcar todos os observadores
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedObservers(observersList.map((o) => o.id));
    } else {
      setSelectedObservers([]);
    }
  };

  // Handler para selecionar/desselecionar um observador individual
  const handleObserverCheckboxChange = (id) => {
    if (selectedObservers.includes(id)) {
      setSelectedObservers(selectedObservers.filter((item) => item !== id));
    } else {
      setSelectedObservers([...selectedObservers, id]);
    }
  };

  // Função de Geração e Download do PDF
  const handleExportPDF = () => {
    if (selectedObservers.length === 0) {
      toast.error("Selecione pelo menos um observador.");
      return;
    }

    setExporting(true);
    const toastId = toast.loading("Gerando arquivo PDF...");

    try {
      // Filtrar candidatos
      const filtered = candidates.filter((item) => {
        const obsId = item.observerUid || item.observer;
        const matchesObserver = selectedObservers.includes(obsId);

        let matchesDate = true;
        if (startDate && item.date < startDate) matchesDate = false;
        if (endDate && item.date > endDate) matchesDate = false;

        return matchesObserver && matchesDate;
      });

      if (filtered.length === 0) {
        toast.error(
          "Nenhum candidato encontrado com os filtros selecionados.",
          {
            id: toastId,
          },
        );
        setExporting(false);
        return;
      }

      // Ordenar por código decrescente
      filtered.sort((a, b) => (b.code || "").localeCompare(a.code || ""));

      // Instanciar jsPDF (Paisagem se Avançado, Retrato se Simplificado)
      const doc = new jsPDF({
        orientation: exportMode === "avancado" ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      // Cabeçalho do documento
      doc.setFontSize(16);
      doc.text("Relatório de Candidatos a Asteroides (SARA-NPCA)", 14, 15);

      doc.setFontSize(10);
      doc.text(
        `Modo: ${exportMode === "avancado" ? "Avançado" : "Simplificado"} | Data do Relatório: ${new Date().toLocaleDateString("pt-BR")}`,
        14,
        22,
      );

      // Colunas e Dados da Tabela
      let tableColumns = [];
      let tableRows = [];

      if (exportMode === "simplificado") {
        tableColumns = ["Código", "Data", "Observador"];
        tableRows = filtered.map((item) => [
          item.code || "-",
          formatDate(item.date) || "-",
          item.observer || "-",
        ]);
      } else {
        tableColumns = [
          "Código",
          "Set",
          "Data",
          "Quadrante",
          "PS",
          "Observador",
          "Status",
          "MPC Report",
        ];
        tableRows = filtered.map((item) => [
          item.code || "-",
          item.set || "-",
          formatDate(item.date) || "-",
          item.quadrant || "-",
          item.ps || "-",
          item.observer || "-",
          item.status || "-",
          item.mpcReport || "-",
        ]);
      }

      // Renderizar tabela usando autoTable
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 28,
        theme: "grid",
        headStyles: {
          fillColor: [20, 20, 20],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
      });

      // Salvar PDF
      const dateFormatted = new Date().toISOString().split("T")[0];
      doc.save(`relatorio_candidatos_${exportMode}_${dateFormatted}.pdf`);

      toast.success("Download do PDF iniciado com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o arquivo PDF.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <main className="center-container">
        <p
          className="login-text"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Carregando dados para exportação...
        </p>
      </main>
    );
  }

  const allSelected =
    observersList.length > 0 &&
    selectedObservers.length === observersList.length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <main className="center-container">
      <div className="login-box" style={{ maxWidth: "650px", width: "100%" }}>
        <h2>Exportar Relatório</h2>

        <div className="login-form">
          {/* SEÇÃO 1: SELEÇÃO DE OBSERVADORES */}
          <div className="input-group">
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                Observadores
              </span>
              <label
                style={{
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  textTransform: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                />
                Selecionar Todos
              </label>
            </label>

            <div
              style={{
                border: "2px solid var(--black)",
                padding: "10px",
                maxHeight: "150px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                backgroundColor: "#fff",
              }}
            >
              {observersList.length === 0 ? (
                <span style={{ fontSize: "0.9rem", color: "var(--dark-gray)" }}>
                  Nenhum observador encontrado.
                </span>
              ) : (
                observersList.map((obs) => (
                  <label
                    key={obs.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontSize: "0.95rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedObservers.includes(obs.id)}
                      onChange={() => handleObserverCheckboxChange(obs.id)}
                    />
                    {obs.name}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* SEÇÃO 2: PERÍODO DE REGISTROS */}
          <div className="input-group">
            <label
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              Período dos Registros
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <small style={{ display: "block", marginBottom: "4px" }}>
                  De:
                </small>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="login-input"
                />
              </div>
              <div>
                <small style={{ display: "block", marginBottom: "4px" }}>
                  Até:
                </small>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="login-input"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: MODO DE VISUALIZAÇÃO (RADIO BUTTONS) */}

          <div className="input-group">
            <span className="label">Detalhamento do Relatório</span>
            <div className="input-ratio">
              <label
                className={`ratio-label ${exportMode === "simplificado" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="exportMode"
                  value="simplificado"
                  checked={exportMode === "simplificado"}
                  onChange={(e) => setExportMode(e.target.value)}
                />
                <strong title="Código, data e observador">Simplificado</strong>
              </label>

              <label
                className={`ratio-label ${exportMode === "avancado" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="exportMode"
                  value="avancado"
                  checked={exportMode === "avancado"}
                  onChange={(e) => setExportMode(e.target.value)}
                />
                <strong title="Todas as informações">Avançado</strong>
              </label>
            </div>
          </div>

          {/* BOTÃO DE EXPORTAÇÃO */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting || candidates.length === 0}
            className="btn login-submit-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            <DownloadSimpleIcon size={20} />
            {exporting ? "Gerando PDF..." : "Exportar PDF"}
          </button>
        </div>
      </div>
    </main>
  );
}
