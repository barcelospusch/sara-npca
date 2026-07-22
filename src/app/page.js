"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get } from "firebase/database";
import { auth, database } from "@/firebase";
import {
  ApertureIcon,
  CalendarIcon,
  CaretLeftIcon,
  CaretRightIcon,
  GearSixIcon,
  GridFourIcon,
  IdentificationBadgeIcon,
  ListDashesIcon,
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


  const [viewMode, setViewMode] = useState("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(null);

  //* TESTE
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


  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();


  const itemsByDate = displayList.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const totalDays = getDaysInMonth(year, month);
    const startDay = getFirstDayOfWeek(year, month);

    const days = [];


    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }


    for (let day = 1; day <= totalDays; day++) {
      const formattedDay = String(day).padStart(2, "0");
      const formattedMonth = String(month + 1).padStart(2, "0");
      const dateKey = `${formattedDay}/${formattedMonth}/${year}`;

      const dayItems = itemsByDate[dateKey] || [];

      days.push(
        <div key={day} className="calendar-day">
          <span className="day-number">{day}</span>
          <div className="day-items">
            {dayItems.map((item) => (
              <button
                key={item.code}
                className={`calendar-item-chip status-${getStatusClass(item.status)}`}
                onClick={() => setSelectedItem(item)}
              >
                <span className="item-code">{item.code}</span>
              </button>
            ))}
          </div>
        </div>,
      );
    }

    return days;
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


      <div className="tab-switcher">
        <button
          className="btn icon"
          onClick={() => setViewMode("list")}
          title="Visualização em Lista"
        >
          <ListDashesIcon size={22} />
        </button>
        <button
          className="btn icon"
          onClick={() => setViewMode("calendar")}
          title="Visualização em Calendário"
        >
          <CalendarIcon size={22} />
        </button>
      </div>

      <div className="container">
        {/* ABA: LISTA */}
        {viewMode === "list" && (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <div className="icon-label" title="Código">
                      <span>Código</span>
                      <TagSimpleIcon size={20} className="icon" />
                    </div>
                  </th>
                  <th>
                    <div className="icon-label" title="Set">
                      <span>Set</span>
                      <PackageIcon size={20} className="icon" />
                    </div>
                  </th>
                  <th>
                    <div className="icon-label" title="Data">
                      <span>Data</span>
                      <CalendarIcon size={20} className="icon" />
                    </div>
                  </th>
                  <th>
                    <div className="icon-label" title="Quadrante">
                      <span>Quadrante</span>
                      <GridFourIcon size={20} className="icon" />
                    </div>
                  </th>
                  <th>
                    <div className="icon-label" title="PS">
                      <span>PS</span>
                      <ApertureIcon size={20} className="icon" />
                    </div>
                  </th>
                  <th>
                    <div className="icon-label" title="Observador">
                      <span>Observador</span>
                      <IdentificationBadgeIcon size={20} className="icon" />
                    </div>
                  </th>
                  <th>
                    <div className="icon-label" title="Status">
                      <span>Status</span>
                      <SealIcon size={20} className="icon" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
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
                          {isAdmin && (
                            <Link
                              href={`/admin/candidatos/${item.code}`}
                              className="btn icon"
                            >
                              <GearSixIcon />
                            </Link>
                          )}
                          {item.code}
                        </div>
                      </td>
                      <td>{item.set}</td>
                      <td>{item.date}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: CALENDÁRIO */}
        {viewMode === "calendar" && (
          <div className="calendar-view">
            <div
              className="calendar-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <button onClick={prevMonth} className="btn icon">
                <CaretLeftIcon size={20} />
              </button>
              <h2 style={{ textTransform: "capitalize", margin: 0 }}>
                {currentDate.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button onClick={nextMonth} className="btn icon">
                <CaretRightIcon size={20} />
              </button>
            </div>

            <div
              className="calendar-weekdays"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                textAlign: "center",
                fontWeight: "bold",
                paddingBottom: "8px",
              }}
            >
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>

            <div className="calendar-grid">{renderCalendar()}</div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DO ITEM NO CALENDÁRIO */}
      {selectedItem && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <button
              className="modal-close-btn"
              onClick={() => setSelectedItem(null)}
            >
              <XIcon size={20} />
            </button>

            <h2 className="modal-code">
              <span
                className={`status-badge status-${getStatusClass(selectedItem.status)}`}
              />
              {selectedItem.code}
            </h2>

            <div className="modal-infos">
              <p>
                <strong>Status:</strong> {selectedItem.status}
              </p>
              <p>
                <strong>Data:</strong> {selectedItem.date}
              </p>
              <p>
                <strong>PS:</strong> {selectedItem.ps}
              </p>
              <p>
                <strong>Set:</strong> {selectedItem.set}
              </p>
              <p>
                <strong>Quadrante:</strong> {selectedItem.quadrant}
              </p>
              <p>
                <strong>Observador:</strong>{" "}
                {isAdmin ? (
                  <Link
                    href={`/admin/membros/${selectedItem.observerUid}`}
                    style={{ textDecoration: "2px solid var(--primary)" }}
                  >
                    {selectedItem.observer}
                  </Link>
                ) : (
                  selectedItem.observer
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
