'use client';

import { formatTime, parseTimeInput, toTimeInput } from "@/lib/dates";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function parts(value: string): { h: string; m: string } {
  if (!value) return { h: "", m: "" };
  const total = parseTimeInput(value);
  const formatted = toTimeInput(total);
  const [h, m] = formatted.split(":");
  return { h, m };
}

function mergeMinuteOptions(current: string) {
  if (!current || MINS.includes(current)) return MINS;
  return [...MINS, current].sort();
}

export function TimeField({
  value,
  onChange,
  optional = false,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  optional?: boolean;
  ariaLabel?: string;
}) {
  const { h, m } = parts(value);
  const minuteOptions = mergeMinuteOptions(m);

  function setHour(nextH: string) {
    if (!nextH) {
      onChange("");
      return;
    }
    onChange(`${nextH}:${m || "00"}`);
  }

  function setMinute(nextM: string) {
    onChange(`${h || "09"}:${nextM}`);
  }

  return (
    <div className="time-field" role="group" aria-label={ariaLabel ?? "시간 24시"}>
      <select
        className="input time-select"
        value={h}
        aria-label="시"
        onChange={(e) => setHour(e.target.value)}
      >
        {optional ? <option value="">—</option> : null}
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span className="time-colon" aria-hidden>
        :
      </span>
      <select
        className="input time-select"
        value={m}
        aria-label="분"
        disabled={optional && !h}
        onChange={(e) => setMinute(e.target.value)}
      >
        {optional && !h ? <option value="">—</option> : null}
        {minuteOptions.map((min) => (
          <option key={min} value={min}>
            {min}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TimePreview({ start, end }: { start: number; end: number }) {
  return (
    <span className="tabular">
      {formatTime(start)}–{formatTime(end)}
    </span>
  );
}
