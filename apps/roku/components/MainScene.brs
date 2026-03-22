sub init()
  m.top.backgroundURI = ""
  m.top.backgroundColor = "0x080C18FF"

  ' Cache UI nodes
  m.navLabel = m.top.findNode("navLabel")
  m.homeScreen = m.top.findNode("homeScreen")
  m.detailScreen = m.top.findNode("detailScreen")
  m.searchScreen = m.top.findNode("searchScreen")
  m.sourcesScreen = m.top.findNode("sourcesScreen")
  m.videoPlayer = m.top.findNode("videoPlayer")

  m.heroPoster = m.top.findNode("heroPoster")
  m.heroType = m.top.findNode("heroType")
  m.heroTitle = m.top.findNode("heroTitle")
  m.heroDesc = m.top.findNode("heroDesc")
  m.heroMeta = m.top.findNode("heroMeta")

  m.homeGrid = m.top.findNode("homeGrid")
  m.detailBg = m.top.findNode("detailBg")
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

  ' App state
  m.currentScreen = "home"
  m.screenStack = []
  m.allMetas = []
  m.searchMetas = []
  m.addons = []
  m.addonUrls = []
  m.currentMeta = invalid
  m.currentStreams = []

  ' Observers
  m.videoPlayer.observeField("state", "onVideoStateChange")
  m.homeGrid.observeField("itemSelected", "onHomeItemSelected")
  m.homeGrid.observeField("itemFocused", "onHomeItemFocused")
  m.sourceList.observeField("itemSelected", "onSourceSelected")
  m.searchGrid.observeField("itemSelected", "onSearchItemSelected")

  ' Focus home grid
  m.homeGrid.setFocus(true)

  ' Load data
  runTask("loadAddons")
end sub

' ══════════════ TASK MANAGEMENT ══════════════

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

' ══════════════ DATA CALLBACKS ══════════════

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
    node.title = addon.name + " (" + addon.role + ") v" + addon.version
  end for
  m.addonList.content = content

  m.navLabel.text = m.addons.Count().ToStr() + " sources"
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
  m.navLabel.text = m.allMetas.Count().ToStr() + " titles"

  if m.allMetas.Count() > 0
    setHero(m.allMetas[0])
  else
    m.heroTitle.text = "NovaCast"
    m.heroDesc.text = "No content. Press Options to manage sources."
  end if
  m.homeGrid.setFocus(true)
end sub

sub onStreamsLoaded(result as Object)
  m.currentStreams = result.streams
  srcContent = CreateObject("roSGNode", "ContentNode")
  for each stream in m.currentStreams
    node = srcContent.CreateChild("ContentNode")
    node.title = stream.label + "  [" + UCase(stream.format) + "]"
  end for
  m.sourceList.content = srcContent

  if m.currentStreams.Count() > 0
    m.noSrcLabel.visible = false
    m.sourceList.visible = true
    m.sourceList.setFocus(true)
  else
    m.noSrcLabel.visible = true
    m.noSrcLabel.text = "No playable sources found."
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
  m.searchInfo.text = m.searchMetas.Count().ToStr() + " results"
  showScreen("search")
  m.searchGrid.setFocus(true)
end sub

' ══════════════ HERO ══════════════

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
    if Len(desc) > 150 then desc = Left(desc, 150) + "..."
    m.heroDesc.text = desc
  else
    m.heroDesc.text = ""
  end if
  parts = []
  if meta.releaseInfo <> invalid then parts.Push(meta.releaseInfo)
  m.heroMeta.text = parts.Join("  |  ")
  if meta.background <> invalid
    m.heroPoster.uri = meta.background
  else if meta.poster <> invalid
    m.heroPoster.uri = meta.poster
  end if
end sub

' ══════════════ HOME EVENTS ══════════════

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

' ══════════════ NAVIGATION ══════════════

sub showScreen(name as String)
  m.homeScreen.visible = (name = "home")
  m.detailScreen.visible = (name = "detail")
  m.searchScreen.visible = (name = "search")
  m.sourcesScreen.visible = (name = "sources")
  m.videoPlayer.visible = (name = "player")

  if m.currentScreen <> name then m.screenStack.Push(m.currentScreen)
  m.currentScreen = name

  if name = "home"
    m.navLabel.text = "Home"
    m.homeGrid.setFocus(true)
  else if name = "detail"
    m.navLabel.text = "Details"
    if m.sourceList.content <> invalid and m.sourceList.content.getChildCount() > 0
      m.sourceList.setFocus(true)
    else
      m.detailTitle.setFocus(true)
    end if
  else if name = "search"
    m.navLabel.text = "Search"
    m.searchGrid.setFocus(true)
  else if name = "sources"
    m.navLabel.text = "Sources"
    m.addonList.setFocus(true)
  else if name = "player"
    m.navLabel.text = ""
    m.videoPlayer.setFocus(true)
  end if
end sub

sub goBack()
  if m.currentScreen = "player"
    m.videoPlayer.control = "stop"
    m.videoPlayer.visible = false
    showScreen("detail")
    return
  end if
  if m.screenStack.Count() > 0
    prev = m.screenStack.Pop()
    m.currentScreen = ""
    showScreen(prev)
  end if
end sub

' ══════════════ DETAIL ══════════════

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
  m.detailMeta.text = parts.Join("  |  ")

  if meta.description <> invalid
    desc = meta.description
    if Len(desc) > 250 then desc = Left(desc, 250) + "..."
    m.detailDesc.text = desc
  else
    m.detailDesc.text = ""
  end if

  if meta.genres <> invalid and type(meta.genres) = "roArray"
    m.detailGenres.text = meta.genres.Join("  ·  ")
  else
    m.detailGenres.text = ""
  end if

  if meta.background <> invalid
    m.detailBg.uri = meta.background
  else if meta.poster <> invalid
    m.detailBg.uri = meta.poster
  else
    m.detailBg.uri = ""
  end if

  m.sourceList.content = CreateObject("roSGNode", "ContentNode")
  m.currentStreams = []
  m.noSrcLabel.visible = true
  m.noSrcLabel.text = "Loading sources..."
  m.sourceList.visible = false
  showScreen("detail")

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
    title = ""
    if m.currentMeta <> invalid then title = m.currentMeta.name
    playStream(stream.url, stream.format, title)
  end if
end sub

' ══════════════ PLAYBACK ══════════════

sub playStream(url as String, fmt as String, title as String)
  vc = CreateObject("roSGNode", "ContentNode")
  vc.url = url
  vc.title = title
  vc.streamFormat = fmt
  if m.currentMeta <> invalid and m.currentMeta.poster <> invalid
    vc.hdPosterUrl = m.currentMeta.poster
  end if
  m.videoPlayer.content = vc
  m.videoPlayer.control = "play"
  showScreen("player")
end sub

sub onVideoStateChange()
  state = m.videoPlayer.state
  if state = "error" or state = "finished"
    m.videoPlayer.control = "stop"
    m.videoPlayer.visible = false
    showScreen("detail")
  end if
end sub

' ══════════════ SEARCH ══════════════

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
    ' Search button pressed
    query = dialog.text
    if query <> invalid and Len(query) >= 2
      m.searchInfo.text = "Searching..."
      dialog.close = true
      runTask("search", { searchQuery: query })
    end if
  else
    ' Cancel
    dialog.close = true
  end if
end sub

sub onSearchItemSelected(event as Object)
  index = event.getData()
  if index >= 0 and index < m.searchMetas.Count()
    showDetail(m.searchMetas[index])
  end if
end sub

' ══════════════ KEY HANDLING ══════════════

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press then return false

  if key = "back"
    if m.currentScreen = "home" then return false
    goBack()
    return true
  end if

  if key = "options"
    showScreen("sources")
    return true
  end if

  if key = "replay"
    openSearchDialog()
    return true
  end if

  if key = "play"
    if m.currentScreen = "detail" and m.currentStreams.Count() > 0
      stream = m.currentStreams[0]
      title = ""
      if m.currentMeta <> invalid then title = m.currentMeta.name
      playStream(stream.url, stream.format, title)
      return true
    end if
  end if

  return false
end function
