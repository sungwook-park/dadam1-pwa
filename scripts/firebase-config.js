// scripts/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  where, 
  getDocs, 
  query,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// 3. 사용자 정보 조회 함수
export async function getUserInfo(email) {
  try {
    console.log('👤 사용자 정보 조회:', email);
    
    const q = query(
      collection(db, "users"), 
      where("email", "==", email)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('✅ 사용자 정보 조회 성공:', userData);
      
      return {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      };
    } else {
      console.warn('⚠️ 사용자 정보를 찾을 수 없음:', email);
      return null;
    }
  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
    return null;
  }
}

// 4. 모듈 export (module 방식)
export { db, auth };

// 5. window 등록 (window 방식 JS에서도 사용 가능)
window.db = db;
window.auth = auth;
window.getUserInfo = getUserInfo;
window.firebase = {
  getDocs, collection, where, query, doc, getDoc,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
};