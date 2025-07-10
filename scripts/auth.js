import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentUserRole = '';
let currentUserName = '';

document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("로그인 실패: " + err.message);
  }
};

onAuthStateChanged(auth, async user => {
  if (user) {
    const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
    if (userSnap.empty) return alert("사용자 정보가 없습니다.");
    const userData = userSnap.docs[0].data();
    currentUserRole = userData.role;
    currentUserName = userData.name;

    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    // 관리자 → 홈으로
    if (currentUserRole === 'admin') {
      window.routeTo('home');
    } else {
      window.routeTo('work');
    }
  }
});

document.getElementById('logoutBtn').onclick = async () => {
  await signOut(auth);
  location.reload();
};

window.getUserInfo = () => ({ currentUserRole, currentUserName });