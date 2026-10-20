"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadBitmap } from "@/lib/image";

export interface Img {
  id: string;
  file: File;
  bitmap: ImageBitmap;
  thumb: string;
}

let n = 0;

/** Holds a list of opened pictures that can be reordered and removed. */
export function useImages(multiple = true) {
  const [items, setItems] = useState<Img[]>([]);
  const [error, setError] = useState("");
  const all = useRef<string[]>([]);

  const add = useCallback(
    async (files: File[]) => {
      setError("");
      const made: Img[] = [];
      for (const file of files) {
        try {
          const bitmap = await loadBitmap(file);
          const thumb = URL.createObjectURL(file);
          all.current.push(thumb);
          made.push({ id: `i${++n}`, file, bitmap, thumb });
        } catch {
          setError(`Could not read ${file.name}.`);
        }
      }
      if (made.length) setItems((prev) => (multiple ? [...prev, ...made] : made.slice(0, 1)));
    },
    [multiple],
  );

  const remove = useCallback((id: string) => setItems((p) => p.filter((i) => i.id !== id)), []);
  const move = useCallback(
    (id: string, dir: -1 | 1) =>
      setItems((p) => {
        const i = p.findIndex((x) => x.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= p.length) return p;
        const c = p.slice();
        [c[i], c[j]] = [c[j], c[i]];
        return c;
      }),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  useEffect(() => {
    const urls = all.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  return { items, add, remove, move, clear, error, setError };
}
