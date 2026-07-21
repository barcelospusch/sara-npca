"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, database } from "@/firebase";
import { PlusCircleIcon, SignInIcon, SignOutIcon, ShieldCheckIcon } from "@phosphor-icons/react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Consulta se o usuário logado possui a propriedade admin no banco de dados
          const userRef = ref(database, `usuarios/${currentUser.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists() && snapshot.val().admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Erro ao verificar permissão de admin na navbar:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    // Limpa o listener ao desmontar o componente
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

  return (
    <nav>
      <div>
        <Link href="/">SARA-NPCA</Link>
      </div>

      <div>
        {!loading && (
          <>
            {user ? (
              <>
                {/* Botões visíveis apenas para usuários LOGADOS */}
                <Link href="/">Dashboard</Link>
                
                {/* Botão de Administração - Visível apenas se for Admin */}
                {isAdmin && (
                  <Link href="/admin/membros" className="btn secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheckIcon size={20} />
                    Painel
                  </Link>
                )}

                <Link href="/registrar" className="btn">
                  <PlusCircleIcon />
                  Registrar
                </Link>
                <span className="divider"/>
                <button onClick={handleLogout}>
                  <SignOutIcon />
                  Sair
                </button>
              </>
            ) : (
              <>
                {/* Botão visível apenas para usuários DESLOGADOS */}
                <Link href="/login" className="btn">
                  <SignInIcon />
                  Entrar
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}