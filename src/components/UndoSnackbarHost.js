import React, { useEffect, useRef, useState } from 'react';
import { subscribeUndo } from '../utils/undoBus';
import UndoSnackbar from './UndoSnackbar';

const AUTO_HIDE_MS = 5000;

export default function UndoSnackbarHost() {
  const [current, setCurrent] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return subscribeUndo((payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(payload);
      timerRef.current = setTimeout(() => setCurrent(null), AUTO_HIDE_MS);
    });
  }, []);

  if (!current) return null;

  return (
    <UndoSnackbar
      visible={!!current}
      onUndo={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        current.onUndo && current.onUndo();
        setCurrent(null);
      }}
    />
  );
}
