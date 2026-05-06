"use client";

import { useCallback, useRef, useState } from "react";

type ConfirmOptions = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; options: ConfirmOptions }>({
    open: false,
    options: { message: "" },
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
    const options = typeof messageOrOptions === "string" ? { message: messageOrOptions } : messageOrOptions;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolveRef.current?.(false);
  }, []);

  return {
    confirm,
    confirmDialogProps: {
      open: state.open,
      message: state.options.message,
      confirmLabel: state.options.confirmLabel,
      cancelLabel: state.options.cancelLabel,
      danger: state.options.danger,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
