"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get } from "firebase/database";
import { auth, database } from "@/firebase";
import { GearSixIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";

export default function ListaMembros() {
  const [membros, setMembros] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  // 1. Validação de Segurança: Garante que apenas administradores acessem a página
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = ref(database, `usuarios/${user.uid}`);
          const snapshot = await get(userRef);

          if (!snapshot.exists() || snapshot.val().admin !== true) {
            toast.error("Acesso negado. Você não possui permissão de administrador.");
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

  // 2. Sincronização em tempo real de Usuários e contagem de Candidatos
  useEffect(() => {
    if (loadingAuth) return;

    const usuariosRef = ref(database, "usuarios");
    const candidatosRef = ref(database, "candidatos");

    // Escuta alterações nos usuários
    const unsubscribeUsuarios = onValue(usuariosRef, (usuariosSnapshot) => {
      // Escuta alterações nos candidatos para cruzar as contagens simultaneamente
      onValue(candidatosRef, (candidatosSnapshot) => {
        
        if (usuariosSnapshot.exists()) {
          const dadosUsuarios = usuariosSnapshot.val();
          const dadosCandidatos = candidatosSnapshot.exists() ? candidatosSnapshot.val() : {};

          // Transforma o objeto de candidatos em array para facilitar filtros
          const listaCandidatos = Object.values(dadosCandidatos);

          // Formata a lista de membros e injeta a contagem de registros correspondente
          const listaMembrosFormatada = Object.keys(dadosUsuarios).map((uid) => {
            const totalRegistros = listaCandidatos.filter(
              (candidato) => candidato.observerUid === uid
            ).length;

            return {
              uid,
              ...dadosUsuarios[uid],
              totalRegistros,
            };
          });

          // Opcional: Ordena os membros por quem tem mais registros enviados
          listaMembrosFormatada.sort((a, b) => b.totalRegistros - a.totalRegistros);

          setMembros(listaMembrosFormatada);
        } else {
          setMembros([]);
        }
        setLoadingData(false);
      }, (err) => {
        console.error("Erro ao ler dados de candidatos:", err);
        setLoadingData(false);
      });
    }, (err) => {
      console.error("Erro ao ler dados de usuários:", err);
      setLoadingData(false);
    });

    return () => {
      unsubscribeUsuarios();
    };
  }, [loadingAuth]);

  // Tela de transição enquanto verifica permissões e sincroniza os nós
  if (loadingAuth || loadingData) {
    return (
      <main className="login-main" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p className="login-text" style={{ fontFamily: "'Space Mono', monospace" }}>
          Verificando credenciais e carregando banco de dados...
        </p>
      </main>
    );
  }

  return (
    <main>      
      <header style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <b>{membros.length}</b>
          <p>Membros Cadastrados</p>
        </div>
        <div style={{backgroundColor: "transparent"}}>
          <Link href="/" className="btn secondary" style={{ fontSize: "14px", textDecoration: "none" }}>
            Voltar ao Dashboard
          </Link>
        </div>
      </header>

      <div className="container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Função</th>
                <th style={{ textAlign: "center" }}>Candidatos Registrados</th>
                <th style={{ textAlign: "center" }}>Gerenciar</th>
              </tr>
            </thead>
            <tbody>
              {membros.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", paddingBlock: "30px", color: "var(--dark-gray)" }}>
                    Nenhum membro encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                membros.map((membro) => (
                  <tr key={membro.uid}>
                    <td>
                      <Link href={`/admin/membros/${membro.uid}`} style={{ fontWeight: "600" }}>
                        {membro.name || "Sem nome cadastrado"}
                      </Link>
                    </td>
                    <td style={{ color: "var(--dark-gray)", fontFamily: "'Space Mono', monospace", fontSize: "14px" }}>
                      {membro.email}
                    </td>
                    <td>
                      <span className={`status-${membro.admin ? "success" : "em-analise"}`} style={{ fontSize: "12px" }}>
                        {membro.admin ? "Administrador" : "Observador"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {membro.totalRegistros}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Link href={`/admin/membros/${membro.uid}`} className="btn icon">
                        <GearSixIcon />
                      </Link>
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