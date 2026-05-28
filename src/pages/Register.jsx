import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Auth.module.css";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Заполните все поля");
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await updateProfile(result.user, {
        displayName: form.name,
      });

      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name: form.name,
        email: form.email,
        avatarUrl: "",
        role: "user",
        status: "online",
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });

      navigate("/chat");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        setError("Этот email уже зарегистрирован");
      } else if (err.code === "auth/weak-password") {
        setError("Пароль должен быть минимум 6 символов");
      } else {
        setError("Ошибка регистрации");
      }
    }
  };

  return (
    <div className={style.page}>
      <form className={style.form} onSubmit={handleRegister}>
        <h2>Регистрация</h2>

        {error && <p className={style.error}>{error}</p>}

        <input
          type="text"
          name="name"
          placeholder="Имя"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={form.password}
          onChange={handleChange}
        />

        <button type="submit">Зарегистрироваться</button>

        <p>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;