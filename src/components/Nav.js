"use client";

import { auth, database } from "@/firebase";
import { PlusCircleIcon, ShieldCheckIcon, SignInIcon, SignOutIcon } from "@phosphor-icons/react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { get, ref } from "firebase/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
                {isAdmin && (
                  <Link href="/admin/membros" className="btn secondary withicon">
                    <ShieldCheckIcon size={20} />
                    Painel
                  </Link>
                )}

                <Link href="/registrar" className="btn withicon">
                  <PlusCircleIcon size={20} />
                  Registrar
                </Link>
                <span className="divider"/>
                <button onClick={handleLogout} className="icon">
                  <SignOutIcon />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn withicon">
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