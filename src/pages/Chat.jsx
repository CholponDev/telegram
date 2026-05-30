import React, { useEffect, useMemo, useState, useRef } from "react";
import { signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import style from "../styles/Chat.module.css";

function Chat() {
  const [isRecording, setIsRecording] = useState(false);
const [recordingTime, setRecordingTime] = useState(0);

const [voiceData, setVoiceData] = useState("");
const [voiceType, setVoiceType] = useState("");
const [voiceDuration, setVoiceDuration] = useState(0);

const mediaRecorderRef = useRef(null);
const audioChunksRef = useRef([]);
const streamRef = useRef(null);
const timerRef = useRef(null);
const recordingSecondsRef = useRef(0);

  const [contacts, setContacts] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [editingMessage, setEditingMessage] = useState(null);

  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    photoURL: "",
  });

  const selectedPartner = useMemo(() => {
    if (!selectedChat || !currentUser) return null;

    const partnerId = selectedChat.members?.find(
      (id) => id !== currentUser.uid
    );

    return selectedChat.users?.[partnerId] || null;
  }, [selectedChat, currentUser]);

  const normalizePhone = (phone) => {
    return String(phone || "").replace(/\D/g, "");
  };

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isImageUrl = (url) => {
    if (!url) return false;

    const cleanUrl = url.split("?")[0].toLowerCase();

    return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(cleanUrl);
  };

  const getAudioMimeType = () => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
};

const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  return `${min}:${String(sec).padStart(2, "0")}`;
};

const stopMicrophone = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
};

const stopTimer = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};

const handleStartRecording = async () => {
  if (isRecording) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Ваш браузер не поддерживает запись голоса");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    streamRef.current = stream;
    audioChunksRef.current = [];

    const mimeType = getAudioMimeType();

    const recorderOptions = mimeType
      ? {
          mimeType,
          audioBitsPerSecond: 32000,
        }
      : {
          audioBitsPerSecond: 32000,
        };

    const mediaRecorder = new MediaRecorder(stream, recorderOptions);

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (audioBlob.size > 700000) {
          alert("Голосовое слишком длинное. Запишите короче.");
          setVoiceData("");
          setVoiceType("");
          setVoiceDuration(0);
          return;
        }

        const base64Audio = await blobToBase64(audioBlob);

        setVoiceData(base64Audio);
        setVoiceType(audioBlob.type);
        setVoiceDuration(recordingSecondsRef.current);
      } catch (error) {
        console.error("Ошибка обработки голосового:", error);
        alert("Голосовое не сохранилось");
      } finally {
        stopMicrophone();
        stopTimer();
      }
    };

    recordingSecondsRef.current = 0;
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingTime(recordingSecondsRef.current);

      if (recordingSecondsRef.current >= 30) {
        handleStopRecording();
      }
    }, 1000);

    mediaRecorder.start();
    setIsRecording(true);
  } catch (error) {
    console.error("Ошибка доступа к микрофону:", error);
    alert("Разрешите доступ к микрофону");
    stopMicrophone();
    stopTimer();
  }
};

const handleStopRecording = () => {
  if (!mediaRecorderRef.current) return;

  if (mediaRecorderRef.current.state !== "inactive") {
    mediaRecorderRef.current.stop();
  }

  setIsRecording(false);
  stopTimer();
};

const handleRemoveVoice = () => {
  setVoiceData("");
  setVoiceType("");
  setVoiceDuration(0);
};

  const getUserName = (user) => {
    return (
      user?.name ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Пользователь"
    );
  };

  const getUserPhoto = (user) => {
    return user?.photoURL || "";
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setMyProfile({
          uid: user.uid,
          ...data,
        });

        setProfileForm({
          name: data.name || data.displayName || user.displayName || "",
          phone: data.phone || "",
          photoURL: data.photoURL || user.photoURL || "",
        });
      } else {
        const newUser = {
          uid: user.uid,
          name: user.displayName || "Пользователь",
          nameLower: (user.displayName || "Пользователь").toLowerCase(),
          email: user.email || "",
          phone: "",
          phoneClean: "",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
        };

        await setDoc(userRef, newUser);

        setMyProfile(newUser);

        setProfileForm({
          name: newUser.name,
          phone: "",
          photoURL: "",
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const list = snapshot.docs.map((chatDoc) => ({
        id: chatDoc.id,
        ...chatDoc.data(),
      }));

      list.sort((a, b) => {
        const aTime = a.lastMessageAt?.seconds || 0;
        const bTime = b.lastMessageAt?.seconds || 0;
        return bTime - aTime;
      });

      setChats(list);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
  if (!currentUser) return;

  const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
    const list = snapshot.docs
      .map((userDoc) => ({
        uid: userDoc.id,
        ...userDoc.data(),
      }))
      .filter((user) => user.uid !== currentUser.uid);

    setContacts(list);
  });

  return () => unsubscribe();
}, [currentUser]);

  useEffect(() => {
    if (!selectedChat?.id) return;

    const messagesQuery = query(
      collection(db, "chats", selectedChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));

      setMessages(list);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const handleSearchUser = async () => {
    const value = searchValue.trim();

    if (!value) {
      setSearchResults([]);
      return;
    }

    if (!currentUser) return;

    try {
      const usersRef = collection(db, "users");

      const resultMap = new Map();

      const emailQuery = query(
        usersRef,
        where("email", "==", value.toLowerCase()),
        limit(10)
      );

      const phoneQuery = query(
        usersRef,
        where("phone", "==", value),
        limit(10)
      );

      const phoneCleanQuery = query(
        usersRef,
        where("phoneClean", "==", normalizePhone(value)),
        limit(10)
      );

      const nameQuery = query(
        usersRef,
        where("nameLower", "==", value.toLowerCase()),
        limit(10)
      );

      const snapshots = await Promise.all([
        getDocs(emailQuery),
        getDocs(phoneQuery),
        getDocs(phoneCleanQuery),
        getDocs(nameQuery),
      ]);

      snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((userDoc) => {
          const data = {
            uid: userDoc.id,
            ...userDoc.data(),
          };

          if (data.uid !== currentUser.uid) {
            resultMap.set(data.uid, data);
          }
        });
      });

      setSearchResults(Array.from(resultMap.values()));
    } catch (error) {
      console.error("Ошибка поиска пользователя:", error);
      alert("Ошибка поиска пользователя");
    }
  };

  const handleStartChat = async (partner) => {
    if (!currentUser || !partner?.uid) return;

    try {
      const members = [currentUser.uid, partner.uid].sort();
      const chatId = `${members[0]}_${members[1]}`;

      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      const myUserData = {
        uid: currentUser.uid,
        name:
          myProfile?.name ||
          myProfile?.displayName ||
          currentUser.displayName ||
          "Пользователь",
        email: currentUser.email || "",
        phone: myProfile?.phone || "",
        photoURL: myProfile?.photoURL || currentUser.photoURL || "",
      };

      const partnerData = {
        uid: partner.uid,
        name: partner.name || partner.displayName || "Пользователь",
        email: partner.email || "",
        phone: partner.phone || "",
        photoURL: partner.photoURL || "",
      };

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          members,
          users: {
            [currentUser.uid]: myUserData,
            [partner.uid]: partnerData,
          },
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }

      const openedChat = {
        id: chatId,
        members,
        users: {
          [currentUser.uid]: myUserData,
          [partner.uid]: partnerData,
        },
      };

      setSelectedChat(openedChat);
      setSearchResults([]);
      setSearchValue("");
    } catch (error) {
      console.error("Ошибка создания чата:", error);
      alert("Чат не открылся");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const cleanText = text.trim();
    const cleanImageUrl = imageUrl.trim();

    if (!cleanText && !cleanImageUrl && !voiceData) return;
    if (!currentUser || !selectedChat?.id) return;

    if (cleanImageUrl && !isValidUrl(cleanImageUrl)) {
      alert("Вставьте правильную ссылку. Например: https://site.com/photo.jpg");
      return;
    }

    try {
      if (editingMessage) {
        const messageRef = doc(
          db,
          "chats",
          selectedChat.id,
          "messages",
          editingMessage.id
        );

        await updateDoc(messageRef, {
          text: cleanText,
          imageUrl: cleanImageUrl,
          edited: true,
          updatedAt: serverTimestamp(),
        });

        setEditingMessage(null);
      } else {
        await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
  text: cleanText,
  imageUrl: cleanImageUrl,
  voiceData: voiceData || "",
  voiceType: voiceType || "",
  voiceDuration: voiceDuration || 0,
  senderId: currentUser.uid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});


        const lastMessageText = cleanText
    ? cleanText
    : cleanImageUrl
    ? "Изображение"
    : voiceData
    ? "Голосовое сообщение"
    : "Сообщение";


        await updateDoc(doc(db, "chats", selectedChat.id), {
          lastMessage: cleanText || "Изображение",
          lastMessageAt: serverTimestamp(),
        });
      }

      setText("");
setImageUrl("");
setShowImageInput(false);
setVoiceData("");
setVoiceType("");
setVoiceDuration(0);
    } 
    
    catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      alert("Сообщение не отправлено");
    }
  };

  const handleEditMessage = (message) => {
    if (message.senderId !== currentUser.uid) return;

    setEditingMessage(message);
    setText(message.text || "");
    setImageUrl(message.imageUrl || "");

    if (message.imageUrl) {
      setShowImageInput(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setText("");
    setImageUrl("");
    setShowImageInput(false);
  };

  const handleDeleteMessage = async (message) => {
    if (!selectedChat?.id) return;
    if (message.senderId !== currentUser.uid) return;

    const confirmDelete = window.confirm("Удалить сообщение?");

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "chats", selectedChat.id, "messages", message.id));
    } catch (error) {
      console.error("Ошибка удаления сообщения:", error);
      alert("Сообщение не удалилось");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!currentUser) return;

    try {
      const userRef = doc(db, "users", currentUser.uid);

      const updatedUser = {
        name: profileForm.name.trim() || "Пользователь",
        displayName: profileForm.name.trim() || "Пользователь",
        nameLower: (profileForm.name.trim() || "Пользователь").toLowerCase(),
        email: currentUser.email || "",
        phone: profileForm.phone.trim(),
        phoneClean: normalizePhone(profileForm.phone),
        photoURL: profileForm.photoURL.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updatedUser);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updatedUser.name,
          photoURL: updatedUser.photoURL,
        });
      }

      setMyProfile((prev) => ({
        ...prev,
        ...updatedUser,
      }));

      setShowProfile(false);
    } catch (error) {
      console.error("Ошибка сохранения профиля:", error);
      alert("Профиль не сохранился");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Ошибка выхода:", error);
    }
  };

  if (!currentUser) {
    return (
      <div className={style.loading}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={style.chatPage}>
      <aside className={style.sidebar}>
        <div className={style.searchBlock}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchUser();
              }
            }}
            placeholder="Поиск по email, телефону или имени"
            className={style.searchInput}
          />

          <button
            type="button"
            onClick={handleSearchUser}
            className={style.searchBtn}
          >
            Поиск
          </button>
        </div>

       <div className={style.sidebarScroll}>
  {searchResults.length > 0 && (
    <>
      <div className={style.blockTitle}>
        <span>Результаты поиска</span>
        <small>{searchResults.length}</small>
      </div>

      <div className={style.searchResults}>
        {searchResults.map((user) => (
          <button
            key={user.uid}
            type="button"
            onClick={() => handleStartChat(user)}
            className={style.searchUser}
          >
            <div className={style.avatar}>
              {getUserPhoto(user) ? (
                <img src={getUserPhoto(user)} alt={getUserName(user)} />
              ) : (
                <span>{getUserName(user).charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div>
              <h4>{getUserName(user)}</h4>
              <p>{user.email || user.phone}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  )}

  <div className={style.blockTitle}>
    <span>Чаты</span>
    <small>{chats.length}</small>
  </div>

  <div className={style.chatList}>
    {chats.map((chat) => {
      const partnerId = chat.members?.find((id) => id !== currentUser.uid);
      const partner = chat.users?.[partnerId];

      return (
        <button
          key={chat.id}
          type="button"
          onClick={() => setSelectedChat(chat)}
          className={`${style.chatItem} ${
            selectedChat?.id === chat.id ? style.activeChat : ""
          }`}
        >
          <div className={style.avatar}>
            {getUserPhoto(partner) ? (
              <img src={getUserPhoto(partner)} alt={getUserName(partner)} />
            ) : (
              <span>{getUserName(partner).charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className={style.chatInfo}>
            <h4>{getUserName(partner)}</h4>
            <p>{chat.lastMessage || "Нет сообщений"}</p>
          </div>
        </button>
      );
    })}
  </div>

  <div className={style.blockTitle}>
    <span>Контакты</span>
    <small>{contacts.length}</small>
  </div>

  <div className={style.contactList}>
    {contacts.map((user) => (
      <button
        key={user.uid}
        type="button"
        onClick={() => handleStartChat(user)}
        className={style.contactItem}
      >
        <div className={style.avatarSmall}>
          {getUserPhoto(user) ? (
            <img src={getUserPhoto(user)} alt={getUserName(user)} />
          ) : (
            <span>{getUserName(user).charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className={style.contactInfo}>
          <h3>{getUserName(user)}</h3>
          <p>{user.email || user.phone || "Пользователь"}</p>
        </div>
      </button>
    ))}

    {contacts.length === 0 && (
      <p className={style.emptyText}>Контактов пока нет</p>
    )}
  </div>
</div>

<div className={style.profileBottom}>
  <button
    type="button"
    className={style.profileSideBtn}
    onClick={() => setShowProfile(true)}
  >
    <div className={style.profileAvatar}>
      {myProfile?.photoURL ? (
        <img src={myProfile.photoURL} alt={getUserName(myProfile)} />
      ) : (
        <span>{getUserName(myProfile).charAt(0).toUpperCase()}</span>
      )}
    </div>

    <div className={style.profileText}>
      <h3>{getUserName(myProfile)}</h3>
      <p>Открыть профиль</p>
    </div>
  </button>
</div>

        <div className={style.chatList}>
          {chats.map((chat) => {
            const partnerId = chat.members?.find(
              (id) => id !== currentUser.uid
            );

            const partner = chat.users?.[partnerId];

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => setSelectedChat(chat)}
                className={`${style.chatItem} ${
                  selectedChat?.id === chat.id ? style.activeChat : ""
                }`}
              >
                <div className={style.avatar}>
                  {getUserPhoto(partner) ? (
                    <img src={getUserPhoto(partner)} alt={getUserName(partner)} />
                  ) : (
                    <span>
                      {getUserName(partner).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className={style.chatInfo}>
                  <h4>{getUserName(partner)}</h4>
                  <p>{chat.lastMessage || "Нет сообщений"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className={style.chatMain}>
        {selectedChat ? (
          <>
            <header className={style.chatHeader}>
              <div className={style.headerUser}>
                <div className={style.avatar}>
                  {getUserPhoto(selectedPartner) ? (
                    <img
                      src={getUserPhoto(selectedPartner)}
                      alt={getUserName(selectedPartner)}
                    />
                  ) : (
                    <span>
                      {getUserName(selectedPartner).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <h3>{getUserName(selectedPartner)}</h3>
                  <p>{selectedPartner?.email || selectedPartner?.phone}</p>
                </div>
              </div>

              <button
                type="button"
                className={style.profileBtn}
                onClick={() => setShowProfile(true)}
              >
                Профиль
              </button>
            </header>

            <section className={style.messages}>
              {messages.map((message) => {
                const isMine = message.senderId === currentUser.uid;

                return (
                  <div
                    key={message.id}
                    className={isMine ? style.myMessage : style.otherMessage}
                  >
                    {message.text && <p>{message.text}</p>}

                    {message.voiceData && (
  <div className={style.voiceMessage}>
    <audio controls src={message.voiceData}></audio>

    {message.voiceDuration > 0 && (
      <span>{formatTime(message.voiceDuration)}</span>
    )}
  </div>
)}

                    {message.imageUrl && isImageUrl(message.imageUrl) && (
                      <a
                        href={message.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={message.imageUrl}
                          alt="Изображение"
                          className={style.messageImage}
                        />
                      </a>
                    )}

                    {message.imageUrl && !isImageUrl(message.imageUrl) && (
                      <a
                        href={message.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={style.messageLink}
                      >
                        Открыть ссылку
                      </a>
                    )}

                    {message.voiceData && (
          <div className={style.voiceMessage}>
            <audio controls src={message.voiceData}></audio>

            {message.voiceDuration > 0 && (
              <span>{formatTime(message.voiceDuration)}</span>
            )}
          </div>
        )}

                    {message.edited && (
                      <small className={style.editedText}>изменено</small>
                    )}

                    {isMine && (
                      <div className={style.messageActions}>
                        <button
                          type="button"
                          onClick={() => handleEditMessage(message)}
                        >
                          Изменить
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message)}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <form className={style.messageForm} onSubmit={handleSendMessage}>
              {editingMessage && (
                <div className={style.editBox}>
                  <span>Редактирование сообщения</span>

                  <button type="button" onClick={handleCancelEdit}>
                    Отмена
                  </button>
                </div>
              )}

              {showImageInput && (
                <div className={style.imageUrlBox}>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Вставьте ссылку на изображение..."
                    className={style.imageUrlInput}
                  />
                </div>
              )}

              {isRecording && (
  <div className={style.recordingBox}>
    <span>Запись...</span>
    <strong>{formatTime(recordingTime)}</strong>
  </div>
)}

{voiceData && !isRecording && (
  <div className={style.voicePreview}>
    <audio controls src={voiceData}></audio>

    <span>{formatTime(voiceDuration)}</span>

    <button type="button" onClick={handleRemoveVoice}>
      Удалить
    </button>
  </div>
)}

              <button
                type="button"
                className={style.moreBtn}
                onClick={() => setShowImageInput((prev) => !prev)}
              >
                +
              </button>

              <button
  type="button"
  className={`${style.voiceBtn} ${isRecording ? style.recordingBtn : ""}`}
  onClick={isRecording ? handleStopRecording : handleStartRecording}
>
  {isRecording ? "■" : "🎤"}
</button>

              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Напишите сообщение..."
                className={style.messageInput}
              />

              <button type="submit" className={style.sendBtn}>
                {editingMessage ? "Сохранить" : "Отправить"}
              </button>
            </form>
          </>
        ) : (
          <div className={style.emptyChat}>
            <h2>Выберите чат</h2>
            <p>Или найдите пользователя через поиск.</p>
          </div>
        )}
      </main>

      {showProfile && (
        <div className={style.modalOverlay}>
          <div className={style.profileModal}>
            <button
              type="button"
              className={style.closeBtn}
              onClick={() => setShowProfile(false)}
            >
              ×
            </button>

            <h2>Мой профиль</h2>

            <form onSubmit={handleSaveProfile} className={style.profileForm}>
              <label>
                Имя
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Ваше имя"
                />
              </label>

              <label>
                Телефон
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="+996..."
                />
              </label>

              <label>
                Ссылка на фото
                <input
                  type="text"
                  value={profileForm.photoURL}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      photoURL: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </label>

              <button type="submit" className={style.saveProfileBtn}>
                Сохранить
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className={style.logoutBtn}
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;