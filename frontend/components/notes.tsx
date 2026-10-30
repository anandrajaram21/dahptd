"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function NoteRef({
  id,
  onOpen,
}: {
  id: number;
  onOpen: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="ml-0.5 rounded-sm align-super text-[0.65rem] font-bold text-grid-ink hover:text-primary"
      aria-label={`Assumption ${id}`}
    >
      [{id}]
    </button>
  );
}

/** Numbered assumptions, opened from any [n] reference on the page. */
export function NotesPanel({
  open,
  onOpenChange,
  notes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: { title: string; body: string }[];
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-[var(--radius)] border-[1.5px] border-frame bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-bold">
        Assumptions & methodology
        <ChevronDownIcon
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="grid max-w-3xl gap-4 border-t border-border px-4 py-4 text-sm">
          {notes.map((note, index) => (
            <li
              key={note.title}
              id={`note-${index + 1}`}
              className="grid scroll-mt-24 grid-cols-[2rem_1fr] gap-x-2"
            >
              <span className="font-bold text-grid-ink tabular-nums">
                [{index + 1}]
              </span>
              <div className="grid gap-1">
                <h3 className="font-semibold">{note.title}</h3>
                <p className="leading-relaxed text-muted-foreground">
                  {note.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Scroll the assumptions panel to one note, opening it first. */
export function noteOpener(setOpen: (open: boolean) => void) {
  return (id: number) => {
    setOpen(true);
    // Wait for the panel to render before scrolling to the note.
    requestAnimationFrame(() =>
      document
        .getElementById(`note-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };
}
