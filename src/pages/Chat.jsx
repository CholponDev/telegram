import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Chat.module.css";

function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [allContacts, setAllContacts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [chats, setChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  const makeChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  const normalize = (value = "") => {
    return value.toString().trim().toLowerCase();
  };

  const onlyDigits = (value = "") => {
    return value.toString().replace(/\D/g, "");
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
          setCurrentUserData({
            id: userSnap.id,
            ...userSnap.data(),
          });
        } else {
          setCurrentUserData({
            id: user.uid,
            name: user.displayName || "Пользователь",
            email: user.email,
            phone: "",
            photoURL: user.photoURL || "",
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadContacts = async () => {
      if (!currentUser?.uid) return;

      setLoadingContacts(true);
      setError("");

      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        const contacts = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((user) => user.id !== currentUser.uid);

        setAllContacts(contacts);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить контакты");
      } finally {
        setLoadingContacts(false);
      }
    };

    loadContacts();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        const sortedChats = data.sort((a, b) => {
          const timeA = a.updatedAt?.seconds || 0;
          const timeB = b.updatedAt?.seconds || 0;
          return timeB - timeA;
        });

        setChats(sortedChats);
      },
      (err) => {
        console.error(err);
        setError("Не удалось загрузить список чатов");
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);

    const messagesRef = collection(db, "chats", selectedChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setMessages(data);
        setLoadingMessages(false);
      },
      (err) => {
        console.error(err);
        setError("Не удалось загрузить сообщения");
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredContacts = useMemo(() => {
    const value = normalize(activeSearch);
    const digits = onlyDigits(activeSearch);

    if (!value) {
      return allContacts;
    }

    return allContacts.filter((user) => {
      const name = normalize(user.name);
      const email = normalize(user.email);
      const phone = onlyDigits(user.phone);

      return (
        name.includes(value) ||
        email.includes(value) ||
        phone.includes(digits)
      );
    });
  }, [activeSearch, allContacts]);

  const getOtherUserFromChat = useCallback(
    (chat) => {
      if (!currentUser?.uid) return null;

      const otherUserId = chat.participants?.find(
        (id) => id !== currentUser.uid
      );

      if (!otherUserId) return null;

      const fromContacts = allContacts.find((user) => user.id === otherUserId);

      if (fromContacts) {
        return fromContacts;
      }

      const fromChatInfo = chat.participantsInfo?.[otherUserId];

      return {
        id: otherUserId,
        name: fromChatInfo?.name || "Пользователь",
        phone: fromChatInfo?.phone || "",
        email: fromChatInfo?.email || "",
        photoURL: fromChatInfo?.photoURL || "",
      };
    },
    [allContacts, currentUser]
  );

  const handleSearch = () => {
    setActiveSearch(searchText);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectUser = async (user) => {
    if (!currentUser?.uid) return;

    const chatId = makeChatId(currentUser.uid, user.id);

    setSelectedUser(user);
    setSelectedChatId(chatId);

    try {
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          chatId,
          participants: [currentUser.uid, user.id],
          participantsInfo: {
            [currentUser.uid]: {
              name:
                currentUserData?.name ||
                currentUser.displayName ||
                "Пользователь",
              email: currentUserData?.email || currentUser.email || "",
              phone: currentUserData?.phone || "",
              photoURL: currentUserData?.photoURL || "",
            },
            [user.id]: {
              name: user.name || "Пользователь",
              email: user.email || "",
              phone: user.phone || "",
              photoURL: user.photoURL || "",
            },
          },
          lastMessage: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось открыть чат");
    }
  };

  const handleSelectChat = (chat) => {
    const otherUser = getOtherUserFromChat(chat);

    if (!otherUser) return;

    setSelectedUser(otherUser);
    setSelectedChatId(chat.id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const text = messageText.trim();

    if (!text || !selectedChatId || !currentUser?.uid || !selectedUser?.id) {
      return;
    }

    setMessageText("");

    try {
      await addDoc(collection(db, "chats", selectedChatId, "messages"), {
        text,
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "chats", selectedChatId),
        {
          lastMessage: text,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      setError("Не удалось отправить сообщение");
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
            <h2>Telegram</h2>
            <p>{currentUserData?.name || currentUser?.email}</p>
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
            placeholder="Поиск по имени, телефону..."
          />

          <button type="button" onClick={handleSearch}>
            Поиск
          </button>
        </div>

        {error && <p className={style.error}>{error}</p>}

        <div className={style.sidebarScroll}>
          <div className={style.blockTitle}>
            <span>Мои чаты</span>
            <small>{chats.length}</small>
          </div>

          <div className={style.chatList}>
            {chats.map((chat) => {
              const otherUser = getOtherUserFromChat(chat);

              if (!otherUser) return null;

              return (
                <button
                  key={chat.id}
                  className={`${style.chatItem} ${
                    selectedChatId === chat.id ? style.activeChat : ""
                  }`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className={style.avatar}>
                    {otherUser.photoURL ? (
                      <img
                        src={otherUser.photoURL}
                        alt={otherUser.name}
                        loading="lazy"
                      />
                    ) : (
                      <span>
                        {otherUser.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>

                  <div className={style.chatInfo}>
                    <div className={style.chatTop}>
                      <h3>{otherUser.name || "Пользователь"}</h3>
                    </div>

                    <p>{chat.lastMessage || "Нет сообщений"}</p>
                  </div>
                </button>
              );
            })}

            {chats.length === 0 && (
              <p className={style.emptyText}>Список чатов пока пустой</p>
            )}
          </div>

          <div className={style.blockTitle}>
            <span>Контакты</span>
            <small>{filteredContacts.length}</small>
          </div>

          <div className={style.contactList}>
            {loadingContacts && (
              <p className={style.emptyText}>Загрузка контактов...</p>
            )}

            {!loadingContacts &&
              filteredContacts.map((user) => (
                <button
                  key={user.id}
                  className={`${style.contactItem} ${
                    selectedUser?.id === user.id ? style.activeContact : ""
                  }`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className={style.avatarSmall}>
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

            {!loadingContacts && filteredContacts.length === 0 && (
              <p className={style.emptyText}>Контакт не найден</p>
            )}
          </div>
        </div>
      </aside>

      <main className={style.chatArea}>
        {!selectedUser ? (
          <div className={style.noChat}>
            <div className={style.noChatBox}>
              <h2>Выберите чат</h2>
              <p>Найдите контакт слева и начните переписку.</p>
            </div>
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
                <h2>{selectedUser.name || "Пользователь"}</h2>
                <p>{selectedUser.phone || selectedUser.email}</p>
              </div>
            </div>

            <div className={style.messages}>
              {loadingMessages && (
                <p className={style.emptyText}>Загрузка сообщений...</p>
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

              <div ref={messagesEndRef} />
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