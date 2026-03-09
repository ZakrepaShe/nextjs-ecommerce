"use client";

import { useState, useCallback } from "react";
import { ConfirmModal } from "./ConfirmModal";

type OpenModalOptions = {
  message: string;
  onConfirm: () => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmModalState = OpenModalOptions & { isOpen: boolean };

const CLOSED_STATE: ConfirmModalState = {
  isOpen: false,
  message: "",
  onConfirm: () => {},
};

export function useConfirmModal() {
  const [state, setState] = useState<ConfirmModalState>(CLOSED_STATE);

  const openModal = useCallback((options: OpenModalOptions) => {
    setState({ ...options, isOpen: true });
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const modalJsx = (
    <ConfirmModal
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={() => {
        state.onConfirm();
        closeModal();
      }}
      onCancel={closeModal}
    />
  );

  return { modalJsx, openModal, closeModal };
}
