import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import { useAppSettings } from "../context/AppSettingsContext";

import style from "../styles/Auth.module.css";

function Login() {
  const navigate = useNavigate();

  const {
    t,
    language,
    themeMode,
    changeLanguage,
    changeTheme,
  } = useAppSettings();

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

      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email: result.user.email || "",
          status: "online",
          lastSeen: serverTimestamp(),

          themeMode: themeMode,
          language: language,

          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      navigate("/chat");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/invalid-credential") {
        setError(t("wrongLogin"));
      } else if (err.code === "auth/invalid-email") {
        setError(t("invalidEmail"));
      } else {
        setError(t("loginError"));
      }
    }
  };

  return (
    <div className={style.page}>
      <form className={style.form} onSubmit={handleLogin}>
        <div className={style.authSettings}>
          <label>
            <span>{t("language")}</span>

            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              <option value="ru">{t("russian")}</option>
              <option value="kg">{t("kyrgyz")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </label>

          <label>
            <span>{t("theme")}</span>

            <select
              value={themeMode}
              onChange={(e) => changeTheme(e.target.value)}
            >
              <option value="light">{t("lightTheme")}</option>
              <option value="dark">{t("darkTheme")}</option>
              <option value="system">{t("systemTheme")}</option>
            </select>
          </label>
        </div>

        <h2>{t("loginTitle")}</h2>

        {error && <p className={style.error}>{error}</p>}

        <input
          type="email"
          name="email"
          placeholder={t("emailPlaceholder")}
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder={t("passwordPlaceholder")}
          value={form.password}
          onChange={handleChange}
        />

        <button type="submit">{t("loginButton")}</button>

        <p>
          {t("noAccount")} <Link to="/register">{t("register")}</Link>
        </p>

        <p>
          <Link to="/reset-password">{t("forgotPassword")}</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;