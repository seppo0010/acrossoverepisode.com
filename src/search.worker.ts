import MiniSearch from 'minisearch'

let index: MiniSearch
let criteria = ''
let documentIds: Record<string, number> | undefined
let storedFields: Record<string, {
  episode: number,
  html: string,
  season: number,
}> | undefined

const doSearch = () => {
  if (!index) return
  const c = criteria.split(' ').filter((x) => x.length >= 3).join(' ')
  if (c === '') {
    global.self.postMessage(['setSearchResults', []])
    return
  }
  global.self.postMessage(['setSearchResults', index.search(criteria).slice(0, 40)])
}

export async function init () {
  fetch('https://acrossoverepisode-assets.storage.googleapis.com/index.json')
    .then((res) => res.text())
    // minisearch configuration must match datamaker's
    .then((data) => {
      index = MiniSearch.loadJSON(data, {
        fields: ['text'],
        storeFields: ['html', 'season', 'episode', 'stillPath'],
        searchOptions: {
          combineWith: 'AND',
          prefix: true
        }
      })
      const jsonData = JSON.parse(data)
      documentIds = jsonData.documentIds
      storedFields = jsonData.storedFields
      global.self.postMessage(['setReady', true])
      doSearch()
    })
    // TODO: handle error
}

export async function search (searchCriteria: string) {
  criteria = searchCriteria
  doSearch()
}

export function randomFrame() {
  if (!storedFields || !documentIds) {
    return
  }
  const keys = Object.keys(documentIds)
  const key = keys[Math.floor(Math.random() * keys.length)]
  if (!storedFields[key]) {
    return
  }
  global.self.postMessage(['setRandomFrame', {
    id: documentIds[key],
    episode: storedFields[key].episode,
    html: storedFields[key].html,
    season: storedFields[key].season,
  }])
}
