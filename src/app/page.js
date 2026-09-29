"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get, update, remove } from "firebase/database";
import { auth, database } from "@/firebase";
import toast from "react-hot-toast";
import {
  CopyIcon,
  FileTextIcon,
  FloppyDiskIcon,
  FunnelIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState([]);
  const [membersByUid, setMembersByUid] = useState({});
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMpcItem, setSelectedMpcItem] = useState(null);
  const reportTextareaRef = useRef(null);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    sort: "code-desc",
    observers: [],
    startDate: "",
    endDate: "",
    set: "",
    ps: "",
    status: "",
    mpcType: "",
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
    mpcType: "",
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
            candidateId: key,
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

  useEffect(() => {
    const usuariosRef = ref(database, "usuarios");
    const unsubscribeUsers = onValue(usuariosRef, (snapshot) => {
      setMembersByUid(snapshot.exists() ? snapshot.val() : {});
    });

    return () => unsubscribeUsers();
  }, []);

  const getObserverName = (item) =>
    membersByUid[item.observerUid]?.name ||
    item.observer ||
    (item.observerUid ? "Observador" : "-");

  const isEmptyMpc = (item) =>
    item.quadrant === 0 || item.quadrant === "0";

  const observerOptions = Array.from(
    new Map(
      list
        .map((item) => {
          const id = item.observerUid || item.observer;
          return id ? [id, getObserverName(item)] : null;
        })
        .filter(Boolean),
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
        (!filters.status || item.status === filters.status) &&
        (!filters.mpcType ||
          (filters.mpcType === "empty"
            ? isEmptyMpc(item)
            : !isEmptyMpc(item)))
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
    Boolean(filters.mpcType),
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

  const updateSelectedCandidate = (field, value) => {
    setSelectedMpcItem((current) => ({ ...current, [field]: value }));
  };

  const handleUpdateCandidate = async (event) => {
    event.preventDefault();
    if (!selectedMpcItem) return;

    setSavingCandidate(true);
    const toastId = toast.loading("Atualizando informações do candidato...");

    try {
      await update(
        ref(
          database,
          `candidatos/${selectedMpcItem.candidateId || selectedMpcItem.code}`,
        ),
        {
        set: selectedMpcItem.set || "",
        quadrant: selectedMpcItem.quadrant || "",
        ps: selectedMpcItem.ps || "PS1",
        status: selectedMpcItem.status || "Em análise",
        mpcReport: selectedMpcItem.mpcReport || "",
        },
      );

      toast.success(
        `Candidato ${selectedMpcItem.code} atualizado com sucesso!`,
        {
          id: toastId,
        },
      );
      setSelectedMpcItem(null);
    } catch (error) {
      console.error("Erro ao atualizar o candidato:", error);
      toast.error("Falha ao salvar as alterações.", { id: toastId });
    } finally {
      setSavingCandidate(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!selectedMpcItem) return;

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir permanentemente o candidato ${selectedMpcItem.code}?`,
    );

    if (!confirmDelete) return;

    setDeletingCandidate(true);
    const toastId = toast.loading("Removendo candidato...");

    try {
      await remove(
        ref(
          database,
          `candidatos/${selectedMpcItem.candidateId || selectedMpcItem.code}`,
        ),
      );
      toast.success(`Candidato ${selectedMpcItem.code} excluído com sucesso!`, {
        id: toastId,
      });
      setSelectedMpcItem(null);
    } catch (error) {
      console.error("Erro ao excluir o candidato:", error);
      toast.error("Erro ao tentar remover o candidato.", { id: toastId });
    } finally {
      setDeletingCandidate(false);
    }
  };

  useEffect(() => {
    if (!selectedMpcItem || !reportTextareaRef.current) return;

    const textarea = reportTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [selectedMpcItem]);

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
          aria-label={`Abrir filtros da tabela${
            activeFilterCount > 0
              ? ` (${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} ativo${activeFilterCount === 1 ? "" : "s"})`
              : ""
          }`}
          title={
            activeFilterCount > 0
              ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} ativo${activeFilterCount === 1 ? "" : "s"}`
              : "Nenhum filtro ativo"
          }
        >
          <FunnelIcon size={18} />
          Filtros
          {activeFilterCount > 0 && (
            <span
              className="dashboard-filter-count"
              aria-label={`${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} ativo${activeFilterCount === 1 ? "" : "s"}`}
            >
              {activeFilterCount}
            </span>
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
                  <div className="icon-label" title="Resumo">
                    <span>Resumo</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dashboard-empty">
                    Nenhum candidato a asteroide registrado até o momento.
                  </td>
                </tr>
              ) : (
                displayList.map((item, index) => (
                  <tr key={item.candidateId || item.code || index}>
                    <td>
                      {isEmptyMpc(item) ? (
                        <span className="mpc-empty-badge">MPC vazio</span>
                      ) : (
                        item.code
                      )}
                    </td>
                    <td>{item.set}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.quadrant}</td>
                    <td>{item.ps}</td>
                    <td>
                      {isAdmin ? (
                        <Link
                          href={`/membros?uid=${encodeURIComponent(item.observerUid || "")}`}
                        >
                          {getObserverName(item)}
                        </Link>
                      ) : (
                        getObserverName(item)
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
                    <td style={{ display: "flex", justifyContent: "center" }}>
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

            <h2 id="dashboard-filter-title">Filtrar candidatos</h2>

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
                <label htmlFor="dashboard-mpc-type">MPC Report</label>
                <select
                  id="dashboard-mpc-type"
                  className="login-input"
                  value={draftFilters.mpcType}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      mpcType: event.target.value,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="empty">MPC vazio</option>
                  <option value="moving">Com objeto em movimento</option>
                </select>
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

      {/* MODAL DE VISUALIZAÇÃO DO CANDIDATO */}
      {selectedMpcItem && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedMpcItem(null)}
        >
          <div
            className="modal-content report-modal candidate-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedMpcItem(null)}
              title="Fechar informações do candidato"
              aria-label="Fechar informações do candidato"
            >
              <XIcon size={20} />
            </button>

            <div className="code-highlight-banner candidate-code">
              <strong id="candidate-modal-title">{selectedMpcItem.code}</strong>
            </div>

            {isAdmin ? (
              <form
                onSubmit={handleUpdateCandidate}
                className="login-form candidate-modal-form"
              >
                <div className="candidate-meta">
                  <div className="candidate-meta-item">
                    <span className="candidate-meta-label">Observador</span>
                    <strong>
                      <Link
                        href={`/membros?uid=${encodeURIComponent(selectedMpcItem.observerUid || "")}`}
                        onClick={() => setSelectedMpcItem(null)}
                      >
                        {getObserverName(selectedMpcItem)}
                      </Link>
                    </strong>
                  </div>
                  <div className="candidate-meta-item candidate-meta-date">
                    <span className="candidate-meta-label">
                      Data de Registro
                    </span>
                    <span>{formatDate(selectedMpcItem.date)}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="dashboard-candidate-set">Set</label>
                  <input
                    id="dashboard-candidate-set"
                    type="text"
                    value={selectedMpcItem.set || ""}
                    onChange={(event) =>
                      updateSelectedCandidate("set", event.target.value)
                    }
                    required
                    disabled={savingCandidate || deletingCandidate}
                    className="login-input"
                    placeholder="Ex: 49-00"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="dashboard-candidate-quadrant">
                    Quadrante
                  </label>
                  <input
                    id="dashboard-candidate-quadrant"
                    type="text"
                    value={selectedMpcItem.quadrant || ""}
                    onChange={(event) =>
                      updateSelectedCandidate("quadrant", event.target.value)
                    }
                    required
                    disabled={savingCandidate || deletingCandidate}
                    className="login-input"
                  />
                </div>

                <div className="input-group">
                  <span className="label">PS</span>
                  <div className="input-ratio">
                    {["PS1", "PS2"].map((value) => (
                      <label
                        key={value}
                        htmlFor={`dashboard-candidate-${value.toLowerCase()}`}
                        className={`ratio-label ${(selectedMpcItem.ps || "PS1") === value ? "selected" : ""}`}
                      >
                        <input
                          id={`dashboard-candidate-${value.toLowerCase()}`}
                          type="radio"
                          name="dashboard-candidate-ps"
                          value={value}
                          checked={(selectedMpcItem.ps || "PS1") === value}
                          onChange={(event) =>
                            updateSelectedCandidate("ps", event.target.value)
                          }
                          disabled={savingCandidate || deletingCandidate}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <span className="label">Status da Análise</span>
                  <div className="input-ratio">
                    {[
                      ["Em análise", "review"],
                      ["Preliminar", "preliminar"],
                      ["Provisório", "provisional"],
                    ].map(([value, className]) => (
                      <label
                        key={value}
                        htmlFor={`dashboard-candidate-status-${className}`}
                        className={`ratio-label ${(selectedMpcItem.status || "Em análise") === value ? `selected ${className}` : ""}`}
                      >
                        <input
                          id={`dashboard-candidate-status-${className}`}
                          type="radio"
                          name="dashboard-candidate-status"
                          value={value}
                          checked={
                            (selectedMpcItem.status || "Em análise") === value
                          }
                          onChange={(event) =>
                            updateSelectedCandidate(
                              "status",
                              event.target.value,
                            )
                          }
                          disabled={savingCandidate || deletingCandidate}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="dashboard-candidate-mpc-report">
                    MPC Report
                  </label>
                  <textarea
                    id="dashboard-candidate-mpc-report"
                    ref={reportTextareaRef}
                    readOnly
                    value={
                      selectedMpcItem.mpcReport ||
                      "Nenhum relatório cadastrado."
                    }
                    className="login-input report-textarea"
                  />
                </div>

                <div className="candidate-actions">
                  <button
                    type="button"
                    onClick={handleDeleteCandidate}
                    disabled={savingCandidate || deletingCandidate}
                    className="btn icon login-submit-btn candidate-delete-button"
                    title="Excluir candidato"
                    aria-label="Excluir candidato"
                  >
                    <TrashIcon />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMpcReport}
                    disabled={savingCandidate || deletingCandidate}
                    className="btn login-submit-btn candidate-copy-button"
                  >
                    <CopyIcon size={20} />
                    Copiar <i>MPC Report</i>
                  </button>
                  <button
                    type="submit"
                    disabled={savingCandidate || deletingCandidate}
                    className="btn login-submit-btn candidate-save-button"
                  >
                    <FloppyDiskIcon size={20}/>
                    {savingCandidate
                      ? "Salvando Alterações..."
                      : "Salvar Modificações"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-infos report-modal-infos">
                <div className="candidate-modal-details">
                  <div>
                    <span>Código</span>
                    <strong>{selectedMpcItem.code}</strong>
                  </div>
                  <div>
                    <span>Observador</span>
                    <strong>{getObserverName(selectedMpcItem)}</strong>
                  </div>
                  <div>
                    <span>Data de Registro</span>
                    <strong>{formatDate(selectedMpcItem.date)}</strong>
                  </div>
                  <div>
                    <span>Set</span>
                    <strong>{selectedMpcItem.set || "-"}</strong>
                  </div>
                  <div>
                    <span>Quadrante</span>
                    <strong>{selectedMpcItem.quadrant || "-"}</strong>
                  </div>
                  <div>
                    <span>PS</span>
                    <strong>{selectedMpcItem.ps || "-"}</strong>
                  </div>
                  <div>
                    <span>Status da Análise</span>
                    <strong>{selectedMpcItem.status || "Em análise"}</strong>
                  </div>
                </div>

                <label htmlFor="candidate-mpc-report">MPC Report</label>
                <textarea
                  id="candidate-mpc-report"
                  ref={reportTextareaRef}
                  readOnly
                  value={
                    selectedMpcItem.mpcReport || "Nenhum relatório cadastrado."
                  }
                  className="login-input report-textarea"
                />

                <button
                  type="button"
                  className="btn login-submit-btn report-copy-btn"
                  onClick={handleCopyMpcReport}
                >
                  <CopyIcon size={20} />
                  Copiar MPC Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
