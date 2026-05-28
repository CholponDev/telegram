import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Users.module.css";

function Users() {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getPhoneDigits = (value) => {
    return value.replace(/\D/g, "");
  };

  const isPhoneSearch = (value) => {
    return /\d/.test(value) && !/[a-zа-яё]/i.test(value);
  };

  const handleSearch = useCallback(async () => {
    const value = searchText.trim().toLowerCase();
    const digits = getPhoneDigits(value);

    setLoading(true);
    setError("");

    try {
      const usersRef = collection(db, "users");

      let q;

      if (!value) {
        q = query(usersRef, orderBy("searchName"), limit(20));
      } else if (isPhoneSearch(value)) {
        q = query(
          usersRef,
          orderBy("searchPhone"),
          startAt(digits),
          endAt(digits + "\uf8ff"),
          limit(20)
        );
      } else {
        q = query(
          usersRef,
          orderBy("searchName"),
          startAt(value),
          endAt(value + "\uf8ff"),
          limit(20)
        );
      }

      const snapshot = await getDocs(q);

      const currentUserId = auth.currentUser?.uid;

      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((user) => user.id !== currentUserId);

      setUsers(data);
    } catch (err) {
      console.error(err);
      setError("Ошибка при поиске контактов");
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const startChat = useCallback(
    (user) => {
      navigate(`/chat/${user.id}`);
    },
    [navigate]
  );

  return (
    <section className={style.page}>
      <div className={style.container}>
        <div className={style.header}>
          <h1>Контакты</h1>
          <p>Найдите друга по имени или номеру телефона.</p>
        </div>

        <div className={style.searchBox}>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Имя или телефон..."
          />

          <button type="button" onClick={handleSearch} disabled={loading}>
            {loading ? "Поиск..." : "Поиск"}
          </button>
        </div>

        {error && <p className={style.error}>{error}</p>}

        <div className={style.list}>
          {users.map((user) => (
            <div className={style.card} key={user.id}>
              <div className={style.avatar}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} loading="lazy" />
                ) : (
                  <span>{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>

              <div className={style.info}>
                <h3>{user.name || "Без имени"}</h3>
                <p>{user.phone || user.email}</p>
              </div>

              <button
                type="button"
                className={style.chatBtn}
                onClick={() => startChat(user)}
              >
                Начать чат
              </button>
            </div>
          ))}
        </div>

        {!loading && users.length === 0 && (
          <p className={style.empty}>Контакты пока не найдены</p>
        )}
      </div>
    </section>
  );
}

export default Users;