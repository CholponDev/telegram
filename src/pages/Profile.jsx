import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import style from "../styles/Profile.module.css";

function Profile() {
  const { currentUser } = useAuth();

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const getUserData = async () => {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setName(data.name || "");
        setAvatarUrl(data.avatarUrl || "");
        setEmail(data.email || "");
      }
    };

    getUserData();
  }, [currentUser.uid]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: avatarUrl,
      });

      await updateDoc(doc(db, "users", currentUser.uid), {
        name,
        avatarUrl,
      });

      setMessage("Профиль обновлён");
    } catch (error) {
      console.error(error);
      setMessage("Ошибка обновления профиля");
    }
  };

  return (
    <div className={style.page}>
      <form className={style.card} onSubmit={handleUpdateProfile}>
        <Link to="/chat" className={style.back}>
          Назад в чат
        </Link>

        <h2>Профиль</h2>

        <div className={style.avatarBox}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" />
          ) : (
            <span>{name?.charAt(0)}</span>
          )}
        </div>

        {message && <p className={style.message}>{message}</p>}

        <label>Email</label>
        <input value={email} disabled />

        <label>Имя</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите имя"
        />

        <label>Ссылка на аватарку</label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />

        <button type="submit">Сохранить</button>
      </form>
    </div>
  );
}

export default Profile;