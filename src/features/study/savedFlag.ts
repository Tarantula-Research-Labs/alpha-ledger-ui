import { useCallback, useEffect, useState } from "react";

/**
 * A yes/no setting kept in this browser (localStorage): a panel that is folded away, say. Starts false and reads the saved value
 * right after the first render; a browser that blocks storage simply forgets it.
 */
export function useSavedFlag(key: string): [boolean, (next: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(key) === "1");
    } catch {
      // storage blocked: the flag stays false
    }
  }, [key]);
  const set = useCallback(
    (next: boolean) => {
      setOn(next);
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // not saved; it still works until the page is closed
      }
    },
    [key],
  );
  return [on, set];
}
