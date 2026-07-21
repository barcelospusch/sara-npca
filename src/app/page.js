"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get } from "firebase/database";
import { auth, database } from "@/firebase";
import { GearSixIcon } from "@phosphor-icons/react";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // 1. Escuta o estado do Firebase Auth e valida a role consultando a propriedade no DB
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Consulta o nó correspondente do usuário no Database
          const userRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists() && snapshot.val().admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error(
            "Erro ao verificar permissões de admin no banco:",
            error,
          );
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Escuta em tempo real o nó 'candidatos' no Realtime Database
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
        console.error("Erro ao buscar candidatos do banco de dados:", error);
        setLoadingData(false);
      },
    );

    return () => unsubscribeData();
  }, []);

  const totalCandidatos = list.length;
  const emAnalise = list.filter((item) => item.status === "Em análise").length;
  const preliminares = list.filter(
    (item) => item.status === "Preliminar",
  ).length;
  const provisorios = list.filter(
    (item) => item.status === "Provisório",
  ).length;

  if (loadingAuth || loadingData) {
    return (
      <main
        className="login-main"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
        <div>
          <b>{totalCandidatos}</b>
          <p>Total de candidatos</p>
        </div>
        <div>
          <b>{emAnalise}</b>
          <p>Em análise</p>
        </div>
        <div style={{ backgroundColor: "var(--blue)" }}>
          <b>{preliminares}</b>
          <p>Preliminares</p>
        </div>
        <div style={{ backgroundColor: "var(--success)" }}>
          <b>{provisorios}</b>
          <p>Provisórios</p>
        </div>
      </header>

      <div className="container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Set</th>
                <th>Data</th>
                <th>Quadrante</th>
                <th>PS</th>
                <th>Observador</th>
                <th>Status</th>
                {isAdmin && <th>Gerenciar</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
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
                list.map((item, index) => (
                  <tr key={item.code || index}>
                    <td>{item.code}</td>
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
                        className={`status-${item.status ? item.status.toLowerCase().replace(" ", "-").replace("á", "a").replace("ó", "o") : "em-analise"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <Link
                          href={`/admin/candidatos/${item.code}`}
                          className="btn icon"
                        >
                          <GearSixIcon />
                        </Link>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
