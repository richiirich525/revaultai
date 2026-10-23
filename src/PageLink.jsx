/*
  PageLink — RevaultAI

  An internal link that is a real link.

  Everything on this site navigated through a button and an onClick, which
  works for someone clicking with a mouse and for nobody else: a crawler sees
  no link to follow, cmd-click and middle-click cannot open a new tab, "copy
  link address" has nothing to copy, and a screen reader announces a button
  where a link was meant.

  So this renders an <a href> with the real path, and intercepts only the plain
  left click — the one case where staying in the single-page app is better than
  a full page load. Modified clicks, middle clicks and anything the browser
  wants to handle itself are left alone.
*/
export default function PageLink({ page, setPage, children, className, style, title, onNavigate }) {
  const href = "/" + String(page ?? "").replace(/^\//, "");
  return (
    <a
      href={href}
      className={className}
      style={style}
      title={title}
      onClick={(e) => {
        // Let the browser do its job for anything but an unmodified left click.
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate?.();
        setPage?.(page);
      }}
    >
      {children}
    </a>
  );
}
