import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import striptags from 'striptags'
// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

interface SearchResult {
  html: string
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
  const [caption, setCaption] = useState('')
  const [didSearch, setDidSearch] = useState(false)
  const [mosaicData, setMosaicData] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

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
        case 'setDidSearch': setDidSearch(params); break
        case 'goToFrame':
          setSelectedItem(params)
          setCaption(striptags(params.html))
          break
        default: console.error('unexpected message type: ' + t); break
      }
    })
  }, [workerInstance])

  useEffect(() => {
    workerInstance?.search(searchCriteria)
  }, [searchCriteria, workerInstance])

  useEffect(() => {
    document.body.style.backgroundImage = selectedItem !== null || searchResults.length > 0
      ? ''
      : `url("${process.env.REACT_APP_ASSETS_URL}/bg.png")`
  }, [selectedItem, searchResults])

  useEffect(() => {
    if (loading || !workerInstance) return
    setLoading(true)

    workerInstance.init()
  }, [loading, workerInstance])

  const getCurrentFrame = useCallback((): Promise<string | undefined> => {
    const canvas = canvasRef.current as (HTMLCanvasElement | null)
    if (!canvas || !selectedItem) return Promise.resolve(undefined)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    canvas.width = 720
    canvas.height = 405
    const promise: Promise<string> = new Promise((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'
      image.src = `${process.env.REACT_APP_ASSETS_URL}/${selectedItem.season}x${('' + selectedItem.episode).padStart(2, '0')}/${selectedItem.id}_still.png`
      image.onload = function () {
        if (!ctx) return reject(new Error('no context'))
        let size = 48
        const padding = 10
        canvas.width = image.width
        canvas.height = image.height
        const x = this as any
        ctx.drawImage(x, 0, 0, x.width, x.height)
        ctx.font = size + 'px Ness'
        ctx.fillStyle = 'yellow'
        ctx.textBaseline = 'top'
        ctx.textAlign = 'center'
        const lines = caption.split('\n')
        lines.forEach((line) => {
          while (size > 10) {
            if (ctx.measureText(line).width > image.width - 2 * padding) {
              size--
              ctx.font = size + 'px Ness'
            } else {
              break
            }
          }
        })
        lines.reverse().forEach((line, i) => {
          const x = image.width / 2
          const y = image.height - (size - 4) * (1 + i) - padding
          ctx.lineWidth = 6
          ctx.strokeText(line, x, y)
          ctx.fillText(line, x, y)
        })
        resolve(canvas.toDataURL())
      }
    })
    return promise
  }, [selectedItem, caption])

  useEffect(() => {
    (async () => {
      if (imageRef.current) {
        imageRef.current.src = (await getCurrentFrame()) || ''
      }
    })()
  }, [getCurrentFrame])

  const fetchRandomFrame = () => {
    workerInstance?.randomFrame()
  }

  const previous = () => {
    workerInstance?.previousFrame(selectedItem!.season, selectedItem!.episode, selectedItem!.id)
  }
  const next = () => {
    workerInstance?.nextFrame(selectedItem!.season, selectedItem!.episode, selectedItem!.id)
  }

  const clearMosaic = async () => {
    setMosaicData('')
  }

  const addCurrentFrameToMosaic = async () => {
    const currentFrame = await getCurrentFrame()
    if (!currentFrame) return
    const canvas = canvasRef.current as (HTMLCanvasElement | null)
    if (!canvas || !selectedItem) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    canvas.height = 0
    const image = new Image()
    image.src = mosaicData
    image.onerror = image.onload = function () {
      const image2 = new Image()
      image2.src = currentFrame
      image2.onload = function () {
        if (!ctx) return
        canvas.width = Math.max(image.width, image2.width)
        canvas.height = image.height + image2.height
        ctx.drawImage(image, 0, 0, image.width, image.height)
        ctx.drawImage(image2, 0, image.height, image2.width, image2.height)
        setMosaicData(canvas.toDataURL())
      }
    }
  }

  return (
    <div id="main">
      <header>
        <h1>{process.env.REACT_APP_TITLE}</h1>
        <label>
          <span>Search</span>
          <input autoFocus={true} type="text" placeholder={process.env.REACT_APP_PLACEHOLDER} value={searchCriteria} onChange={(event) => {
            setSearchCriteria(event.target.value)
            setSelectedItem(null)
          }} />
          <button onClick={() => {
            setSearchCriteria('')
            setSelectedItem(null)
          }} aria-label="Clear" id="clear" className={searchCriteria === '' ? 'hidden' : ''}></button>
        </label>
        <button onClick={fetchRandomFrame}>Random</button>
      </header>
      {/* these should be components, but I don't want to be coding front-end */}
      <main>
        {ready && searchResults.length > 0 && selectedItem === null && <div>
          {/* eslint-disable-next-line */}
          <ul aria-description="Search results">
            {searchResults.map((doc: SearchResult) => (<li key={doc.id} className="searchResult">
              <button onClick={() => {
                setSelectedItem(doc)
                setCaption(striptags(doc.html))
              }}>
                <img src={`${process.env.REACT_APP_ASSETS_URL}/${doc.season}x${('' + doc.episode).padStart(2, '0')}/${doc.id}_thumbnail.png`} alt="" className="thumbnail" />
                <span>{striptags(doc.html)}</span>
              </button>
            </li>))}
          </ul>
        </div>}
        {(!ready || searchResults.length === 0) && selectedItem === null && <div>
          {!ready
            ? 'Loading...'
            : (searchCriteria.length === 0
                ? process.env.REACT_APP_SUBTITLE
                : (
                    didSearch
                      ? 'No results'
                      : 'Type more to search'
                  )
              )
          }
        </div>}
        {selectedItem !== null && <div id="selectedItem">
          <button onClick={() => setSelectedItem(null)} className="back">Back to search</button>
          <canvas ref={canvasRef}></canvas>
          <img ref={imageRef} alt="" />
          <div id="frameNavigation">
            <button onClick={previous}>Previous</button>
            <button onClick={next}>Next</button>
          </div>
          <p>
            Season {selectedItem.season} / {' '}
            Episode {selectedItem.episode}{' '}
            ({new Date(parseInt(selectedItem.id, 10)).toISOString().substr(11, 8)})
          </p>
          <textarea value={caption} onChange={(event) => setCaption(event.target.value)} aria-label="Caption"></textarea>
          <button onClick={addCurrentFrameToMosaic}>Add to mosaic</button>
          <button onClick={clearMosaic}>Clear mosaic</button>
          <img src={mosaicData} alt="" />
        </div>}
      </main>
      <footer>
        <a href="https://github.com/seppo0010/acrossoverepisode.com" target="_blank" rel="noreferrer">Fork me on GitHub</a>
      </footer>
    </div>
  )
}

export default App
