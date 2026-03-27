import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

function App() {
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')

  async function greet() {
    setGreetMsg(await invoke('greet', { name }))
  }

  return (
    <main style={{ textAlign: 'center', padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>{{project_name}}</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name..."
        style={{ marginRight: '0.5rem' }}
      />
      <button onClick={greet}>Greet</button>
      {greetMsg && <p>{greetMsg}</p>}
    </main>
  )
}

export default App
