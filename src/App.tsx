import React, { useState, useEffect } from 'react'
import './App.css'
// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

interface SearchResult {
  stillPath: string
  html: string
  text: string
  season: number
  episode: number
  id: string
}

function App () {
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [workerInstance, setWorkerInstance] = useState<any | null>(null)
  const [searchCriteria, setSearchCriteria] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)

  useEffect(() => {
    if (workerInstance) return
    const w = new Worker()
    setWorkerInstance(w)

    w.addEventListener('message', ({ data }: any) => {
      // I don't know why `const [t, params] = data` does not work
      const [t, params] = [data[0], data[1]]
      if (!t) return
      switch (t) {
        case 'setReady': setReady(params); break
        case 'setSearchResults': setSearchResults(params); break
        default: console.error('unexpected message type: ' + t); break
      }
    })
  }, [workerInstance])

  useEffect(() => {
    workerInstance?.search(searchCriteria)
  }, [searchCriteria, workerInstance])

  useEffect(() => {
    if (loading || !workerInstance) return
    setLoading(true)

    workerInstance.init()
  }, [loading, workerInstance])

  return (
    <div>
      <div id="searchTitle">
        <h1>What is this? A cross over episode?</h1>
        <label>
          <span>Search</span>
          <input type="text" placeholder="Peanutbutter" value={searchCriteria} onChange={(event) => setSearchCriteria(event.target.value)} />
        </label>
      </div>
      {/* these should be components, but I don't want to be coding front-end */}
      {ready && searchResults.length > 0 && selectedItem === null && <div>
        <ul aria-description="Search results">
          {searchResults.map((doc: SearchResult) => (<li key={doc.stillPath}>
            <button title={doc.text} onClick={() => setSelectedItem(doc)}>
              <img src={`data/${doc.stillPath}`} alt={doc.text} className="thumbnail" />
            </button>
          </li>))}
        </ul>
      </div>}
      {(!ready || searchResults.length === 0) && selectedItem === null && <div>
        Search your favorite BoJack Horseman&apos;s scenes!
      </div>}
      {selectedItem !== null && <div id="selectedItem">
        <button onClick={() => setSelectedItem(null)}>Back</button>
        <img src={`data/${selectedItem.stillPath}`} alt={'' /* no alt text as the caption will be below */} />
        <p>
          Season {selectedItem.season} / {' '}
          Episode {selectedItem.episode}{' '}
          ({new Date(parseInt(selectedItem.id, 10)).toISOString().substr(11, 8)})
        </p>
        <p dangerouslySetInnerHTML={{ __html: selectedItem.html }} />
      </div>}
    </div>
  )
}

export default App
