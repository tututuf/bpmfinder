'use client';
import { useInterfaceMotion } from '@/lib/motion';

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string };
type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  ariaLabel: string;
  label?: string;
  className?: string;
  heading?: ReactNode;
  minMenuWidth?: number;
  renderValue?: (option: SelectOption) => ReactNode;
  renderOption?: (option: SelectOption) => ReactNode;
};

export default function CustomSelect({ value, onChange, options, ariaLabel, label, className = '', heading, minMenuWidth = 220, renderValue, renderOption }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const initialScroll = useRef(false);
  const [open, setOpen] = useState(false);
  useInterfaceMotion(root, [open], '.custom-select-menu');
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ left: 0, top: 0, width: 0, maxHeight: 288, up: false });
  const selected = options.find(option => option.value === value);

  const show = (index = Math.max(0, options.findIndex(option => option.value === value))) => {
    if (!options.length) return;
    if (!open) initialScroll.current = true;
    setActive(index);
    setOpen(true);
  };
  const choose = (index: number) => {
    if (!options[index]) return;
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const dialog = trigger.current?.closest('[role="dialog"]')?.getBoundingClientRect();
      if (dialog && (rect.bottom <= dialog.top || rect.top >= dialog.bottom)) { setOpen(false); return; }
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
      if (rect.bottom <= viewportTop || rect.top >= viewportTop + viewportHeight) { setOpen(false); return; }
      const below = viewportTop + viewportHeight - rect.bottom - 16;
      const above = rect.top - viewportTop - 16;
      const idealHeight = Math.min(288, options.length * 38 + 10 + (heading ? 36 : 0));
      const up = below < idealHeight && above > below;
      const maxHeight = Math.min(idealHeight, Math.max(0, up ? above : below));
      const width = Math.min(Math.max(rect.width, minMenuWidth), viewportWidth - 24);
      setPlacement({
        left: Math.max(viewportLeft + 12, Math.min(rect.left, viewportLeft + viewportWidth - width - 12)),
        top: up ? rect.top - 8 : rect.bottom + 8,
        width,
        maxHeight,
        up,
      });
    };
    position();
    // Fixed positioning keeps the menu out of the modal's scrolling clip.
    const scroll = (event: Event) => { if (!list.current?.contains(event.target as Node)) position(); };
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('resize', position);
    document.addEventListener('scroll', scroll, true);
    document.addEventListener('pointerdown', outside);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', scroll, true);
      document.removeEventListener('pointerdown', outside);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, options.length, minMenuWidth, heading]);

  useLayoutEffect(() => {
    if (!open || !list.current) return;
    const option = list.current.children.item(active) as HTMLElement | null;
    if (!option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (initialScroll.current) {
      list.current.scrollTop = Math.max(0, top - Math.floor((list.current.clientHeight - option.offsetHeight) / 2 / option.offsetHeight) * option.offsetHeight);
      initialScroll.current = false;
    } else if (top < list.current.scrollTop) list.current.scrollTop = top;
    else if (bottom > list.current.scrollTop + list.current.clientHeight) list.current.scrollTop = bottom - list.current.clientHeight;
  }, [active, open, placement.maxHeight]);

  useEffect(() => {
    if (!open) search.current = { text: '', time: 0 };
  }, [open]);

  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') show(0);
      else if (event.key === 'End') show(options.length - 1);
      else if (!open) show();
      else setActive(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active); else show();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const previous = now - search.current.time < 700 ? search.current.text : '';
      const text = previous === event.key.toLowerCase() ? previous : previous + event.key.toLowerCase();
      search.current = { text, time: now };
      const start = open ? active : options.findIndex(option => option.value === value);
      for (let step = 1; step <= options.length; step++) {
        const index = (start + step + options.length) % options.length;
        if (options[index].label.toLowerCase().startsWith(text)) { show(index); break; }
      }
    }
  };

  return <div className={`custom-select ${className}`} ref={root}>
    {label && <label htmlFor={id}>{label}</label>}
    <button ref={trigger} id={id} type="button" className="custom-select-trigger" role="combobox" disabled={!options.length}
      aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
      aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={keyboard}
      onBlur={() => setOpen(false)}>
      <span>{selected ? renderValue?.(selected) ?? selected.label : value}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div className="custom-select-menu" style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight, transform: placement.up ? 'translateY(-100%)' : undefined }}
      onMouseDown={event => event.preventDefault()}>
      {heading && <div className="custom-select-heading" aria-hidden="true">{heading}</div>}
      <div ref={list} id={`${id}-list`} className="custom-select-options" role="listbox" aria-label={label ?? ariaLabel}>
        {options.map((option, index) => {
          return <div key={option.value} id={`${id}-option-${index}`} role="option" aria-label={option.label} aria-selected={option.value === value}
            className={`custom-select-option${index === active ? ' is-active' : ''}`}
            onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
            <span className="custom-select-check">{option.value === value && <Check size={14} aria-hidden="true" />}</span>
            {renderOption ? renderOption(option) : <span className="custom-select-text">{option.label}</span>}
          </div>;
        })}
      </div>
    </div>}
  </div>;
}
