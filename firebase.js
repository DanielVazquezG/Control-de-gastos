import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA4QyON0H6QNj0-nQ8S7Q0bAXe5oXSE9AM",
    authDomain: "controlgastos-63755.firebaseapp.com",
    projectId: "controlgastos-63755",
    storageBucket: "controlgastos-63755.firebasestorage.app",
    messagingSenderId: "1008803210132",
    appId: "1:1008803210132:web:55bf2e13ac0d96426c6581"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export {
    signInWithPopup,
    signOut,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    updateDoc
};
