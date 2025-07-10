import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSrhEZtE44KT66sTke6g-ZH3732QjFNyA",
  authDomain: "dadam-work.firebaseapp.com",
  projectId: "dadam-work",
  storageBucket: "dadam-work.appspot.com",
  messagingSenderId: "617534061102",
  appId: "1:617534061102:web:b2dec870a45c6a5b20bdbf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
