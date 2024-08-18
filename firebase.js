// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from 'firebase/storage';
import { getFirestore } from "firebase/firestore";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai-preview";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'inventorytracker-8ad38.firebaseapp.com',
  projectId: 'inventorytracker-8ad38',
  storageBucket: 'inventorytracker-8ad38.appspot.com',
  messagingSenderId: '176861243461',
  appId: '1:176861243461:web:bcafacac3b4ec7683f5b2c',
  measurementId: 'G-KPL3RMP4Q3'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app);
const vertexAI = getVertexAI(app);
const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });

export{firestore, storage, model}