'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Mail, Phone, X } from 'lucide-react';
import { HELP_SECTIONS } from '@/lib/helpContent';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/support';

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

/** Right-side "Help & Guide" slide-over (full width on mobile). Text lives in lib/helpContent.ts. */
export default function HelpPanel({ open, onClose }: HelpPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(HELP_SECTIONS[0]?.id ?? null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasSupportContact = Boolean(SUPPORT_EMAIL || SUPPORT_PHONE);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Keep Tab focus inside the panel while it's open.
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50',
        // Visible immediately on open (so focus can move in); hidden only
        // after the slide-out finishes on close.
        open ? 'visible' : 'invisible transition-[visibility] duration-200'
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id="help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
        className={clsx(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl transition-transform duration-200 sm:max-w-md',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
          <h2 id="help-panel-title" className="text-base font-semibold text-gray-900">
            Help &amp; Guide
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:p-1.5"
            aria-label="Close help"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {HELP_SECTIONS.map((section) => {
              const expanded = expandedId === section.id;
              const buttonId = `help-${section.id}-button`;
              const regionId = `help-${section.id}-region`;
              const isContactSection = section.id === 'need-more-help';
              return (
                <div key={section.id}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : section.id)}
                      aria-expanded={expanded}
                      aria-controls={regionId}
                      className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      {section.title}
                      <ChevronDown
                        className={clsx('h-4 w-4 shrink-0 text-gray-400 transition-transform', expanded && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={regionId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!expanded}
                    className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-gray-600"
                  >
                    {section.body.map((block, i) =>
                      typeof block === 'string' ? (
                        <p key={i}>{block}</p>
                      ) : (
                        <ul key={i} className="list-disc space-y-1.5 pl-5">
                          {block.list.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )
                    )}

                    {isContactSection && hasSupportContact && (
                      <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                        {SUPPORT_EMAIL && (
                          <a
                            href={`mailto:${SUPPORT_EMAIL}`}
                            className="flex items-center gap-2 break-all font-medium text-brand hover:underline"
                          >
                            <Mail className="h-4 w-4 shrink-0" />
                            {SUPPORT_EMAIL}
                          </a>
                        )}
                        {SUPPORT_PHONE && (
                          <a
                            href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                            className="flex items-center gap-2 font-medium text-brand hover:underline"
                          >
                            <Phone className="h-4 w-4 shrink-0" />
                            {SUPPORT_PHONE}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
