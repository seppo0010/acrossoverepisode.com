import MiniSearch from 'minisearch'

let index: MiniSearch
let criteria = ''

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
  fetch('data/index.json')
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
      global.self.postMessage(['setReady', true])
      doSearch()
    })
    // TODO: handle error
}

export async function search (searchCriteria: string) {
  criteria = searchCriteria
  doSearch()
}
