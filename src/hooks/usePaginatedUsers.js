import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { useDebounce } from "./useDebounce";

const PAGE_SIZE = 10;

export function usePaginatedUsers(searchValue) {
  const debouncedSearch = useDebounce(searchValue.trim().toLowerCase(), 400);

  const [users, setUsers] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const buildQuery = useCallback(
    (cursor = null) => {
      const usersRef = collection(db, "users");

      if (debouncedSearch) {
        if (cursor) {
          return query(
            usersRef,
            orderBy("searchName"),
            startAfter(cursor),
            endAt(debouncedSearch + "\uf8ff"),
            limit(PAGE_SIZE)
          );
        }

        return query(
          usersRef,
          orderBy("searchName"),
          startAt(debouncedSearch),
          endAt(debouncedSearch + "\uf8ff"),
          limit(PAGE_SIZE)
        );
      }

      if (cursor) {
        return query(
          usersRef,
          orderBy("searchName"),
          startAfter(cursor),
          limit(PAGE_SIZE)
        );
      }

      return query(usersRef, orderBy("searchName"), limit(PAGE_SIZE));
    },
    [debouncedSearch]
  );

  useEffect(() => {
    const loadFirstPage = async () => {
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError("");
      setUsers([]);
      setLastDoc(null);
      setHasMore(true);

      try {
        const q = buildQuery(null);
        const snapshot = await getDocs(q);

        if (requestId !== requestIdRef.current) return;

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUsers(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
        setError("Ошибка при загрузке пользователей");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    loadFirstPage();
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !lastDoc) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const q = buildQuery(lastDoc);
      const snapshot = await getDocs(q);

      if (requestId !== requestIdRef.current) return;

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers((prev) => [...prev, ...data]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      setError("Ошибка при загрузке следующей страницы");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildQuery, hasMore, lastDoc, loading]);

  return {
    users,
    loading,
    error,
    hasMore,
    loadMore,
  };
}