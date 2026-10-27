export default function MetaLoader() {
  return (
    <div className="meta-loader">
      <div className="meta-ring">
        <svg className="meta-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="42"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60 204"
            className="meta-arc"
          />
        </svg>
        <div className="meta-logo">
          <svg viewBox="0 0 66 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="meta-infinity">
            <path d="M33 17.8C30.3 14.1 27.2 12 23.8 12 17.8 12 13 17.4 13 24s4.8 12 10.8 12c3.4 0 6.5-2.1 9.2-5.8.7-1 1.4-2.1 2-3.2.6 1.1 1.3 2.2 2 3.2C39.7 33.9 42.8 36 46.2 36 52.2 36 57 30.6 57 24s-4.8-12-10.8-12c-3.4 0-6.5 2.1-9.2 5.8L35.5 20l-.5.8-.5-.8-1.5-2.2zM28.5 24c-1.1 1.9-2.5 3.8-3.7 4.9-1.2 1-2.2 1.5-3.2 1.5C18.6 30.4 16 27.5 16 24s2.6-6.4 5.6-6.4c1 0 2 .5 3.2 1.5 1.2 1.1 2.6 3 3.7 4.9zm9 0c1.1-1.9 2.5-3.8 3.7-4.9 1.2-1 2.2-1.5 3.2-1.5 3 0 5.6 2.9 5.6 6.4s-2.6 6.4-5.6 6.4c-1 0-2-.5-3.2-1.5-1.2-1.1-2.6-3-3.7-4.9z" />
          </svg>
        </div>
      </div>
      <p className="meta-label">Analyzing your query · ~10–30 sec</p>
    </div>
  )
}
