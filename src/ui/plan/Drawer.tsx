"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "../useT";

/** A side panel on the native <dialog>, so focus is trapped, Escape closes it and focus returns. */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useT();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={dialog} className="drawer" aria-label={title} onClose={onClose}>
      {open && (
        <>
          <button type="button" className="btn btn-quiet drawer-close" onClick={onClose}>
            {t("drawer.close")}
          </button>
          {children}
        </>
      )}
    </dialog>
  );
}
