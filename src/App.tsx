import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  Link,
  useLocation
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
  ready
}: {
  didSearch: boolean,
  searchResults: SearchResult[],
  searchCriteria: string,
  ready: boolean,
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
            to={framePath(doc)}
            className="button"
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
  workerInstance,
  ready,
  searchCriteria
}: {
  workerInstance: typeof Worker,
  ready: boolean,
  searchCriteria: string
}) {
  const { season, episode, id } = useParams()
  const [currFrame, setCurrFrame] = useState<SearchResult | null>(null)
  const [prevFrame, setPrevFrame] = useState<SearchResult | null>(null)
  const [nextFrame, setNextFrame] = useState<SearchResult | null>(null)
  const [caption, setCaption] = useState('')
  const [mosaicData, setMosaicData] = useState('')
  const clearMosaic = async () => {
    setMosaicData('')
  }

  const addCurrentFrameToMosaic = async () => {
    const currentFrame = await getCurrentFrame()
    if (!currentFrame) return
    const canvas = canvasRef.current as (HTMLCanvasElement | null)
    if (!canvas || !currFrame) return
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
    if (!canvas || !currFrame) return Promise.resolve(undefined)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    canvas.width = 720
    canvas.height = 405
    const promise: Promise<string> = new Promise((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'Anonymous'
      image.src = `${process.env.REACT_APP_ASSETS_URL}/${currFrame.season}x${('' + currFrame.episode).padStart(2, '0')}/${currFrame.id}_still.${process.env.REACT_APP_ASSETS_EXTENSION || 'png'}`
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
  }, [currFrame, caption])

  useEffect(() => {
    (async () => {
      if (imageRef.current) {
        imageRef.current.src = (await getCurrentFrame()) || ''
      }
    })()
  }, [getCurrentFrame])

  useEffect(() => {
    if (!ready) return
    if (!currFrame ||
      currFrame.season !== parseInt(season || '', 10) ||
      currFrame.episode !== parseInt(episode || '', 10) ||
      currFrame.id !== parseInt(id || '', 10)) {
      workerInstance?.loadFrame(season, episode, id).then((data: SearchResult) => {
        setCurrFrame(data)
        setCaption(striptags(data.html))
      })
      workerInstance?.loadFrame(season, episode, id, -1).then(setPrevFrame)
      workerInstance?.loadFrame(season, episode, id, 1).then(setNextFrame)
    }
  }, [currFrame, ready, workerInstance, season, episode, id])

  if (!currFrame) {
    return <>Loading...</>
  }
  return <div id="selectedItem">
    <Link to={{ pathname: '/', search: searchCriteria && new URLSearchParams({ s: searchCriteria }).toString() }} className="button back">Back to search</Link>
    <canvas ref={canvasRef}></canvas>
    <img ref={imageRef} alt="" />
    <div id="frameNavigation">
      {prevFrame && <Link to={framePath(prevFrame)} className="button">Previous</Link>}
      {nextFrame && <Link to={framePath(nextFrame)} className="button">Next</Link>}
    </div>
    <p>
      Season {currFrame.season} / {' '}
      Episode {currFrame.episode}{' '}
      ({new Date(currFrame.id).toISOString().substr(11, 8)})
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
  setDidSearch,
  setSearchResults,
  setReady,
  workerInstance
}: {
  searchCriteria: string,
  setSearchCriteria: (_: string) => void,
  setDidSearch: (_: boolean) => void,
  setSearchResults: (_: SearchResult[]) => void,
  setReady: (_: boolean) => void,
  workerInstance: typeof Worker
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const placeholders = (process.env.REACT_APP_PLACEHOLDER || '').split(',')
  const placeholderIndex = useMemo(() => {
    return Math.floor(Math.random() * placeholders.length)
  }, [])

  const processMessage = ({ data }: any) => {
    // I don't know why `const [t, params] = data` does not work
    const [t, params] = [data[0], data[1]]
    if (!t) return
    switch (t) {
      case 'setReady': setReady(params); break
      case 'setSearchResults': setSearchResults(params); break
      case 'setDidSearch': setDidSearch(params); break
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

  const goToRandomFrame = async () => {
    const frame = await workerInstance?.loadRandomFrame()
    navigate(framePath(frame))
  }

  useEffect(() => {
    if (!location.search) return
    const s = new URLSearchParams(location.search).get('s')
    if (s && s !== searchCriteria) {
      setSearchCriteria(s)
    }
  }, [location.search])

  const sites = relatedSites.filter((site: {url: string}) => site.url.replace(/\/$/, '') !== (process.env.REACT_APP_PUBLIC_URL || '').replace(/\/$/, ''))

  return (<>
    <header>
      <h1>{process.env.REACT_APP_TITLE}</h1>
      <label>
        <span>Search</span>
        <input autoFocus={true} type="text" placeholder={placeholders[placeholderIndex]} value={searchCriteria} ref={searchInputRef} onChange={(event) => {
          const value = event.target.value
          setSearchCriteria(value)
          const searchLocation = {
            pathname: '/',
            search: value && new URLSearchParams({ s: value }).toString()
          }
          navigate(searchLocation, { replace: location.pathname === '/' })
        }} />
        <button onClick={() => {
          navigate('/')
          setSearchCriteria('')
          searchInputRef.current?.focus()
        }} aria-label="Clear" id="clear" className={searchCriteria === '' ? 'hidden' : ''}></button> </label>
      <button onClick={goToRandomFrame}>Random</button>
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

const framePath = (frame: SearchResult) =>
  `/${encodeURIComponent(frame.season)}/${encodeURIComponent(frame.episode)}/${encodeURIComponent(frame.id)}`

function App () {
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [workerInstance, setWorkerInstance] = useState<any | null>(null)
  const [searchCriteria, setSearchCriteria] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
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

  return (
    <div id="main" style={{ display: didLoadFont === 2 ? 'block' : 'none' }}>
      <HashRouter>
        <Routes>
          <Route element={
            <WorkerTrigger
              workerInstance={workerInstance}
              searchCriteria={searchCriteria}
              setSearchCriteria={setSearchCriteria}
              setDidSearch={setDidSearch}
              setSearchResults={setSearchResults}
              setReady={setReady}
              />}>
            <Route path="/" element={<Main
              searchResults={searchResults}
              didSearch={didSearch}
              searchCriteria={searchCriteria}
              ready={ready}
              />} />
            <Route path="/:season/:episode/:id" element={<Frame
              workerInstance={workerInstance}
              ready={ready}
              searchCriteria={searchCriteria}
              />} />
            </Route>
        </Routes>
      </HashRouter>
    </div>
  )
}

export default App
