import { useEffect } from "react";

/*
  Notification — RevaultAI
  The transient toast shown after an action.
*/

export default function Notification({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3400); return () => clearTimeout(t); }, [onClose]);
  return <div className="notif">&#10022; {msg}</div>;
}
