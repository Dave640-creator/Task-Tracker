import { useEffect, useRef, useState } from "react";

const MINUTES = { focus: 25, break: 5 };

// A small timer at the bottom of the screen (Pomodoro: 25 minutes focus, 5 minutes break)
export default function FocusTimer({ task, onFocusDone, onClose }) {
  const [mode, setMode] = useState("focus");
  const [secondsLeft, setSecondsLeft] = useState(MINUTES.focus * 60);
  const [running, setRunning] = useState(true);
  const endTime = useRef(Date.now() + MINUTES.focus * 60 * 1000); // when the timer will reach zero

  // Check the time twice per second while the timer is running
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      const left = Math.round((endTime.current - Date.now()) / 1000);
      if (left > 0) {
        setSecondsLeft(left);
        return;
      }

      // Time is up
      setSecondsLeft(0);
      setRunning(false);
      if (mode === "focus") onFocusDone(MINUTES.focus);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(mode === "focus" ? "Focus session finished" : "Break is over");
      }
    }, 500);

    return () => clearInterval(timer);
  }, [running, mode]);

  function start(newMode) {
    setMode(newMode);
    setSecondsLeft(MINUTES[newMode] * 60);
    endTime.current = Date.now() + MINUTES[newMode] * 60 * 1000;
    setRunning(true);
  }

  function pauseOrResume() {
    if (!running) endTime.current = Date.now() + secondsLeft * 1000; // continue from where we stopped
    setRunning(!running);
  }

  const finished = secondsLeft === 0;
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="focus-bar no-print" role="timer">
      <div>
        <div className="muted small">{mode === "focus" ? "Focus" : "Break"}: {task.title}</div>
        <div className="focus-time">{minutes}:{seconds}</div>
      </div>

      <div className="focus-buttons">
        {!finished && <button className="btn" onClick={pauseOrResume}>{running ? "Pause" : "Resume"}</button>}
        {finished && mode === "focus" && <button className="btn btn-primary" onClick={() => start("break")}>Start 5 minute break</button>}
        {finished && <button className="btn" onClick={() => start("focus")}>Focus again</button>}
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
