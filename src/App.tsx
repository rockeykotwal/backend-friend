import { useState } from 'react'
import QueryAnalyzer from './components/QueryAnalyzer'
import AgentScanner from './components/AgentScanner'
import './App.css'

type Tab = 'analyze' | 'agent'

export default function App() {
  const [tab, setTab] = useState<Tab>('analyze')

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Backend Friend</span>
            <span className="logo-badge">Beta</span>
          </div>
          <p className="tagline">ESLint for your database queries — finds N+1s, missing indexes, and overfetching in your ORM code</p>
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
