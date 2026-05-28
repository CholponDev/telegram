import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Register.module.css";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const normalizePhone = (phone) => {
    return phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  };

  const getPhoneDigits = (phone) => {
    return phone.replace(/\D/g, "");
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const phone = normalizePhone(form.phone);
    const searchPhone = getPhoneDigits(phone);

    if (!name || !phone || !form.email || !form.password) {
      alert("Заполните все поля");
      return;
    }

    if (searchPhone.length < 9) {
      alert("Введите правильный номер телефона");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        searchName: name.toLowerCase(),
        phone: phone,
        searchPhone: searchPhone,
        email: form.email,
        photoURL: "",
        createdAt: serverTimestamp(),
      });

      alert("Регистрация прошла успешно");
      navigate("/users");
    } catch (error) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        alert("Этот email уже зарегистрирован");
      } else if (error.code === "auth/weak-password") {
        alert("Пароль должен быть минимум 6 символов");
      } else {
        alert("Ошибка регистрации");
      }
    }
  };

  return (
    <section className={style.page}>
      <form className={style.container} onSubmit={handleRegister}>
        <h2>Регистрация</h2>

        <input
          type="text"
          name="name"
          placeholder="Ваше имя"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="tel"
          name="phone"
          placeholder="Телефон, например +996700123456"
          value={form.phone}
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
    </section>
  );
}

export default Register;