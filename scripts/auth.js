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
    window.routeTo('home');

    const tabButtons = document.getElementById('tabButtons');
    tabButtons.innerHTML = '';

    if (currentUserRole === 'admin') {
      tabButtons.innerHTML += `<button id="tabInput">작업 입력</button>`;
    }

    tabButtons.innerHTML += `
      <button id="tabHome" class="active">홈</button>
      <button id="tabList">목록 보기</button>
      <button id="tabDone">완료 보기</button>
    `;

    if (currentUserRole === 'admin') {
      document.getElementById('tabInput').onclick = () => window.setTab('input');
    }
    document.getElementById('tabHome').onclick = () => window.setTab('home');
    document.getElementById('tabList').onclick = () => {
      window.setTab('list');
      window.loadTasks('incomplete');
    };
    document.getElementById('tabDone').onclick = () => {
      window.setTab('done');
      window.loadTasks('done');
    };

    window.setTab('home');
  }
});

document.getElementById('logoutBtn').onclick = async () => {
  await signOut(auth);
  location.reload();
};

window.getUserInfo = () => ({ currentUserRole, currentUserName });


export function getUserInfo() {
  return { currentUserRole, currentUserName };
}