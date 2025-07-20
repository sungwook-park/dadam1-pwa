// scripts/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, where, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ⭐️ 주신 값 반영!
const firebaseConfig = {
  apiKey: "AIzaSyCSrhEZtE44KT66sTke6g-ZH3732QjFNyA",
  authDomain: "dadam-work.firebaseapp.com",
  projectId: "dadam-work",
  storageBucket: "dadam-work.appspot.com",
  messagingSenderId: "617534061102",
  appId: "1:617534061102:web:b2dec870a45c6a5b20bdbf"
};

// 1. Firebase 초기화
const app = initializeApp(firebaseConfig);

// 2. 서비스 인스턴스 생성
const db = getFirestore(app);
const auth = getAuth(app);

// 3. 모듈 export (module 방식)
export { db, auth };

// 4. window 등록 (window 방식 JS에서도 사용 가능)
window.db = db;
window.auth = auth;
window.firebase = {
  getDocs, collection, where, query,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
};
