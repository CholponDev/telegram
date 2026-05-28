import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  endAt,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Chat.module.css";

function Chat() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const [contactsLoading, setContactsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  const chatId = useMemo(() => {
    if (!currentUser?.uid || !selectedUser?.id) return null;

    return [currentUser.uid, selectedUser.id].sort().join("_");
  }, [currentUser, selectedUser]);

  const getPhoneDigits = (value) => {
    return value.replace(/\D/g, "");
  };

  const isPhoneSearch = (value) => {
    return /\d/.test(value) && !/[a-zа-яё]/i.test(value);
  };

  const createChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadContacts = useCallback(
    async (value = "") => {
      if (!currentUser?.uid) return;

      setContactsLoading(true);
      setError("");

      try {
        const usersRef = collection(db, "users");

        const searchValue = value.trim().toLowerCase();
        const digits = getPhoneDigits(searchValue);

        let q;

        if (!searchValue) {
          q = query(usersRef, orderBy("searchName"), limit(20));
        } else if (isPhoneSearch(searchValue)) {
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
            startAt(searchValue),
            endAt(searchValue + "\uf8ff"),
            limit(20)
          );
        }

        const snapshot = await getDocs(q);

        const data = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((user) => user.id !== currentUser.uid);

        setContacts(data);
      } catch (err) {
        console.error(err);
        setError("Ошибка при загрузке контактов");
      } finally {
        setContactsLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (currentUser?.uid) {
      loadContacts();
    }
  }, [currentUser, loadContacts]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    const messagesRef = collection(db, "chats", chatId, "messages");

    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setMessages(data);
        setMessagesLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Ошибка при загрузке сообщений");
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  const handleSearch = useCallback(() => {
    loadContacts(searchText);
  }, [loadContacts, searchText]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectUser = async (user) => {
    if (!currentUser?.uid) return;

    setSelectedUser(user);

    const newChatId = createChatId(currentUser.uid, user.id);

    await setDoc(
      doc(db, "chats", newChatId),
      {
        chatId: newChatId,
        participants: [currentUser.uid, user.id],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const text = messageText.trim();

    if (!text || !chatId || !currentUser?.uid || !selectedUser?.id) return;

    setMessageText("");

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text,
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          chatId,
          participants: [currentUser.uid, selectedUser.id],
          lastMessage: text,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      setError("Ошибка при отправке сообщения");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <section className={style.page}>
      <aside className={style.sidebar}>
        <div className={style.sidebarHeader}>
          <div>
            <h2>Контакты</h2>
            <p>Найдите друга и начните чат</p>
          </div>

          <button className={style.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
        </div>

        <div className={style.searchBox}>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Имя или телефон..."
          />

          <button type="button" onClick={handleSearch}>
            {contactsLoading ? "..." : "Поиск"}
          </button>
        </div>

        {error && <p className={style.error}>{error}</p>}

        <div className={style.contactsList}>
          {contacts.map((user) => (
            <button
              key={user.id}
              className={`${style.contactCard} ${
                selectedUser?.id === user.id ? style.activeContact : ""
              }`}
              onClick={() => handleSelectUser(user)}
            >
              <div className={style.avatar}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} loading="lazy" />
                ) : (
                  <span>{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>

              <div className={style.contactInfo}>
                <h3>{user.name || "Без имени"}</h3>
                <p>{user.phone || user.email}</p>
              </div>
            </button>
          ))}

          {!contactsLoading && contacts.length === 0 && (
            <p className={style.empty}>Контакты не найдены</p>
          )}
        </div>
      </aside>

      <main className={style.chat}>
        {!selectedUser ? (
          <div className={style.noChat}>
            <h2>Выберите контакт</h2>
            <p>Слева найдите пользователя и откройте переписку.</p>
          </div>
        ) : (
          <>
            <div className={style.chatHeader}>
              <div className={style.avatar}>
                {selectedUser.photoURL ? (
                  <img
                    src={selectedUser.photoURL}
                    alt={selectedUser.name}
                    loading="lazy"
                  />
                ) : (
                  <span>
                    {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
              </div>

              <div>
                <h2>{selectedUser.name || "Без имени"}</h2>
                <p>{selectedUser.phone || selectedUser.email}</p>
              </div>
            </div>

            <div className={style.messages}>
              {messagesLoading && (
                <p className={style.loading}>Загрузка сообщений...</p>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${style.message} ${
                    message.senderId === currentUser?.uid
                      ? style.myMessage
                      : style.friendMessage
                  }`}
                >
                  <p>{message.text}</p>
                </div>
              ))}

              {!messagesLoading && messages.length === 0 && (
                <p className={style.emptyMessages}>
                  Сообщений пока нет. Напишите первым.
                </p>
              )}
            </div>

            <form className={style.messageForm} onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Напишите сообщение..."
              />

              <button type="submit">Отправить</button>
            </form>
          </>
        )}
      </main>
    </section>
  );
}

export default Chat;