import { useState } from "react";
import type { TimeFrame } from "@/api/types";

const TIME_FRAME_PARAM = "timeframe";
const DEFAULT_TIME_FRAME: TimeFrame = "DAY";
const VALID_TIME_FRAMES: readonly TimeFrame[] = [
  "DAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "ALL",
];

function readTimeFrameFromUrl(): TimeFrame {
  const raw = new URLSearchParams(window.location.search)
    .get(TIME_FRAME_PARAM)
    ?.toUpperCase();
  return VALID_TIME_FRAMES.includes(raw as TimeFrame)
    ? (raw as TimeFrame)
    : DEFAULT_TIME_FRAME;
}

function writeTimeFrameToUrl(next: TimeFrame) {
  const url = new URL(window.location.href);
  if (next === DEFAULT_TIME_FRAME) {
    url.searchParams.delete(TIME_FRAME_PARAM);
  } else {
    url.searchParams.set(TIME_FRAME_PARAM, next.toLowerCase());
  }
  window.history.replaceState({}, "", url);
}

export function useTimeFrameParam(): [TimeFrame, (next: TimeFrame) => void] {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(readTimeFrameFromUrl);
  const update = (next: TimeFrame) => {
    setTimeFrame(next);
    writeTimeFrameToUrl(next);
  };
  return [timeFrame, update];
}
