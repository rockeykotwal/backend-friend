import { useState } from 'react'
import QueryAnalyzer from './components/QueryAnalyzer'
import AgentScanner from './components/AgentScanner'
import { analytics } from './utils/analytics'
import './App.css'

type Tab = 'analyze' | 'agent'
type Theme = 'dark' | 'light'

export default function App() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [theme, setTheme] = useState<Theme>('dark')

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '')
    analytics.toggleTheme(next)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-top">
            <div className="logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">Backend Friend</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
          <p className="tagline">Catch what's killing your database before it kills your app</p>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${tab === 'analyze' ? 'active' : ''}`}
          onClick={() => setTab('analyze')}
        >
          Analyze Query
        </button>
        <button
          className={`tab ${tab === 'agent' ? 'active' : ''}`}
          onClick={() => setTab('agent')}
        >
          Scan Codebase
          <span className="tab-badge">Agentic</span>
        </button>
      </nav>

      <main className="main">
        <div style={{ display: tab === 'analyze' ? 'block' : 'none' }}><QueryAnalyzer /></div>
        <div style={{ display: tab === 'agent' ? 'block' : 'none' }}><AgentScanner /></div>
      </main>

      <footer className="footer">
        <span>Built with Meta AI · Muse Spark · Muse Wonder · Muse Image · Muse Voice</span>
        <a href="https://github.com/rockeykotwal/backend-friend" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </div>
  )
}
