"use client";

import { auth, database } from "@/firebase";
import { CopyIcon } from "@phosphor-icons/react";
import { onAuthStateChanged } from "firebase/auth";
import { get, onValue, ref } from "firebase/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ListaMembros() {
  const [membros, setMembros] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);

          if (!snapshot.exists() || snapshot.val().admin !== true) {
            toast.error(
              "Acesso negado. Você não possui permissão de administrador.",
            );
            router.push("/");
          } else {
            setLoadingAuth(false);
          }
        } catch (error) {
          console.error("Erro ao validar admin:", error);
          toast.error("Erro de autenticação. Redirecionando...");
          router.push("/");
        }
      } else {
        toast.error("Você precisa estar logado para acessar esta área.");
        router.push("/");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;

    const usuariosRef = ref(database, "usuarios");
    const candidatosRef = ref(database, "candidatos");

    // Escuta alterações na coleção de usuários
    const unsubscribeUsuarios = onValue(
      usuariosRef,
      (usuariosSnapshot) => {
        // Escuta alterações na coleção de candidatos
        onValue(
          candidatosRef,
          (candidatosSnapshot) => {
            if (usuariosSnapshot.exists()) {
              const dadosUsuarios = usuariosSnapshot.val();
              const dadosCandidatos = candidatosSnapshot.exists()
                ? candidatosSnapshot.val()
                : {};

              // Converte o objeto de candidatos em array
              const listaCandidatos = Object.values(dadosCandidatos);

              const listaMembrosFormatada = Object.keys(dadosUsuarios).map(
                (uid) => {
                  // Filtra os candidatos registrados por este usuário específico (observerUid)
                  const candidatosDoMembro = listaCandidatos.filter(
                    (candidato) => candidato.observerUid === uid,
                  );

                  // Contagem por status referente aos candidatos do membro
                  const total = candidatosDoMembro.length;
                  const emAnalise = candidatosDoMembro.filter(
                    (c) =>
                      c.status === "Em análise" || c.status === "em_analise",
                  ).length;
                  const preliminar = candidatosDoMembro.filter(
                    (c) =>
                      c.status === "Preliminar" || c.status === "preliminar",
                  ).length;
                  const provisoria = candidatosDoMembro.filter(
                    (c) =>
                      c.status === "Provisória" ||
                      c.status === "Provisório" ||
                      c.status === "provisoria",
                  ).length;

                  return {
                    uid,
                    ...dadosUsuarios[uid],
                    totalRegistros: total,
                    emAnalise,
                    preliminar,
                    provisoria,
                  };
                },
              );

              // Ordena os membros do maior para o menor em relação ao total de registros
              listaMembrosFormatada.sort(
                (a, b) => b.totalRegistros - a.totalRegistros,
              );

              setMembros(listaMembrosFormatada);
            } else {
              setMembros([]);
            }
            setLoadingData(false);
          },
          (err) => {
            console.error("Erro ao ler dados de candidatos:", err);
            setLoadingData(false);
          },
        );
      },
      (err) => {
        console.error("Erro ao ler dados de usuários:", err);
        setLoadingData(false);
      },
    );

    return () => {
      unsubscribeUsuarios();
    };
  }, [loadingAuth]);

  if (loadingAuth || loadingData) {
    return (
      <main
        className="center-container"
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
          Verificando credenciais e carregando banco de dados...
        </p>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <p>
          <b>Membros cadastrados:</b> {membros.length}
        </p>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Função</th>
                <th style={{ textAlign: "center" }}>Candidatos Registrados</th>
              </tr>
            </thead>
            <tbody>
              {membros.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      paddingBlock: "30px",
                      color: "var(--dark-gray)",
                    }}
                  >
                    Nenhum membro encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                membros.map((membro) => (
                  <tr key={membro.uid}>
                    <td>
                      <div className="withbtn-field">
                        <Link
                          href={`/admin/membros/${membro.uid}`}
                          className="underlined"
                        >
                          {membro.name || "Sem nome cadastrado"}
                        </Link>

                        <button
                          className="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(membro.name);
                            toast.success("Nome copiado!");
                          }}
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="withbtn-field">
                        {membro.email}
                        <button
                          className="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(membro.email);
                            toast.success("E-mail copiado!");
                          }}
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-${membro.admin ? "success" : "em-analise"}`}
                      >
                        {membro.admin ? "Administrador" : "Observador"}
                      </span>
                    </td>
                    <td>
                      <div className="container-count-badge">
                        <p
                          className="count-badge count-badge-total"
                          title="Total"
                        >
                          {membro.totalRegistros || 0}
                        </p>
                        <p
                          className="count-badge count-badge-review"
                          title="Em Analise"
                        >
                          {membro.emAnalise || 0}
                        </p>
                        <p
                          className="count-badge count-badge-premilinar"
                          title="Preliminar"
                        >
                          {membro.preliminar || 0}
                        </p>
                        <p
                          className="count-badge count-badge-provisional"
                          title="Provisória"
                        >
                          {membro.provisoria || 0}
                        </p>
                      </div>
                    </td>
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
