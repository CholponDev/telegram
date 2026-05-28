import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Auth.module.css";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await updateDoc(doc(db, "users", result.user.uid), {
        status: "online",
        lastSeen: serverTimestamp(),
      });

      navigate("/chat");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/invalid-credential") {
        setError("Неверный email или пароль");
      } else {
        setError("Ошибка входа");
      }
    }
  };

  return (
    <div className={style.page}>
      <form className={style.form} onSubmit={handleLogin}>
        <h2>Вход</h2>

        {error && <p className={style.error}>{error}</p>}

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

        <button type="submit">Войти</button>

        <p>
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>

        <p>
          <Link to="/reset-password">Забыли пароль?</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;