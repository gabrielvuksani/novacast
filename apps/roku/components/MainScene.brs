sub init()
  m.top.backgroundURI = ""
  m.top.backgroundColor = "0x0A0E1AFF"

  ' UI nodes
  m.homeScreen = m.top.findNode("homeScreen")
  m.detailScreen = m.top.findNode("detailScreen")
  m.searchScreen = m.top.findNode("searchScreen")
  m.sourcesScreen = m.top.findNode("sourcesScreen")
  m.playerScreen = m.top.findNode("playerScreen")
  m.statusLabel = m.top.findNode("statusLabel")

  m.heroPoster = m.top.findNode("heroPoster")
  m.heroType = m.top.findNode("heroType")
  m.heroTitle = m.top.findNode("heroTitle")
  m.heroDesc = m.top.findNode("heroDesc")
  m.heroMeta = m.top.findNode("heroMeta")
  m.homeGrid = m.top.findNode("homeGrid")

  m.detailBg = m.top.findNode("detailBg")
  m.detailPoster = m.top.findNode("detailPoster")
  m.detailType = m.top.findNode("detailType")
  m.detailTitle = m.top.findNode("detailTitle")
  m.detailMeta = m.top.findNode("detailMeta")
  m.detailDesc = m.top.findNode("detailDesc")
  m.detailGenres = m.top.findNode("detailGenres")
  m.sourceList = m.top.findNode("sourceList")
  m.noSrcLabel = m.top.findNode("noSrcLabel")

  m.searchGrid = m.top.findNode("searchGrid")
  m.searchInfo = m.top.findNode("searchInfo")
  m.addonList = m.top.findNode("addonList")

  ' State
  m.currentScreen = "home"
  m.screenStack = []
  m.allMetas = []
  m.searchMetas = []
  m.addons = []
  m.addonUrls = []
  m.currentMeta = invalid
  m.currentStreams = []

  ' Observers
  m.playerScreen.observeField("action", "onPlayerAction")
  m.homeGrid.observeField("itemSelected", "onHomeItemSelected")
  m.homeGrid.observeField("itemFocused", "onHomeItemFocused")
  m.sourceList.observeField("itemSelected", "onSourceSelected")
  m.searchGrid.observeField("itemSelected", "onSearchItemSelected")

  m.homeGrid.setFocus(true)
  runTask("loadAddons")
end sub

' ═══════════ TASKS ═══════════

sub runTask(action as String, params = {} as Object)
  task = createObject("roSGNode", "LoadTask")
  task.action = action
  if params.transportUrls <> invalid
    task.transportUrls = params.transportUrls
  else if m.addonUrls <> invalid and m.addonUrls.Count() > 0
    task.transportUrls = m.addonUrls
  end if
  if params.contentType <> invalid then task.contentType = params.contentType
  if params.contentId <> invalid then task.contentId = params.contentId
  if params.searchQuery <> invalid then task.searchQuery = params.searchQuery
  task.observeField("result", "onTaskResult")
  task.control = "RUN"
end sub

sub onTaskResult(event as Object)
  result = event.getData()
  if result = invalid then return
  if result.action = "addons" then onAddonsLoaded(result)
  if result.action = "catalogs" then onCatalogsLoaded(result)
  if result.action = "streams" then onStreamsLoaded(result)
  if result.action = "search" then onSearchResults(result)
end sub

' ═══════════ DATA ═══════════

sub onAddonsLoaded(result as Object)
  m.addons = result.addons
  urls = []
  for each addon in m.addons
    urls.Push(addon.transportUrl)
  end for
  m.addonUrls = urls

  content = CreateObject("roSGNode", "ContentNode")
  for each addon in m.addons
    node = content.CreateChild("ContentNode")
    node.title = addon.name + "  ·  " + addon.role + "  ·  v" + addon.version
  end for
  m.addonList.content = content
  m.statusLabel.text = m.addons.Count().ToStr() + " sources connected"
  runTask("loadCatalogs")
end sub

sub onCatalogsLoaded(result as Object)
  m.allMetas = result.allMetas

  gridContent = CreateObject("roSGNode", "ContentNode")
  for each meta in m.allMetas
    node = gridContent.CreateChild("ContentNode")
    node.title = meta.name
    if meta.poster <> invalid then node.hdPosterUrl = meta.poster
    if meta.releaseInfo <> invalid then node.shortDescriptionLine2 = meta.releaseInfo
  end for
  m.homeGrid.content = gridContent
  m.statusLabel.text = m.allMetas.Count().ToStr() + " titles available"

  if m.allMetas.Count() > 0
    setHero(m.allMetas[0])
  else
    m.heroTitle.text = "NovaCast"
    m.heroDesc.text = "No content loaded. Press Options to manage sources."
  end if
  m.homeGrid.setFocus(true)
end sub

sub onStreamsLoaded(result as Object)
  allStreams = result.streams
  m.currentStreams = []

  srcContent = CreateObject("roSGNode", "ContentNode")
  playableCount = 0
  torrentCount = 0

  for i = 0 to allStreams.Count() - 1
    stream = allStreams[i]
    node = srcContent.CreateChild("ContentNode")
    if stream.playable = true
      node.title = "  ▶  " + stream.label + "  [" + UCase(stream.format) + "]"
      playableCount = playableCount + 1
    else
      node.title = "  ✕  " + stream.label
      torrentCount = torrentCount + 1
    end if
    m.currentStreams.Push(stream)
  end for

  m.sourceList.content = srcContent

  if allStreams.Count() > 0
    m.sourceList.visible = true
    if playableCount > 0
      m.noSrcLabel.visible = false
    else
      m.noSrcLabel.visible = true
      m.noSrcLabel.text = torrentCount.ToStr() + " torrent sources (need debrid for Roku). Try [HLS] sources."
    end if
    m.sourceList.setFocus(true)
  else
    m.noSrcLabel.visible = true
    m.noSrcLabel.text = "No sources found for this title."
    m.sourceList.visible = false
  end if
end sub

sub onSearchResults(result as Object)
  m.searchMetas = result.results
  searchContent = CreateObject("roSGNode", "ContentNode")
  for each meta in m.searchMetas
    node = searchContent.CreateChild("ContentNode")
    node.title = meta.name
    if meta.poster <> invalid then node.hdPosterUrl = meta.poster
    if meta.releaseInfo <> invalid then node.shortDescriptionLine2 = meta.releaseInfo
  end for
  m.searchGrid.content = searchContent
  m.searchInfo.text = m.searchMetas.Count().ToStr() + " results found"
  navigateTo("search")
  m.searchGrid.setFocus(true)
end sub

' ═══════════ HERO ═══════════

sub setHero(meta as Object)
  if meta = invalid then return
  m.heroTitle.text = meta.name
  if meta.type <> invalid
    m.heroType.text = UCase(meta.type)
  else
    m.heroType.text = ""
  end if
  if meta.description <> invalid
    desc = meta.description
    if Len(desc) > 120 then desc = Left(desc, 117) + "..."
    m.heroDesc.text = desc
  else
    m.heroDesc.text = ""
  end if
  parts = []
  if meta.releaseInfo <> invalid then parts.Push(meta.releaseInfo)
  if meta.genres <> invalid and type(meta.genres) = "roArray" and meta.genres.Count() > 0
    parts.Push(meta.genres[0])
  end if
  m.heroMeta.text = parts.Join("  ·  ")
  if meta.background <> invalid
    m.heroPoster.uri = meta.background
  else if meta.poster <> invalid
    m.heroPoster.uri = meta.poster
  end if
end sub

sub onHomeItemSelected(event as Object)
  index = event.getData()
  if index >= 0 and index < m.allMetas.Count()
    showDetail(m.allMetas[index])
  end if
end sub

sub onHomeItemFocused(event as Object)
  index = event.getData()
  if index >= 0 and index < m.allMetas.Count()
    setHero(m.allMetas[index])
  end if
end sub

' ═══════════ NAVIGATION ═══════════

sub navigateTo(name as String)
  if m.currentScreen <> "" and m.currentScreen <> name
    m.screenStack.Push(m.currentScreen)
  end if
  activateScreen(name)
end sub

sub activateScreen(name as String)
  m.homeScreen.visible = false
  m.detailScreen.visible = false
  m.searchScreen.visible = false
  m.sourcesScreen.visible = false
  m.playerScreen.visible = false

  m.currentScreen = name

  if name = "home"
    m.homeScreen.visible = true
    m.homeGrid.setFocus(true)
  else if name = "detail"
    m.detailScreen.visible = true
    if m.sourceList.content <> invalid and m.sourceList.content.getChildCount() > 0
      m.sourceList.setFocus(true)
    else
      m.detailTitle.setFocus(true)
    end if
  else if name = "search"
    m.searchScreen.visible = true
    m.searchGrid.setFocus(true)
  else if name = "sources"
    m.sourcesScreen.visible = true
    m.addonList.setFocus(true)
  else if name = "player"
    m.playerScreen.visible = true
    m.playerScreen.setFocus(true)
  end if
end sub

sub goBack()
  if m.screenStack.Count() > 0
    prev = m.screenStack.Pop()
    activateScreen(prev)
  else
    activateScreen("home")
  end if
end sub

' ═══════════ DETAIL ═══════════

sub showDetail(meta as Object)
  if meta = invalid then return
  m.currentMeta = meta
  m.detailTitle.text = meta.name
  if meta.type <> invalid
    m.detailType.text = UCase(meta.type)
  else
    m.detailType.text = ""
  end if

  parts = []
  if meta.releaseInfo <> invalid then parts.Push(meta.releaseInfo)
  if meta.runtime <> invalid then parts.Push(meta.runtime)
  m.detailMeta.text = parts.Join("  ·  ")

  if meta.description <> invalid
    desc = meta.description
    if Len(desc) > 300 then desc = Left(desc, 297) + "..."
    m.detailDesc.text = desc
  else
    m.detailDesc.text = ""
  end if

  if meta.genres <> invalid and type(meta.genres) = "roArray"
    m.detailGenres.text = meta.genres.Join("  ·  ")
  else
    m.detailGenres.text = ""
  end if

  ' Set images
  if meta.background <> invalid
    m.detailBg.uri = meta.background
  else if meta.poster <> invalid
    m.detailBg.uri = meta.poster
  else
    m.detailBg.uri = ""
  end if

  if meta.poster <> invalid
    m.detailPoster.uri = meta.poster
  else
    m.detailPoster.uri = ""
  end if

  ' Clear sources
  m.sourceList.content = CreateObject("roSGNode", "ContentNode")
  m.currentStreams = []
  m.noSrcLabel.visible = true
  m.noSrcLabel.text = "Loading sources..."
  m.sourceList.visible = false
  navigateTo("detail")

  videoId = meta.id
  if meta.behaviorHints <> invalid and meta.behaviorHints.defaultVideoId <> invalid
    videoId = meta.behaviorHints.defaultVideoId
  end if
  runTask("loadStreams", { contentType: meta.type, contentId: videoId })
end sub

sub onSourceSelected(event as Object)
  index = event.getData()
  if index >= 0 and index < m.currentStreams.Count()
    stream = m.currentStreams[index]
    if stream.playable = true and stream.url <> invalid and stream.url <> ""
      title = ""
      if m.currentMeta <> invalid then title = m.currentMeta.name
      playStream(stream.url, stream.format, title)
    else
      dialog = createObject("roSGNode", "StandardMessageDialog")
      dialog.title = "Not Playable on Roku"
      dialog.message = ["This source requires a debrid service to", "convert torrents into direct streams.", "", "Try selecting a source marked with [HLS]."]
      dialog.buttons = ["OK"]
      dialog.observeField("buttonSelected", "onDialogClose")
      m.top.dialog = dialog
    end if
  end if
end sub

sub onDialogClose()
  if m.top.dialog <> invalid then m.top.dialog.close = true
end sub

' ═══════════ PLAYBACK ═══════════

sub playStream(url as String, fmt as String, title as String)
  if url = invalid or url = ""
    showError("No stream URL available")
    return
  end if

  vc = CreateObject("roSGNode", "ContentNode")
  vc.url = url
  vc.title = title
  vc.streamFormat = fmt
  if m.currentMeta <> invalid
    if m.currentMeta.poster <> invalid then vc.hdPosterUrl = m.currentMeta.poster
    if m.currentMeta.description <> invalid then vc.description = m.currentMeta.description
  end if
  if fmt = "hls" or fmt = "dash" then vc.switchingStrategy = "full-adaptation"

  m.playerScreen.content = vc
  navigateTo("player")
end sub

sub onPlayerAction()
  action = m.playerScreen.action
  if action = "close"
    m.playerScreen.visible = false
    if m.screenStack.Count() > 0
      prev = m.screenStack.Pop()
      activateScreen(prev)
    else
      activateScreen("home")
    end if
  end if
end sub

sub showError(msg as String)
  dialog = createObject("roSGNode", "StandardMessageDialog")
  dialog.title = "Error"
  dialog.message = [msg]
  dialog.buttons = ["OK"]
  dialog.observeField("buttonSelected", "onDialogClose")
  m.top.dialog = dialog
end sub

' ═══════════ SEARCH ═══════════

sub openSearchDialog()
  dialog = createObject("roSGNode", "KeyboardDialog")
  dialog.title = "Search NovaCast"
  dialog.buttons = ["Search", "Cancel"]
  dialog.observeField("buttonSelected", "onSearchDialogButton")
  m.top.dialog = dialog
end sub

sub onSearchDialogButton()
  dialog = m.top.dialog
  if dialog = invalid then return
  buttonIndex = dialog.buttonSelected
  if buttonIndex = 0
    query = dialog.text
    if query <> invalid and Len(query) >= 2
      m.searchInfo.text = "Searching..."
      dialog.close = true
      runTask("search", { searchQuery: query })
    end if
  else
    dialog.close = true
  end if
end sub

sub onSearchItemSelected(event as Object)
  index = event.getData()
  if index >= 0 and index < m.searchMetas.Count()
    showDetail(m.searchMetas[index])
  end if
end sub

' ═══════════ KEYS ═══════════

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press then return false

  if key = "back"
    if m.currentScreen = "home" then return false
    goBack()
    return true
  end if

  if key = "options"
    navigateTo("sources")
    return true
  end if

  if key = "replay"
    openSearchDialog()
    return true
  end if

  if key = "play"
    if m.currentScreen = "detail" and m.currentStreams.Count() > 0
      for each stream in m.currentStreams
        if stream.playable = true and stream.url <> invalid and stream.url <> ""
          title = ""
          if m.currentMeta <> invalid then title = m.currentMeta.name
          playStream(stream.url, stream.format, title)
          return true
        end if
      end for
    end if
  end if

  return false
end function
