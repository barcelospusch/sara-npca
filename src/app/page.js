"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get } from "firebase/database";
import { auth, database } from "@/firebase";
import toast from "react-hot-toast";
import {
  CopyIcon,
  FileTextIcon,
  FunnelIcon,
  XIcon,
} from "@phosphor-icons/react";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMpcItem, setSelectedMpcItem] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    sort: "code-desc",
    observers: [],
    startDate: "",
    endDate: "",
    set: "",
    ps: "",
    status: "",
  });
  const [draftFilters, setDraftFilters] = useState(filters);

  const defaultFilters = {
    sort: "code-desc",
    observers: [],
    startDate: "",
    endDate: "",
    set: "",
    ps: "",
    status: "",
  };

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

  const observerOptions = Array.from(
    new Map(
      list
        .filter((item) => item.observer)
        .map((item) => [item.observerUid || item.observer, item.observer]),
    ),
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const displayList = [...list]
    .filter((item) => {
      const observerId = item.observerUid || item.observer;
      const normalizedSet = (item.set || "").toLowerCase();

      return (
        (filters.observers.length === 0 ||
          filters.observers.includes(observerId)) &&
        (!filters.startDate || item.date >= filters.startDate) &&
        (!filters.endDate || item.date <= filters.endDate) &&
        (!filters.set || normalizedSet.includes(filters.set.toLowerCase())) &&
        (!filters.ps || item.ps === filters.ps) &&
        (!filters.status || item.status === filters.status)
      );
    })
    .sort((a, b) => {
      if (filters.sort === "date-asc") {
        return (a.date || "").localeCompare(b.date || "");
      }
      if (filters.sort === "date-desc") {
        return (b.date || "").localeCompare(a.date || "");
      }
      if (filters.sort === "code-asc") {
        return (a.code || "").localeCompare(b.code || "");
      }
      return (b.code || "").localeCompare(a.code || "");
    });

  const activeFilterCount = [
    filters.observers.length > 0,
    Boolean(filters.startDate),
    Boolean(filters.endDate),
    Boolean(filters.set),
    Boolean(filters.ps),
    Boolean(filters.status),
  ].filter(Boolean).length;

  const openFilterModal = () => {
    setDraftFilters({ ...filters, observers: [...filters.observers] });
    setIsFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setDraftFilters({ ...filters, observers: [...filters.observers] });
    setIsFilterModalOpen(false);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({ ...draftFilters, observers: [...draftFilters.observers] });
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters({ ...defaultFilters, observers: [] });
  };

  const toggleObserver = (observerId) => {
    setDraftFilters((current) => ({
      ...current,
      observers: current.observers.includes(observerId)
        ? current.observers.filter((id) => id !== observerId)
        : [...current.observers, observerId],
    }));
  };

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
      <main className="center-container dashboard-loading">
        <p className="login-text dashboard-loading-text">
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
    <main className="dashboard">
      <header className="dashboard-summary" aria-label="Resumo dos candidatos">
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

      <div className="dashboard-toolbar">
        <span className="dashboard-results">
          {displayList.length} de {list.length} candidatos
        </span>
        <button
          type="button"
          className="btn secondary dashboard-filter-button"
          onClick={openFilterModal}
          aria-label="Abrir filtros da tabela"
        >
          <FunnelIcon size={18} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="dashboard-filter-count">{activeFilterCount}</span>
          )}
        </button>
      </div>

      <div className="container">
        <div className="table-responsive dashboard-table">
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
                    className="dashboard-empty"
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
                        <Link
                          href={`/admin/membros?uid=${encodeURIComponent(item.observerUid || "")}`}
                        >
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

      {isFilterModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeFilterModal}>
          <div
            className="modal-content dashboard-filter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-filter-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeFilterModal}
              title="Fechar filtros"
              aria-label="Fechar filtros"
            >
              <XIcon size={20} />
            </button>

            <h2 id="dashboard-filter-title">Filtros da tabela</h2>

            <form onSubmit={applyFilters} className="dashboard-filter-form">
              <div className="input-group">
                <label htmlFor="dashboard-sort">Ordem de listagem</label>
                <select
                  id="dashboard-sort"
                  className="login-input"
                  value={draftFilters.sort}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      sort: event.target.value,
                    }))
                  }
                >
                  <option value="code-desc">Código: mais recentes</option>
                  <option value="code-asc">Código: mais antigos</option>
                  <option value="date-desc">Data: mais recentes</option>
                  <option value="date-asc">Data: mais antigos</option>
                </select>
              </div>

              <div className="input-group">
                <span className="label">Observadores</span>
                <div className="dashboard-observer-options">
                  {observerOptions.length === 0 ? (
                    <span className="dashboard-filter-empty">
                      Nenhum observador encontrado.
                    </span>
                  ) : (
                    observerOptions.map((observer) => (
                      <label
                        key={observer.id}
                        className="dashboard-filter-check"
                      >
                        <input
                          type="checkbox"
                          checked={draftFilters.observers.includes(observer.id)}
                          onChange={() => toggleObserver(observer.id)}
                        />
                        {observer.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="input-group">
                <span className="label">Período de registro</span>
                <div className="dashboard-date-range">
                  <div className="dashboard-date-field">
                    <label htmlFor="dashboard-start-date">De</label>
                    <input
                      id="dashboard-start-date"
                      type="date"
                      className="login-input"
                      value={draftFilters.startDate}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="dashboard-date-field">
                    <label htmlFor="dashboard-end-date">Até</label>
                    <input
                      id="dashboard-end-date"
                      type="date"
                      className="login-input"
                      value={draftFilters.endDate}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="dashboard-set">Set</label>
                <input
                  id="dashboard-set"
                  type="search"
                  className="login-input"
                  placeholder="Buscar pelo set"
                  value={draftFilters.set}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      set: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="input-group">
                <span className="label">PS</span>
                <div className="input-ratio">
                  {[
                    ["", "Todos"],
                    ["PS1", "PS1"],
                    ["PS2", "PS2"],
                  ].map(([value, label]) => (
                    <label
                      key={label}
                      className={`ratio-label ${draftFilters.ps === value ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="dashboard-ps"
                        value={value}
                        checked={draftFilters.ps === value}
                        onChange={(event) =>
                          setDraftFilters((current) => ({
                            ...current,
                            ps: event.target.value,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="dashboard-status">Status</label>
                <select
                  id="dashboard-status"
                  className="login-input"
                  value={draftFilters.status}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Preliminar">Preliminar</option>
                  <option value="Provisório">Provisório</option>
                </select>
              </div>

              <div className="dashboard-filter-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </button>
                <button type="submit" className="btn">
                  Aplicar filtros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DO MPC REPORT */}
      {selectedMpcItem && (
        <div className="modal-backdrop">
          <div className="modal-content report-modal">
            <button
              className="modal-close-btn"
              onClick={() => setSelectedMpcItem(null)}
            >
              <XIcon size={20} />
            </button>

            <h2 className="modal-code">{selectedMpcItem.code} - MPC Report</h2>

            <div className="modal-infos report-modal-infos">
              <textarea
                readOnly
                value={
                  selectedMpcItem.mpcReport || "Nenhum relatório cadastrado."
                }
                rows={10}
                className="login-input report-textarea"
              />
            </div>

            <button
              className="btn login-submit-btn report-copy-btn"
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
