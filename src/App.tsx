import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import relatedSites from './related-sites.json'
import striptags from 'striptags'
import {
  HashRouter,
  useNavigate,
  useParams,
  Outlet,
  Routes,
  Route,
  Link
} from 'react-router-dom'

// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

interface SearchResult {
  html: string
  season: number
  episode: number
  id: number
}

function Main ({
  didSearch,
  searchResults,
  searchCriteria,
  ready,
  setCaption,
  setSelectedItem
}: {
  didSearch: boolean,
  searchResults: SearchResult[],
  searchCriteria: string,
  ready: boolean,
  setCaption: (_: string) => void,
  setSelectedItem: (_: SearchResult) => void,
}) {
  useEffect(() => {
    document.body.style.backgroundImage = searchResults.length > 0
      ? ''
      : `url("${process.env.REACT_APP_ASSETS_URL}/bg.${process.env.REACT_APP_ASSETS_EXTENSION || 'png'}")`
    return () => { document.body.style.backgroundImage = '' }
  }, [searchResults])

  return <>
    {searchResults.length === 0 &&
      <>{!ready
        ? 'Loading...'
        : (searchCriteria.length === 0
            ? process.env.REACT_APP_SUBTITLE
            : (
                didSearch
                  ? 'No results'
                  : 'Type more to search'
              )
          )
      }</>
    }
    {ready && searchResults.length > 0 && <div>
      <ul aria-description="Search results">
        {searchResults.map((doc: SearchResult) => (<li key={doc.id} className="searchResult">
          <Link
            to={`/${encodeURIComponent(doc.season)}/${encodeURIComponent(doc.episode)}/${encodeURIComponent(doc.id)}`}
            className="button"
            onClick={() => {
              setSelectedItem(doc)
              setCaption(striptags(doc.html))
            }}
          >
            <img src={`${process.env.REACT_APP_ASSETS_URL}/${doc.season}x${('' + doc.episode).padStart(2, '0')}/${doc.id}_thumbnail.${process.env.REACT_APP_ASSETS_EXTENSION || 'png'}`} alt="" className="thumbnail" />
            <span>{striptags(doc.html)}</span>
          </Link>
        </li>))}
      </ul>
    </div>}
  </>
}

function Frame ({
  selectedItem,
  setSelectedItem,
  next,
  previous,
  caption,
  setCaption,
  workerInstance,
  ready
}: {
  selectedItem: SearchResult | null,
  setSelectedItem: (_: null) => void,
  next: () => void,
  previous: () => void,
  caption: string,
  setCaption: (_: string) => void,
  workerInstance: typeof Worker,
  ready: boolean
}) {
  const { season, episode, id } = useParams()
  const [mosaicData, setMosaicData] = useState('')
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

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
      image.src = `${process.env.REACT_APP_ASSETS_URL}/${selectedItem.season}x${('' + selectedItem.episode).padStart(2, '0')}/${selectedItem.id}_still.${process.env.REACT_APP_ASSETS_EXTENSION || 'png'}`
      image.onload = function () {
        if (!ctx) return reject(new Error('no context'))
        let size = 48
        const padding = 10
        canvas.width = image.width
        canvas.height = image.height
        const x = this as any
        ctx.drawImage(x, 0, 0, x.width, x.height)
        ctx.font = size + 'px acrossoverepisode-font'
        ctx.fillStyle = 'yellow'
        ctx.textBaseline = 'top'
        ctx.textAlign = 'center'
        const lines = caption.split('\n')
        let height = size - 4
        lines.forEach((line) => {
          while (size > 10) {
            const measure = ctx.measureText(line)
            if (measure.width > image.width - 2 * padding) {
              size--
              ctx.font = size + 'px acrossoverepisode-font'
            } else {
              break
            }
            if (measure.actualBoundingBoxDescent < size) {
              height = measure.actualBoundingBoxDescent
            }
          }
        })
        lines.reverse().forEach((line, i) => {
          const x = image.width / 2
          const y = image.height - height * (1 + i) - padding
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

  const needsLoading = !selectedItem ||
    selectedItem.season !== parseInt(season || '', 10) ||
    selectedItem.episode !== parseInt(episode || '', 10) ||
    selectedItem.id !== parseInt(id || '', 10)

  useEffect(() => {
    if (needsLoading && ready) {
      workerInstance?.goToFrame(season, episode, id)
    }
  }, [needsLoading, ready, workerInstance, season, episode, id])

  if (needsLoading) {
    return <>Loading...</>
  }
  return <div id="selectedItem">
    <Link to='/' onClick={() => {
      setSelectedItem(null)
    }} className="button back">Back to search</Link>
    <canvas ref={canvasRef}></canvas>
    <img ref={imageRef} alt="" />
    <div id="frameNavigation">
      <button onClick={previous}>Previous</button>
      <button onClick={next}>Next</button>
    </div>
    <p>
      Season {selectedItem.season} / {' '}
      Episode {selectedItem.episode}{' '}
      ({new Date(selectedItem.id).toISOString().substr(11, 8)})
    </p>
    <textarea value={caption} onChange={(event) => setCaption(event.target.value)} aria-label="Caption"></textarea>
    <button onClick={addCurrentFrameToMosaic}>Add to mosaic</button>
    <button onClick={clearMosaic}>Clear mosaic</button>
    <img src={mosaicData} alt="" />
  </div>
}

function WorkerTrigger ({
  searchCriteria,
  setSearchCriteria,
  setCaption,
  setSelectedItem,
  setDidSearch,
  setSearchResults,
  setReady,
  workerInstance
}: {
  searchCriteria: string,
  setSearchCriteria: (_: string) => void,
  setCaption: (_: string) => void,
  setSelectedItem: (_: SearchResult | null) => void,
  setDidSearch: (_: boolean) => void,
  setSearchResults: (_: SearchResult[]) => void,
  setReady: (_: boolean) => void,
  workerInstance: typeof Worker
}) {
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const placeholders = (process.env.REACT_APP_PLACEHOLDER || '').split(',')
  const getRandomPlaceholderIndex = () => {
    return Math.floor(Math.random() * placeholders.length)
  }
  const [placeholderIndex, setPlaceholderIndex] = useState(getRandomPlaceholderIndex)

  const processMessage = ({ data }: any) => {
    // I don't know why `const [t, params] = data` does not work
    const [t, params] = [data[0], data[1]]
    if (!t) return
    switch (t) {
      case 'setReady': setReady(params); break
      case 'setSearchResults': setSearchResults(params); break
      case 'setDidSearch': setDidSearch(params); break
      case 'goToFrame':
        setPlaceholderIndex(getRandomPlaceholderIndex())
        navigate(`/${encodeURIComponent(params.season)}/${encodeURIComponent(params.episode)}/${encodeURIComponent(params.id)}`)
        setSelectedItem(params)
        setCaption(striptags(params.html))
        break
      default: console.error('unexpected message type: ' + t); break
    }
  }
  useEffect(() => {
    if (!workerInstance) return
    workerInstance.addEventListener('message', processMessage)
    return () => workerInstance.removeEventListener('message', processMessage)
  })

  useEffect(() => {
    workerInstance?.search(searchCriteria)
  }, [searchCriteria, workerInstance])

  const fetchRandomFrame = () => {
    workerInstance?.randomFrame()
  }

  const sites = relatedSites.filter((site: {url: string}) => site.url.replace(/\/$/, '') !== (process.env.REACT_APP_PUBLIC_URL || '').replace(/\/$/, ''))

  return (<>
    <header>
      <h1>{process.env.REACT_APP_TITLE}</h1>
      <label>
        <span>Search</span>
        <input autoFocus={true} type="text" placeholder={placeholders[placeholderIndex]} value={searchCriteria} ref={searchInputRef} onChange={(event) => {
          navigate('/')
          setSearchCriteria(event.target.value)
          setSelectedItem(null)
        }} />
        <button onClick={() => {
          navigate('/')
          setSearchCriteria('')
          setSelectedItem(null)
          searchInputRef.current?.focus()
        }} aria-label="Clear" id="clear" className={searchCriteria === '' ? 'hidden' : ''}></button> </label>
      <button onClick={fetchRandomFrame}>Random</button>
    </header>
    <main>
      <Outlet />
    </main>
    <footer>
      {sites.length > 0
        ? <>
          <span>Related websites:</span>
          <ul>
            {sites.map((site: {url: string, title: string}) => (<li key={site.url}>
              <a target="_blank" href={site.url} rel="noreferrer">{site.title}</a>
            </li>))}
          </ul>
        </>
        : ''}
      <a href="https://github.com/seppo0010/acrossoverepisode.com" target="_blank" rel="noreferrer">Fork me on GitHub</a>
    </footer>
  </>)
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
  const [didLoadFont, setDidLoadFont] = useState(0)

  useEffect(() => {
    if (didLoadFont !== 0) return
    setDidLoadFont(1);

    (async () => {
      const newFont = new FontFace('acrossoverepisode-font', `url(${process.env.REACT_APP_ASSETS_URL}/font.ttf)`)
      const loadedFace = await newFont.load()
      document.fonts.add(loadedFace)
      setDidLoadFont(2)
    })()
  }, [didLoadFont])

  useEffect(() => {
    if (workerInstance) return
    const w = new Worker()
    setWorkerInstance(w)
  }, [workerInstance])

  useEffect(() => {
    if (loading || !workerInstance) return
    setLoading(true)

    workerInstance.init()
  }, [loading, workerInstance])

  const previous = () => {
    workerInstance?.previousFrame(selectedItem!.season, selectedItem!.episode, selectedItem!.id)
  }
  const next = () => {
    workerInstance?.nextFrame(selectedItem!.season, selectedItem!.episode, selectedItem!.id)
  }

  return (
    <div id="main" style={{ display: didLoadFont === 2 ? 'block' : 'none' }}>
      <HashRouter>
        <Routes>
          <Route element={
            <WorkerTrigger
              workerInstance={workerInstance}
              searchCriteria={searchCriteria}
              setSearchCriteria={setSearchCriteria}
              setCaption={setCaption}
              setSelectedItem={setSelectedItem}
              setDidSearch={setDidSearch}
              setSearchResults={setSearchResults}
              setReady={setReady}
              />}>
            <Route path="/" element={<Main
              searchResults={searchResults}
              setCaption={setCaption}
              setSelectedItem={setSelectedItem}
              didSearch={didSearch}
              searchCriteria={searchCriteria}
              ready={ready}
              />} />
            <Route path="/:season/:episode/:id" element={<Frame
              workerInstance={workerInstance}
              selectedItem={selectedItem}
              caption={caption}
              setCaption={setCaption}
              setSelectedItem={setSelectedItem}
              next={next}
              previous={previous}
              ready={ready}
              />} />
            </Route>
        </Routes>
      </HashRouter>
    </div>
  )
}

export default App
