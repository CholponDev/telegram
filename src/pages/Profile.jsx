import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Profile.module.css";

function Profile() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    photoURL: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const onlyDigits = (value) => {
    return value.replace(/\D/g, "");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setForm({
            name: data.name || user.displayName || "",
            phone: data.phone || "",
            photoURL: data.photoURL || user.photoURL || "",
            email: data.email || user.email || "",
          });
        } else {
          setForm({
            name: user.displayName || "",
            phone: "",
            photoURL: user.photoURL || "",
            email: user.email || "",
          });
        }
      } catch (error) {
        console.error(error);
        alert("Ошибка при загрузке профиля");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!currentUser) return;

    const name = form.name.trim();
    const phone = form.phone.trim();
    const photoURL = form.photoURL.trim();

    if (!name) {
      alert("Введите имя");
      return;
    }

    setSaving(true);

    try {
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: photoURL,
      });

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          name: name,
          searchName: name.toLowerCase(),
          phone: phone,
          phoneDigits: onlyDigits(phone),
          searchPhone: onlyDigits(phone),
          photoURL: photoURL,
          email: currentUser.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Профиль обновлён");
      navigate("/chat");
    } catch (error) {
      console.error(error);
      alert("Ошибка при сохранении профиля");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Ошибка при выходе");
    }
  };

  if (loading) {
    return <div className={style.loading}>Загрузка профиля...</div>;
  }

  return (
    <section className={style.page}>
      <div className={style.card}>
        <button className={style.backBtn} onClick={() => navigate("/chat")}>
          ← Назад
        </button>

        <div className={style.profileTop}>
          <div className={style.avatar}>
            {form.photoURL ? (
              <img src={form.photoURL} alt={form.name} />
            ) : (
              <span>{form.name?.charAt(0)?.toUpperCase() || "U"}</span>
            )}
          </div>

          <h1>Мой профиль</h1>
          <p>Здесь можно изменить имя, телефон и фото</p>
        </div>

        <form className={style.form} onSubmit={handleSave}>
          <label>
            Имя
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ваше имя"
            />
          </label>

          <label>
            Телефон
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+996700123456"
            />
          </label>

          <label>
            Ссылка на фото
            <input
              type="text"
              name="photoURL"
              value={form.photoURL}
              onChange={handleChange}
              placeholder="https://..."
            />
          </label>

          <label>
            Email
            <input type="email" value={form.email} disabled />
          </label>

          <button className={style.saveBtn} type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>

        <button className={style.logoutBtn} onClick={handleLogout}>
          Выйти из аккаунта
        </button>
      </div>
    </section>
  );
}

export default Profile;