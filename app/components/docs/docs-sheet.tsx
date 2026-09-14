/**
 * A slide-in panel on the native `<dialog>`, for the docs' phone navigation.
 *
 * collie builds its sheet on Radix. This site ships no UI library, and
 * `showModal()` already gives the parts that are hard to get right: a focus
 * trap, Escape to close, an inert page underneath, and focus handed back to the
 * trigger on close. What is added here is the backdrop click and the close on
 * navigation.
 *
 * Closed is the only state the prerendered file can hold, and a closed dialog
 * renders nothing, so there is no state in React at all: the element is its own.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { CloseIcon } from '#app/components/icons';

const SIDE = {
  left: 'm-0 h-dvh max-h-none w-[min(20rem,85vw)] border-r',
  bottom: 'mb-0 mt-auto max-h-[75dvh] w-full max-w-none border-t pb-[env(safe-area-inset-bottom)]',
} as const;

export function DocsSheet({
  side,
  label,
  trigger,
  triggerClassName,
  children,
}: {
  side: keyof typeof SIDE;
  /** The sheet's title and its accessible name. */
  label: string;
  /** What the opening button shows. */
  trigger: ReactNode;
  triggerClassName: string;
  /** The sheet's body, given a `close` to call when a row is chosen. */
  children: (close: () => void) => ReactNode;
}) {
  const { t } = useTranslation('docs');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();

  const close = (): void => {
    dialogRef.current?.close();
  };

  // A route change swaps the page under an open sheet; close it with the page.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          dialogRef.current?.showModal();
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {/* A click whose target is the dialog itself landed on the backdrop: the
          panel inside fills the dialog box edge to edge. Escape is native. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click; the keyboard closes it with Escape natively */}
      <dialog
        ref={dialogRef}
        aria-label={label}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className={`docs-sheet border-border bg-background p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm ${SIDE[side]}`}
      >
        <div className="flex max-h-[inherit] min-h-full flex-col px-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            {/* First in the panel, so `showModal` focuses it rather than the
                first link, which would scroll a long list on open. */}
            <button
              type="button"
              onClick={close}
              className="-mr-2 flex items-center rounded-full p-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
              <span className="sr-only">{t('closeSheet')}</span>
            </button>
          </div>
          <div className="-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">{children(close)}</div>
        </div>
      </dialog>
    </>
  );
}
