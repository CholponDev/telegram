import { memo } from "react";
import style from "../styles/UserCard.module.css";

function UserCard({ user, onOpenChat }) {
  return (
    <button className={style.card} onClick={() => onOpenChat(user)}>
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.name}
          className={style.avatar}
          loading="lazy"
        />
      ) : (
        <div className={style.avatarPlaceholder}>
          {user.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}

      <div className={style.info}>
        <h3>{user.name || "Без имени"}</h3>
        <p>{user.email}</p>
      </div>
    </button>
  );
}

export default memo(UserCard);