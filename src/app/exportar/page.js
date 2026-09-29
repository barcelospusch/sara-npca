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
  const [mpcType, setMpcType] = useState("");
  const [exportMode, setExportMode] = useState("simplificado"); // "simplificado" ou "avancado"

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Buscar todos os candidatos
        const candidatosRef = ref(database, "candidatos");
        const usuariosRef = ref(database, "usuarios");
        const [snapshot, usersSnapshot] = await Promise.all([
          get(candidatosRef),
          get(usuariosRef),
        ]);
        const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

        if (snapshot.exists()) {
          const data = snapshot.val();
          const lista = Object.keys(data).map((key) => {
            const candidate = data[key];
            return {
              ...candidate,
              observerName:
                users[candidate.observerUid]?.name ||
                candidate.observer ||
                "Observador",
            };
          });

          setCandidates(lista);

          // Extract observadores únicos registrados nos candidatos
          const mapObservadores = new Map();
          lista.forEach((item) => {
            const id = item.observerUid || item.observer;
            if (id && !mapObservadores.has(id)) {
              mapObservadores.set(id, {
                id: id,
                name: item.observerName,
              });
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
        const isEmptyMpc = item.quadrant === 0 || item.quadrant === "0";
        const matchesMpcType =
          !mpcType || (mpcType === "empty" ? isEmptyMpc : !isEmptyMpc);

        let matchesDate = true;
        if (startDate && item.date < startDate) matchesDate = false;
        if (endDate && item.date > endDate) matchesDate = false;

        return matchesObserver && matchesDate && matchesMpcType;
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
          item.observerName || "-",
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
          item.observerName || "-",
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
      <main className="center-container export-loading">
        <p className="login-text export-loading-text">
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
    <main className="center-container export-page">
      <div className="login-box export-card">
        <h2>Exportar Relatório</h2>

        <div className="login-form export-form">
          {/* SEÇÃO 1: SELEÇÃO DE OBSERVADORES */}
          <div className="input-group">
            <div className="export-section-heading">
              <span className="label">Observadores</span>
              <label className="export-select-all">
                <input
                  id="select-all-observers"
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                />
                Selecionar Todos
              </label>
            </div>

            <div className="export-observers-list">
              {observersList.length === 0 ? (
                <span className="export-empty-text">
                  Nenhum observador encontrado.
                </span>
              ) : (
                observersList.map((obs) => (
                  <label key={obs.id} className="export-observer-option">
                    <input
                      id={`observer-${obs.id}`}
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
            <span className="label">Período dos Registros</span>
            <div className="export-date-range">
              <div className="export-date-field">
                <label htmlFor="start-date">De:</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="login-input"
                />
              </div>
              <div className="export-date-field">
                <label htmlFor="end-date">Até:</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="login-input"
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="export-mpc-type">MPC Report</label>
            <select
              id="export-mpc-type"
              value={mpcType}
              onChange={(event) => setMpcType(event.target.value)}
              className="login-input"
            >
              <option value="">Todos</option>
              <option value="empty">MPC vazio</option>
              <option value="moving">Com objeto em movimento</option>
            </select>
          </div>

          {/* SEÇÃO 3: MODO DE VISUALIZAÇÃO (RADIO BUTTONS) */}

          <div className="input-group">
            <span className="label">Detalhamento do Relatório</span>
            <div className="input-ratio">
              <label
                htmlFor="export-simple"
                className={`ratio-label ${exportMode === "simplificado" ? "selected" : ""}`}
              >
                <input
                  id="export-simple"
                  type="radio"
                  name="exportMode"
                  value="simplificado"
                  checked={exportMode === "simplificado"}
                  onChange={(e) => setExportMode(e.target.value)}
                />
                <strong title="Código, data e observador">Simplificado</strong>
              </label>

              <label
                htmlFor="export-advanced"
                className={`ratio-label ${exportMode === "avancado" ? "selected" : ""}`}
              >
                <input
                  id="export-advanced"
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
            className="btn login-submit-btn export-submit"
          >
            <DownloadSimpleIcon size={20} />
            {exporting ? "Gerando PDF..." : "Exportar PDF"}
          </button>
        </div>
      </div>
    </main>
  );
}
