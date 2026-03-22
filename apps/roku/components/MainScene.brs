sub init()
  m.top.backgroundURI = ""
  m.top.backgroundColor = "0x080C18FF"

  ' ── Cache node references ──
  m.navLabel = m.top.findNode("navLabel")
  m.homeScreen = m.top.findNode("homeScreen")
  m.detailScreen = m.top.findNode("detailScreen")
  m.searchScreen = m.top.findNode("searchScreen")
  m.sourcesScreen = m.top.findNode("sourcesScreen")
  m.videoPlayer = m.top.findNode("videoPlayer")
  m.contentRows = m.top.findNode("contentRows")

  m.heroPoster = m.top.findNode("heroPoster")
  m.heroTitle = m.top.findNode("heroTitle")
  m.heroDesc = m.top.findNode("heroDesc")
  m.heroMeta = m.top.findNode("heroMeta")

  m.detailBg = m.top.findNode("detailBg")
  m.detailTitle = m.top.findNode("detailTitle")
  m.detailMeta = m.top.findNode("detailMeta")
  m.detailDesc = m.top.findNode("detailDesc")
  m.detailGenres = m.top.findNode("detailGenres")
  m.sourceList = m.top.findNode("sourceList")
  m.noSrcLabel = m.top.findNode("noSrcLabel")

  m.searchKeyboard = m.top.findNode("searchKeyboard")
  m.searchGrid = m.top.findNode("searchGrid")
  m.searchInfo = m.top.findNode("searchInfo")

  m.addonList = m.top.findNode("addonList")

  ' ── App state ──
  m.currentScreen = "home"
  m.screenStack = []
  m.allMetas = []
  m.addons = []
  m.addonUrls = []
  m.currentMeta = invalid
  m.currentStreams = []

  ' ── Set initial UI ──
  m.navLabel.text = "Loading..."
  m.heroTitle.text = "NovaCast"
  m.heroDesc.text = "Loading your content sources..."

  ' ── Observe video player ──
  m.videoPlayer.observeField("state", "onVideoStateChange")

  ' ── Observe RowList item selection ──
  m.contentRows.observeField("rowItemSelected", "onRowItemSelected")
  m.sourceList.observeField("itemSelected", "onSourceSelected")
  m.searchGrid.observeField("itemSelected", "onSearchItemSelected")

  ' ── Give focus to the content rows immediately ──
  m.contentRows.setFocus(true)

  ' ── Start loading addons in a background Task ──
  startTask("loadAddons")
end sub

' ═══════════════════════════════════════════════════════════
' TASK MANAGEMENT — All network calls run here, off the render thread
' ═══════════════════════════════════════════════════════════

sub startTask(action as String, params = {} as Object)
  task = createObject("roSGNode", "LoadTask")
  task.action = action

  if params.transportUrls <> invalid
    task.transportUrls = params.transportUrls
  else if m.addonUrls.Count() > 0
    task.transportUrls = m.addonUrls
  end if

  if params.contentType <> invalid then task.contentType = params.contentType
  if params.contentId <> invalid then task.contentId = params.contentId
  if params.searchQuery <> invalid then task.searchQuery = params.searchQuery

  task.observeField("result", "onTaskResult")
  task.control = "run"
end sub

sub onTaskResult(event as Object)
  result = event.getData()
  if result = invalid then return

  action = result.action

  if action = "addons"
    onAddonsLoaded(result)
  else if action = "catalogs"
    onCatalogsLoaded(result)
  else if action = "streams"
    onStreamsLoaded(result)
  else if action = "search"
    onSearchResults(result)
  else if action = "meta"
    onMetaLoaded(result)
  end if
end sub

' ═══════════════════════════════════════════════════════════
' ADDON LOADING
' ═══════════════════════════════════════════════════════════

sub onAddonsLoaded(result as Object)
  m.addons = result.addons

  ' Collect transport URLs for catalog loading
  urls = []
  for each addon in m.addons
    urls.Push(addon.transportUrl)
  end for
  m.addonUrls = urls

  ' Populate sources screen
  content = CreateObject("roSGNode", "ContentNode")
  for each addon in m.addons
    node = content.CreateChild("ContentNode")
    node.title = addon.name + " (" + addon.role + ") v" + addon.version
  end for
  m.addonList.content = content

  m.navLabel.text = m.addons.Count().ToStr() + " sources loaded"

  ' Now load catalogs
  startTask("loadCatalogs")
end sub

' ═══════════════════════════════════════════════════════════
' CATALOG LOADING
' ═══════════════════════════════════════════════════════════

sub onCatalogsLoaded(result as Object)
  m.allMetas = result.allMetas
  rows = result.rows

  ' Build RowList content tree
  rowContent = CreateObject("roSGNode", "ContentNode")
  for each rowData in rows
    rowNode = rowContent.CreateChild("ContentNode")
    rowNode.title = rowData.title

    for each meta in rowData.items
      itemNode = rowNode.CreateChild("ContentNode")
      itemNode.title = meta.name
      if meta.poster <> invalid then itemNode.hdPosterUrl = meta.poster
      if meta.description <> invalid then itemNode.description = meta.description

      metaLine = ""
      if meta.releaseInfo <> invalid then metaLine = meta.releaseInfo
      if meta.imdbRating <> invalid
        rating = ""
        if type(meta.imdbRating) = "roFloat" or type(meta.imdbRating) = "Float"
          rating = Str(meta.imdbRating).Trim()
        else if type(meta.imdbRating) = "roInteger" or type(meta.imdbRating) = "Integer"
          rating = Str(meta.imdbRating).Trim()
        else
          rating = meta.imdbRating.ToStr()
        end if
        if metaLine <> "" then metaLine = metaLine + "  "
        metaLine = metaLine + "★ " + rating
      end if
      itemNode.shortDescriptionLine2 = metaLine

      ' Store meta identifiers
      itemNode.addFields({ metaId: "", metaType: "" })
      if meta.id <> invalid then itemNode.metaId = meta.id
      if meta.type <> invalid then itemNode.metaType = meta.type
    end for
  end for

  m.contentRows.content = rowContent
  m.navLabel.text = rows.Count().ToStr() + " catalogs · " + m.allMetas.Count().ToStr() + " titles"

  ' Set hero from first meta
  if m.allMetas.Count() > 0
    setHero(m.allMetas[0])
  else
    m.heroTitle.text = "NovaCast"
    m.heroDesc.text = "No content loaded. Add sources in the Sources screen."
  end if

  m.contentRows.setFocus(true)
end sub

' ═══════════════════════════════════════════════════════════
' HERO BANNER
' ═══════════════════════════════════════════════════════════

sub setHero(meta as Object)
  if meta = invalid then return

  m.heroTitle.text = meta.name

  if meta.description <> invalid
    m.heroDesc.text = Left(meta.description, 200)
  else
    m.heroDesc.text = ""
  end if

  metaParts = []
  if meta.releaseInfo <> invalid then metaParts.Push(meta.releaseInfo)
  if meta.type <> invalid then metaParts.Push(UCase(meta.type))
  if meta.imdbRating <> invalid
    if type(meta.imdbRating) = "roFloat" or type(meta.imdbRating) = "Float"
      metaParts.Push("★ " + Str(meta.imdbRating).Trim())
    else
      metaParts.Push("★ " + meta.imdbRating.ToStr())
    end if
  end if
  m.heroMeta.text = metaParts.Join("  |  ")

  if meta.background <> invalid
    m.heroPoster.uri = meta.background
  else if meta.poster <> invalid
    m.heroPoster.uri = meta.poster
  end if
end sub

' ═══════════════════════════════════════════════════════════
' ROW ITEM SELECTION
' ═══════════════════════════════════════════════════════════

sub onRowItemSelected(event as Object)
  indices = event.getData()
  if indices = invalid or type(indices) <> "roArray" or indices.Count() < 2 then return

  rowContent = m.contentRows.content
  if rowContent = invalid then return

  row = rowContent.getChild(indices[0])
  if row = invalid then return

  item = row.getChild(indices[1])
  if item = invalid then return

  metaId = ""
  metaType = ""
  if item.hasField("metaId") then metaId = item.metaId
  if item.hasField("metaType") then metaType = item.metaType

  foundMeta = findMetaById(metaId)
  if foundMeta <> invalid
    showDetail(foundMeta)
  end if
end sub

' ═══════════════════════════════════════════════════════════
' NAVIGATION
' ═══════════════════════════════════════════════════════════

sub showScreen(screenName as String)
  m.homeScreen.visible = (screenName = "home")
  m.detailScreen.visible = (screenName = "detail")
  m.searchScreen.visible = (screenName = "search")
  m.sourcesScreen.visible = (screenName = "sources")
  m.videoPlayer.visible = (screenName = "player")

  if m.currentScreen <> screenName
    m.screenStack.Push(m.currentScreen)
  end if
  m.currentScreen = screenName

  if screenName = "home"
    m.navLabel.text = "Home"
    m.contentRows.setFocus(true)
  else if screenName = "detail"
    m.navLabel.text = "Details"
    if m.sourceList.content <> invalid and m.sourceList.content.getChildCount() > 0
      m.sourceList.setFocus(true)
    else
      m.noSrcLabel.setFocus(true)
    end if
  else if screenName = "search"
    m.navLabel.text = "Search"
    m.searchKeyboard.setFocus(true)
  else if screenName = "sources"
    m.navLabel.text = "Sources"
    m.addonList.setFocus(true)
  else if screenName = "player"
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

' ═══════════════════════════════════════════════════════════
' DETAIL SCREEN
' ═══════════════════════════════════════════════════════════

sub showDetail(meta as Object)
  if meta = invalid then return

  m.currentMeta = meta
  m.detailTitle.text = meta.name

  metaParts = []
  if meta.releaseInfo <> invalid then metaParts.Push(meta.releaseInfo)
  if meta.type <> invalid then metaParts.Push(UCase(meta.type))
  if meta.runtime <> invalid then metaParts.Push(meta.runtime)
  m.detailMeta.text = metaParts.Join("  |  ")

  if meta.description <> invalid
    m.detailDesc.text = Left(meta.description, 300)
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

  ' Clear existing sources
  m.sourceList.content = CreateObject("roSGNode", "ContentNode")
  m.currentStreams = []
  m.noSrcLabel.visible = true
  m.noSrcLabel.text = "Loading streams..."
  m.sourceList.visible = false

  showScreen("detail")

  ' Load streams in background
  videoId = meta.id
  if meta.behaviorHints <> invalid and meta.behaviorHints.defaultVideoId <> invalid
    videoId = meta.behaviorHints.defaultVideoId
  end if

  startTask("loadStreams", {
    contentType: meta.type,
    contentId: videoId
  })
end sub

sub onStreamsLoaded(result as Object)
  streams = result.streams
  m.currentStreams = streams

  sourceContent = CreateObject("roSGNode", "ContentNode")
  for each stream in streams
    node = sourceContent.CreateChild("ContentNode")
    node.title = stream.label + "  [" + UCase(stream.format) + "]"
  end for

  m.sourceList.content = sourceContent

  if streams.Count() > 0
    m.noSrcLabel.visible = false
    m.sourceList.visible = true
    m.sourceList.setFocus(true)
  else
    m.noSrcLabel.visible = true
    m.noSrcLabel.text = "No playable sources found. Add a playback addon."
    m.sourceList.visible = false
  end if
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

' ═══════════════════════════════════════════════════════════
' VIDEO PLAYBACK
' ═══════════════════════════════════════════════════════════

sub playStream(streamUrl as String, streamFormat as String, title as String)
  videoContent = CreateObject("roSGNode", "ContentNode")
  videoContent.url = streamUrl
  videoContent.title = title
  videoContent.streamFormat = streamFormat

  if m.currentMeta <> invalid
    if m.currentMeta.poster <> invalid then videoContent.hdPosterUrl = m.currentMeta.poster
    if m.currentMeta.description <> invalid then videoContent.description = m.currentMeta.description
  end if

  m.videoPlayer.content = videoContent
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

' ═══════════════════════════════════════════════════════════
' SEARCH
' ═══════════════════════════════════════════════════════════

sub onSearchItemSelected(event as Object)
  index = event.getData()
  gridContent = m.searchGrid.content
  if gridContent = invalid then return

  item = gridContent.getChild(index)
  if item = invalid then return

  metaId = ""
  if item.hasField("metaId") then metaId = item.metaId

  foundMeta = findMetaById(metaId)
  if foundMeta <> invalid
    showDetail(foundMeta)
  end if
end sub

' ═══════════════════════════════════════════════════════════
' KEY HANDLING
' ═══════════════════════════════════════════════════════════

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press then return false

  if key = "back"
    if m.currentScreen = "home"
      return false
    end if
    goBack()
    return true
  end if

  if key = "options"
    showScreen("sources")
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

  ' Star button → Search
  if key = "replay"
    showScreen("search")
    return true
  end if

  ' Search keyboard submit
  if m.currentScreen = "search"
    if key = "down" and m.searchKeyboard.isInFocusChain()
      query = ""
      if m.searchKeyboard.text <> invalid then query = m.searchKeyboard.text
      if query <> "" and Len(query) >= 2
        m.searchInfo.text = "Searching..."
        startTask("search", { searchQuery: query })
        m.searchGrid.setFocus(true)
      end if
      return true
    else if key = "up" and m.searchGrid.isInFocusChain()
      m.searchKeyboard.setFocus(true)
      return true
    end if
  end if

  ' Update hero on home focus change
  if m.currentScreen = "home" and (key = "left" or key = "right")
    updateHeroFromFocus()
  end if

  return false
end function

sub onSearchResults(result as Object)
  results = result.results

  searchContent = CreateObject("roSGNode", "ContentNode")
  for each meta in results
    node = searchContent.CreateChild("ContentNode")
    node.title = meta.name
    if meta.poster <> invalid then node.hdPosterUrl = meta.poster
    if meta.releaseInfo <> invalid then node.shortDescriptionLine2 = meta.releaseInfo
    node.addFields({ metaId: "", metaType: "" })
    if meta.id <> invalid then node.metaId = meta.id
    if meta.type <> invalid then node.metaType = meta.type
  end for

  m.searchGrid.content = searchContent
  m.searchInfo.text = results.Count().ToStr() + " results found"
end sub

sub onMetaLoaded(result as Object)
  if result.meta <> invalid
    showDetail(result.meta)
  end if
end sub

sub updateHeroFromFocus()
  indices = m.contentRows.rowItemFocused
  if indices = invalid or type(indices) <> "roArray" or indices.Count() < 2 then return

  rowContent = m.contentRows.content
  if rowContent = invalid then return

  row = rowContent.getChild(indices[0])
  if row = invalid then return

  item = row.getChild(indices[1])
  if item = invalid then return

  metaId = ""
  if item.hasField("metaId") then metaId = item.metaId

  foundMeta = findMetaById(metaId)
  if foundMeta <> invalid
    setHero(foundMeta)
  end if
end sub

function findMetaById(id as String) as Object
  for each meta in m.allMetas
    if meta.id <> invalid and meta.id = id
      return meta
    end if
  end for
  return invalid
end function
