import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import style from "../styles/Chat.module.css";

function Chat() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const chatId = useMemo(() => {
    if (!currentUser || !selectedUser) return null;

    return [currentUser.uid, selectedUser.uid].sort().join("_");
  }, [currentUser, selectedUser]);

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), orderBy("name"));

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs
        .map((doc) => doc.data())
        .filter((user) => user.uid !== currentUser.uid);

      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imageUrl.trim()) return;
    if (!selectedUser || !chatId) return;

    const chatRef = doc(db, "chats", chatId);

    await updateDoc(chatRef, {
      lastMessage: text || "Изображение",
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      await import("firebase/firestore").then(async ({ setDoc }) => {
        await setDoc(chatRef, {
          chatId,
          type: "private",
          members: [currentUser.uid, selectedUser.uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: text || "Изображение",
        });
      });
    });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUser.uid,
      receiverId: selectedUser.uid,
      text: text.trim(),
      imageUrl: imageUrl.trim(),
      createdAt: serverTimestamp(),
      updatedAt: null,
      isEdited: false,
    });

    setText("");
    setImageUrl("");
  };

  const handleDeleteMessage = async (messageId) => {
    if (!chatId) return;

    await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
  };

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditingText(message.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async (messageId) => {
    if (!editingText.trim()) return;

    await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
      text: editingText.trim(),
      updatedAt: serverTimestamp(),
      isEdited: true,
    });

    cancelEdit();
  };

  const handleLogout = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        status: "offline",
        lastSeen: serverTimestamp(),
      });

      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={style.page}>
      <aside className={style.sidebar}>
        <div className={style.sidebarHeader}>
          <h2>Messenger</h2>

          <div className={style.headerBtns}>
            <Link to="/profile">Профиль</Link>
            <button onClick={handleLogout}>Выйти</button>
          </div>
        </div>

        <h3>Пользователи</h3>

        <div className={style.usersList}>
          {users.map((user) => (
            <button
              key={user.uid}
              className={`${style.userCard} ${
                selectedUser?.uid === user.uid ? style.activeUser : ""
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className={style.avatar}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} />
                ) : (
                  <span>{user.name?.charAt(0)}</span>
                )}
              </div>

              <div>
                <h4>{user.name}</h4>
                <p className={user.status === "online" ? style.online : ""}>
                  {user.status === "online" ? "онлайн" : "офлайн"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className={style.chat}>
        {!selectedUser ? (
          <div className={style.emptyChat}>
            <h2>Выберите пользователя</h2>
            <p>Чтобы начать личный чат</p>
          </div>
        ) : (
          <>
            <div className={style.chatHeader}>
              <div className={style.avatar}>
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt={selectedUser.name} />
                ) : (
                  <span>{selectedUser.name?.charAt(0)}</span>
                )}
              </div>

              <div>
                <h3>{selectedUser.name}</h3>
                <p className={selectedUser.status === "online" ? style.online : ""}>
                  {selectedUser.status === "online" ? "онлайн" : "офлайн"}
                </p>
              </div>
            </div>

            <div className={style.messages}>
              {messages.map((message) => {
                const isMine = message.senderId === currentUser.uid;

                return (
                  <div
                    key={message.id}
                    className={`${style.message} ${
                      isMine ? style.myMessage : style.otherMessage
                    }`}
                  >
                    {message.imageUrl && (
                      <img
                        className={style.messageImage}
                        src={message.imageUrl}
                        alt="message"
                      />
                    )}

                    {editingId === message.id ? (
                      <div className={style.editBox}>
                        <input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />

                        <div>
                          <button onClick={() => saveEdit(message.id)}>
                            Сохранить
                          </button>
                          <button onClick={cancelEdit}>Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.text && <p>{message.text}</p>}

                        {message.isEdited && (
                          <span className={style.edited}>изменено</span>
                        )}

                        {isMine && (
                          <div className={style.messageActions}>
                            {message.text && (
                              <button onClick={() => startEdit(message)}>
                                Изм.
                              </button>
                            )}

                            <button onClick={() => handleDeleteMessage(message.id)}>
                              Удал.
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <form className={style.sendForm} onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Сообщение..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <input
                type="text"
                placeholder="Ссылка на изображение..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />

              <button type="submit">Отправить</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default Chat;