import { useEffect, useId, useMemo, useState } from "react";

interface EditorListKeyState {
  keys: string[];
  nextKey: number;
}

export function useEditorListKeys(itemCount: number) {
  const prefix = useId();
  const [state, setState] = useState<EditorListKeyState>(() => ({
    keys: Array.from({ length: itemCount }, (_, index) => `${prefix}-${index}`),
    nextKey: itemCount,
  }));

  const visibleKeys = useMemo(() => {
    if (state.keys.length >= itemCount) return state.keys.slice(0, itemCount);
    return [
      ...state.keys,
      ...Array.from(
        { length: itemCount - state.keys.length },
        (_, offset) => `${prefix}-${state.nextKey + offset}`,
      ),
    ];
  }, [itemCount, prefix, state]);

  useEffect(() => {
    setState((current) => {
      if (current.keys.length === itemCount) return current;
      if (current.keys.length > itemCount) {
        return { ...current, keys: current.keys.slice(0, itemCount) };
      }
      const addedKeys = Array.from(
        { length: itemCount - current.keys.length },
        (_, offset) => `${prefix}-${current.nextKey + offset}`,
      );
      return {
        keys: [...current.keys, ...addedKeys],
        nextKey: current.nextKey + addedKeys.length,
      };
    });
  }, [itemCount, prefix]);

  return {
    at(index: number) {
      return visibleKeys[index];
    },
    append() {
      setState((current) => ({
        keys: [...current.keys, `${prefix}-${current.nextKey}`],
        nextKey: current.nextKey + 1,
      }));
    },
    remove(index: number) {
      setState((current) => ({
        ...current,
        keys: [
          ...current.keys.slice(0, index),
          ...current.keys.slice(index + 1),
          current.keys[index],
        ].filter((key): key is string => key !== undefined),
      }));
    },
  };
}
