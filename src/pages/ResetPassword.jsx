import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";

import { auth } from "../firebase/firebase";
import style from "../styles/Auth.module.css";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Ссылка для восстановления отправлена на email");
    } catch (err) {
      console.error(err);
      setError("Ошибка. Проверьте email");
    }
  };

  return (
    <div className={style.page}>
      <form className={style.form} onSubmit={handleReset}>
        <h2>Восстановление пароля</h2>

        {message && <p className={style.success}>{message}</p>}
        {error && <p className={style.error}>{error}</p>}

        <input
          type="email"
          placeholder="Введите email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit">Отправить ссылку</button>

        <p>
          <Link to="/login">Назад ко входу</Link>
        </p>
      </form>
    </div>
  );
}

export default ResetPassword;