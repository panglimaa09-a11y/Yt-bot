// Import fungsi yang diperlukan dari SDK Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";

// Konfigurasi Firebase milik Anda
const firebaseConfig = {
  apiKey: "AIzaSyBT0TdFXbIbC0TO4POfKbGjaASEkvXm9kU",
  authDomain: "yt-bot-74bf6.firebaseapp.com",
  projectId: "yt-bot-74bf6",
  storageBucket: "yt-bot-74bf6.firebasestorage.app",
  messagingSenderId: "352244169974",
  appId: "1:352244169974:web:c4afc083670d72f60e00d7",
  measurementId: "G-81TT2M5FWD"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Menangkap tombol "login-btn" dari index.html
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        // Login berhasil! Sesi otomatis tersimpan di browser
        const user = result.user;
        alert(`Selamat datang, ${user.displayName}!`);
        console.log("Berhasil login:", user.email);
      })
      .catch((error) => {
        console.error("Gagal login:", error.message);
        alert("Gagal login: " + error.message);
      });
  });
}

// Memantau status login (memastikan sesi tidak hilang saat di-refresh atau di-deploy ulang)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Pengguna aktif:", user.email);
    // Jika sudah login, Anda bisa menyembunyikan tombol login atau menampilkan nama user di sini
  } else {
    console.log("Belum ada pengguna yang login.");
  }
});
