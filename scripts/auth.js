
import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";



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
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
  } else {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
  }
});

document.getElementById('logoutBtn').onclick = async () => {
  await signOut(auth);
};
