import { app, database, firestore } from "@/firebase";
import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  updateProfile,
} from "firebase/auth";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { deleteDoc, doc, setDoc } from "firebase/firestore";

function formatMembers(users, candidates) {
  const totalsByMember = new Map(
    Object.keys(users).map((uid) => [
      uid,
      { totalRegistros: 0, emAnalise: 0, preliminar: 0, provisoria: 0 },
    ]),
  );

  Object.values(candidates).forEach((candidate) => {
    if (!candidate) return;

    const totals = totalsByMember.get(candidate.observerUid);
    if (!totals) return;

    totals.totalRegistros += 1;
    if (
      candidate.status === "Em análise" ||
      candidate.status === "em_analise"
    ) {
      totals.emAnalise += 1;
    } else if (
      candidate.status === "Preliminar" ||
      candidate.status === "preliminar"
    ) {
      totals.preliminar += 1;
    } else if (
      candidate.status === "Provisória" ||
      candidate.status === "Provisório" ||
      candidate.status === "provisoria"
    ) {
      totals.provisoria += 1;
    }
  });

  const members = Object.entries(users).map(([uid, profile]) => ({
    uid,
    ...profile,
    ...totalsByMember.get(uid),
  }));

  return members.sort((a, b) => {
    if (Boolean(a.admin) !== Boolean(b.admin)) {
      return a.admin ? -1 : 1;
    }

    return (a.name || "").localeCompare(b.name || "", "pt-BR", {
      sensitivity: "base",
    });
  });
}

export async function getMemberProfile(uid) {
  const snapshot = await get(ref(database, `usuarios/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export function subscribeToMembers(onMembers, onError) {
  let users = {};
  let candidates = {};
  let usersLoaded = false;
  let candidatesLoaded = false;

  const notifyWhenReady = () => {
    if (!usersLoaded || !candidatesLoaded) return;
    onMembers(formatMembers(users, candidates));
  };

  const unsubscribeUsers = onValue(
    ref(database, "usuarios"),
    (snapshot) => {
      users = snapshot.exists() ? snapshot.val() : {};
      usersLoaded = true;
      notifyWhenReady();
    },
    (error) => onError("usuarios", error),
  );
  const unsubscribeCandidates = onValue(
    ref(database, "candidatos"),
    (snapshot) => {
      candidates = snapshot.exists() ? snapshot.val() : {};
      candidatesLoaded = true;
      notifyWhenReady();
    },
    (error) => onError("candidatos", error),
  );

  return () => {
    unsubscribeUsers();
    unsubscribeCandidates();
  };
}

export async function createObserverAccount({ name, email, password }) {
  const secondaryApp =
    getApps().find(
      (firebaseApp) => firebaseApp.name === "sara-observer-creator",
    ) || initializeApp(app.options, "sara-observer-creator");
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser;
  let firestoreSyncFailed = false;

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password,
    );
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName: name.trim() });

    const observerProfile = {
      uid: createdUser.uid,
      name: name.trim(),
      email: createdUser.email,
      admin: false,
      active: true,
    };

    await set(ref(database, `usuarios/${createdUser.uid}`), observerProfile);

    try {
      await setDoc(doc(firestore, "usuarios", createdUser.uid), observerProfile);
    } catch (error) {
      firestoreSyncFailed = true;
      console.warn(
        "Perfil criado no Realtime Database; Firestore indisponível:",
        error,
      );
    }
  } catch (error) {
    if (createdUser) {
      const cleanupResults = await Promise.allSettled([
        deleteDoc(doc(firestore, "usuarios", createdUser.uid)),
        remove(ref(database, `usuarios/${createdUser.uid}`)),
        deleteUser(createdUser),
      ]);
      cleanupResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Falha na etapa ${index + 1} da limpeza da conta criada:`,
            result.reason,
          );
        }
      });
    }
    throw error;
  }

  return { firestoreSyncFailed };
}

export function updateMemberProfile(uid, profile) {
  return update(ref(database, `usuarios/${uid}`), profile);
}

export function deleteMemberProfile(uid) {
  return remove(ref(database, `usuarios/${uid}`));
}
