import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import striptags from 'striptags'
// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

interface SearchResult {
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
  const canvasRef = useRef(null)

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

  useEffect(() => {
    const canvas = canvasRef.current as (HTMLCanvasElement | null)
    if (!canvas || !selectedItem) return;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.src = `https://acrossoverepisode-assets.storage.googleapis.com/${selectedItem.season}x${('' + selectedItem.episode).padStart(2, '0')}/${selectedItem.id}_still.png`
    image.onload = function(){
      if (!ctx) return;
      let size = 68
      canvas.width = image.width
      canvas.height = image.height
      const x = this as any
      ctx.drawImage(x, 0, 0, x.width, x.height);
      ctx.font = size + 'px Ness';
      ctx.fillStyle = 'yellow';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      const text = striptags(selectedItem.html)
      while (size > 10) {
        if (ctx.measureText(text).width > image.width) {
          size--
          ctx.font = size + 'px Ness';
        } else {
          break
        }
      }
      ctx.fillText(text, image.width / 2, image.height - 68);
    };
  }, [selectedItem]);

  return (
    <div>
      <header>
        <h1>What is this? A cross over episode?</h1>
        <label>
          <span>Search</span>
          <input type="text" placeholder="Peanutbutter" value={searchCriteria} onChange={(event) => {
            setSearchCriteria(event.target.value)
            setSelectedItem(null)
          }} />
        </label>
      </header>
      {/* these should be components, but I don't want to be coding front-end */}
      <main>
        {ready && searchResults.length > 0 && selectedItem === null && <div>
          <ul aria-description="Search results">
            {searchResults.map((doc: SearchResult) => (<li key={doc.id}>
              <button title={doc.text} onClick={() => setSelectedItem(doc)}>
                <img src={`https://acrossoverepisode-assets.storage.googleapis.com/${doc.season}x${('' + doc.episode).padStart(2, '0')}/${doc.id}_thumbnail.png`} alt={striptags(doc.html)} className="thumbnail" />
              </button>
            </li>))}
          </ul>
        </div>}
        {(!ready || searchResults.length === 0) && selectedItem === null && <div>
          Search your favorite BoJack Horseman&apos;s scenes!
        </div>}
        {selectedItem !== null && <div id="selectedItem">
          <button onClick={() => setSelectedItem(null)}>Back</button>
          <canvas ref={canvasRef}></canvas>
          <p>
            Season {selectedItem.season} / {' '}
            Episode {selectedItem.episode}{' '}
            ({new Date(parseInt(selectedItem.id, 10)).toISOString().substr(11, 8)})
          </p>
          <p dangerouslySetInnerHTML={{ __html: selectedItem.html }} />
        </div>}
      </main>
    </div>
  )
}

export default App
