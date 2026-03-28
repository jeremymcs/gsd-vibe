import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>{{project_name}}</h1>
      <button onClick={() => setCount((c) => c + 1)}>
        count is {count}
      </button>
    </main>
  )
}

export default App
