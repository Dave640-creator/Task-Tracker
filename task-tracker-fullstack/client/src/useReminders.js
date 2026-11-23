import { useEffect, useRef } from "react";
import { todayString, tomorrowString } from "./utils.js";

// Ask the browser for permission to show notifications
export function enableReminders() {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return Promise.resolve("denied");
  }
  return Notification.requestPermission();
}

// Checks every minute and shows a notification for tasks that are
// overdue, due today, or due tomorrow. Each task is shown once per day.
export default function useReminders(tasks) {
  const alreadyShown = useRef(new Set());

  useEffect(() => {
    function check() {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const today = todayString();
      const tomorrow = tomorrowString();

      for (const task of tasks) {
        if (task.status === "done" || task.due === "") continue;

        const key = task.id + "-" + today;
        if (alreadyShown.current.has(key)) continue;

        let message = "";
        if (task.due < today) message = "Overdue: " + task.title;
        else if (task.due === today) message = "Due today: " + task.title;
        else if (task.due === tomorrow) message = "Due tomorrow: " + task.title;

        if (message) {
          new Notification("Task reminder", { body: message });
          alreadyShown.current.add(key);
        }
      }
    }

    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [tasks]);
}
