import { useId, useRef } from "react";

export function useEditorListKeys(itemCount: number) {
  const prefix = useId();
  const nextKey = useRef(0);
  const keys = useRef<string[]>([]);

  while (keys.current.length < itemCount) {
    keys.current.push(`${prefix}-${nextKey.current}`);
    nextKey.current += 1;
  }
  if (keys.current.length > itemCount) keys.current.length = itemCount;

  return {
    at(index: number) {
      return keys.current[index];
    },
    append() {
      keys.current.push(`${prefix}-${nextKey.current}`);
      nextKey.current += 1;
    },
    remove(index: number) {
      keys.current.splice(index, 1);
    },
  };
}
