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

  ' Hero elements
  m.heroPoster = m.top.findNode("heroPoster")
  m.heroTitle = m.top.findNode("heroTitle")
  m.heroDesc = m.top.findNode("heroDesc")
  m.heroMeta = m.top.findNode("heroMeta")

  ' Detail elements
  m.detailBg = m.top.findNode("detailBg")
  m.detailTitle = m.top.findNode("detailTitle")
  m.detailMeta = m.top.findNode("detailMeta")
  m.detailDesc = m.top.findNode("detailDesc")
  m.detailGenres = m.top.findNode("detailGenres")
  m.sourceList = m.top.findNode("sourceList")
  m.noSrcLabel = m.top.findNode("noSrcLabel")

  ' Search elements
  m.searchKeyboard = m.top.findNode("searchKeyboard")
  m.searchGrid = m.top.findNode("searchGrid")
  m.searchInfo = m.top.findNode("searchInfo")

  ' Sources elements
  m.addonList = m.top.findNode("addonList")

  ' ── App state ──
  m.currentScreen = "home"
  m.screenStack = []
  m.allMetas = []
  m.currentMeta = invalid
  m.currentStreams = []
  m.registry = CreateAddonRegistry()

  ' ── Observe video player events ──
  m.videoPlayer.observeField("state", "onVideoStateChange")

  ' ── Load content ──
  loadAddons()
  loadCatalogs()
end sub

' ═══════════════════════════════════════════════════════════
' ADDON & CATALOG LOADING
' ═══════════════════════════════════════════════════════════

sub loadAddons()
  m.addons = m.registry.GetDefaultAddonItems()

  content = CreateObject("roSGNode", "ContentNode")
  for each addon in m.addons
    node = content.CreateChild("ContentNode")
    node.title = addon.name + " (v" + addon.version + ") - " + addon.role
    node.description = addon.description
  end for

  m.addonList.content = content
end sub

sub loadCatalogs()
  m.allMetas = []
  rowContent = CreateObject("roSGNode", "ContentNode")
  catalogCount = 0

  for each addon in m.addons
    if addon.manifest <> invalid and addon.manifest.catalogs <> invalid
      for each catalog in addon.manifest.catalogs
        ' Skip search-only catalogs
        hasSearchExtra = false
        isRequired = false
        if catalog.extra <> invalid
          for each extra in catalog.extra
            if extra.name = "search"
              hasSearchExtra = true
              if extra.isRequired <> invalid and extra.isRequired = true
                isRequired = true
              end if
            end if
          end for
        end if
        if isRequired then continue for

        catalogData = FetchCatalog(addon.transportUrl, catalog.type, catalog.id)
        if catalogData <> invalid and catalogData.metas <> invalid
          rowNode = rowContent.CreateChild("ContentNode")
          catalogName = catalog.id
          if catalog.name <> invalid and catalog.name <> ""
            catalogName = catalog.name
          end if
          rowNode.title = catalogName

          for each meta in catalogData.metas
            itemNode = rowNode.CreateChild("ContentNode")
            itemNode.title = meta.name
            if meta.poster <> invalid then itemNode.hdPosterUrl = meta.poster
            if meta.posterShape <> invalid then itemNode.hdPosterUrl = meta.poster
            if meta.description <> invalid then itemNode.description = meta.description
            if meta.releaseInfo <> invalid
              itemNode.shortDescriptionLine2 = meta.releaseInfo
            end if

            ' Store metadata for later retrieval
            itemNode.addFields({ metaId: meta.id, metaType: meta.type })
            if meta.imdbRating <> invalid
              itemNode.shortDescriptionLine2 = "★ " + meta.imdbRating.ToStr()
              if meta.releaseInfo <> invalid
                itemNode.shortDescriptionLine2 = meta.releaseInfo + "  ★ " + meta.imdbRating.ToStr()
              end if
            end if

            m.allMetas.Push(meta)
          end for
          catalogCount = catalogCount + 1
        end if
      end for
    end if
  end for

  m.contentRows.content = rowContent

  ' Set hero from first available meta
  if m.allMetas.Count() > 0
    setHero(m.allMetas[0])
  end if

  m.navLabel.text = catalogCount.ToStr() + " catalogs loaded"
  m.contentRows.setFocus(true)
end sub

sub setHero(meta as Object)
  if meta = invalid then return
  m.heroTitle.text = meta.name
  if meta.description <> invalid
    m.heroDesc.text = meta.description
  else
    m.heroDesc.text = ""
  end if

  metaParts = []
  if meta.releaseInfo <> invalid then metaParts.Push(meta.releaseInfo)
  if meta.type <> invalid then metaParts.Push(UCase(meta.type))
  if meta.imdbRating <> invalid then metaParts.Push("★ " + meta.imdbRating.ToStr())
  m.heroMeta.text = metaParts.Join("  |  ")

  if meta.background <> invalid
    m.heroPoster.uri = meta.background
  else if meta.poster <> invalid
    m.heroPoster.uri = meta.poster
  end if
end sub

' ═══════════════════════════════════════════════════════════
' NAVIGATION
' ═══════════════════════════════════════════════════════════

sub showScreen(screenName as String)
  ' Hide current screen
  m.homeScreen.visible = (screenName = "home")
  m.detailScreen.visible = (screenName = "detail")
  m.searchScreen.visible = (screenName = "search")
  m.sourcesScreen.visible = (screenName = "sources")
  m.videoPlayer.visible = (screenName = "player")

  ' Push to stack
  if m.currentScreen <> screenName
    m.screenStack.Push(m.currentScreen)
  end if
  m.currentScreen = screenName

  ' Set focus
  if screenName = "home"
    m.navLabel.text = "Home"
    m.contentRows.setFocus(true)
  else if screenName = "detail"
    m.navLabel.text = "Details"
    if m.sourceList.content <> invalid and m.sourceList.content.getChildCount() > 0
      m.sourceList.setFocus(true)
    else
      m.detailTitle.setFocus(true)
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
    stopPlayback()
    showScreen("detail")
    return
  end if

  if m.screenStack.Count() > 0
    previousScreen = m.screenStack.Pop()
    m.currentScreen = "" ' reset so showScreen pushes correctly
    showScreen(previousScreen)
  end if
end sub

' ═══════════════════════════════════════════════════════════
' DETAIL & STREAMS
' ═══════════════════════════════════════════════════════════

sub showDetail(meta as Object)
  if meta = invalid then return

  m.currentMeta = meta
  m.detailTitle.text = meta.name

  metaParts = []
  if meta.releaseInfo <> invalid then metaParts.Push(meta.releaseInfo)
  if meta.type <> invalid then metaParts.Push(UCase(meta.type))
  if meta.runtime <> invalid then metaParts.Push(meta.runtime)
  if meta.imdbRating <> invalid then metaParts.Push("★ " + meta.imdbRating.ToStr())
  m.detailMeta.text = metaParts.Join("  |  ")

  if meta.description <> invalid
    m.detailDesc.text = meta.description
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

  ' Load streams
  loadStreamsForMeta(meta)
  showScreen("detail")
end sub

sub loadStreamsForMeta(meta as Object)
  m.currentStreams = []
  sourceContent = CreateObject("roSGNode", "ContentNode")
  streamCount = 0

  videoId = meta.id
  if meta.behaviorHints <> invalid and meta.behaviorHints.defaultVideoId <> invalid
    videoId = meta.behaviorHints.defaultVideoId
  end if

  for each addon in m.addons
    if addon.hasStream = true
      streams = FetchStreams(addon.transportUrl, meta.type, videoId)
      if streams <> invalid and streams.streams <> invalid
        for each stream in streams.streams
          streamUrl = invalid
          streamFormat = "hls"
          streamLabel = addon.name

          if stream.url <> invalid
            streamUrl = stream.url
            if Instr(1, LCase(streamUrl), ".mpd") > 0
              streamFormat = "dash"
            else if Instr(1, LCase(streamUrl), ".mp4") > 0 or Instr(1, LCase(streamUrl), ".webm") > 0
              streamFormat = "mp4"
            end if
          end if

          if stream.title <> invalid and stream.title <> ""
            streamLabel = stream.title
          else if stream.name <> invalid and stream.name <> ""
            streamLabel = stream.name
          end if

          ' Build display label
          qualityLabel = UCase(streamFormat)
          if stream.behaviorHints <> invalid and stream.behaviorHints.bingeGroup <> invalid
            qualityLabel = qualityLabel + " · " + stream.behaviorHints.bingeGroup
          end if

          if streamUrl <> invalid
            node = sourceContent.CreateChild("ContentNode")
            node.title = streamLabel + "  [" + qualityLabel + "]"
            node.addFields({ streamUrl: streamUrl, streamFormat: streamFormat })
            m.currentStreams.Push({ url: streamUrl, format: streamFormat, label: streamLabel })
            streamCount = streamCount + 1
          end if
        end for
      end if
    end if
  end for

  m.sourceList.content = sourceContent
  if streamCount > 0
    m.noSrcLabel.visible = false
    m.sourceList.visible = true
  else
    m.noSrcLabel.visible = true
    m.sourceList.visible = false
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
    if m.currentMeta.poster <> invalid
      videoContent.hdPosterUrl = m.currentMeta.poster
    end if
    if m.currentMeta.description <> invalid
      videoContent.description = m.currentMeta.description
    end if
  end if

  m.videoPlayer.content = videoContent
  m.videoPlayer.control = "play"
  showScreen("player")
end sub

sub stopPlayback()
  m.videoPlayer.control = "stop"
  m.videoPlayer.visible = false
end sub

sub onVideoStateChange()
  state = m.videoPlayer.state
  if state = "error"
    stopPlayback()
    showScreen("detail")
  else if state = "finished"
    stopPlayback()
    showScreen("detail")
  end if
end sub

' ═══════════════════════════════════════════════════════════
' SEARCH
' ═══════════════════════════════════════════════════════════

sub performSearch(query as String)
  if query = "" or Len(query) < 2 then return

  searchContent = CreateObject("roSGNode", "ContentNode")
  resultCount = 0

  for each addon in m.addons
    if addon.searchable = true
      for each catalog in addon.manifest.catalogs
        ' Check if catalog supports search
        supportsSearch = false
        if catalog.extra <> invalid
          for each extra in catalog.extra
            if extra.name = "search" then supportsSearch = true
          end for
        end if

        if supportsSearch
          searchResult = FetchCatalog(addon.transportUrl, catalog.type, catalog.id, query)
          if searchResult <> invalid and searchResult.metas <> invalid
            for each meta in searchResult.metas
              node = searchContent.CreateChild("ContentNode")
              node.title = meta.name
              if meta.poster <> invalid then node.hdPosterUrl = meta.poster
              if meta.releaseInfo <> invalid then node.shortDescriptionLine2 = meta.releaseInfo
              node.addFields({ metaId: meta.id, metaType: meta.type })
              resultCount = resultCount + 1
            end for
          end if
        end if
      end for
    end if
  end for

  m.searchGrid.content = searchContent
  m.searchInfo.text = resultCount.ToStr() + " results for '" + query + "'"
end sub

' ═══════════════════════════════════════════════════════════
' KEY HANDLING
' ═══════════════════════════════════════════════════════════

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press then return false

  ' Back button
  if key = "back"
    if m.currentScreen = "home"
      return false ' let system handle exit
    end if
    goBack()
    return true
  end if

  ' Options button → Sources
  if key = "options"
    showScreen("sources")
    return true
  end if

  ' Play button on home/detail
  if key = "play"
    if m.currentScreen = "detail" and m.currentStreams.Count() > 0
      stream = m.currentStreams[0]
      title = ""
      if m.currentMeta <> invalid then title = m.currentMeta.name
      playStream(stream.url, stream.format, title)
      return true
    end if
  end if

  ' OK / Select button
  if key = "OK"
    if m.currentScreen = "home"
      ' Get selected item from RowList
      rowIndex = m.contentRows.rowItemFocused
      if rowIndex <> invalid and type(rowIndex) = "roArray" and rowIndex.Count() >= 2
        rowContent = m.contentRows.content
        if rowContent <> invalid
          row = rowContent.getChild(rowIndex[0])
          if row <> invalid
            item = row.getChild(rowIndex[1])
            if item <> invalid
              ' Find the full meta data
              metaId = ""
              metaType = ""
              if item.hasField("metaId") then metaId = item.metaId
              if item.hasField("metaType") then metaType = item.metaType

              foundMeta = findMetaById(metaId, metaType)
              if foundMeta <> invalid
                showDetail(foundMeta)
                return true
              end if
            end if
          end if
        end if
      end if
    else if m.currentScreen = "detail"
      ' Play selected source
      selectedIndex = m.sourceList.itemFocused
      if selectedIndex >= 0 and selectedIndex < m.currentStreams.Count()
        stream = m.currentStreams[selectedIndex]
        title = ""
        if m.currentMeta <> invalid then title = m.currentMeta.name
        playStream(stream.url, stream.format, title)
        return true
      end if
    else if m.currentScreen = "search"
      ' Check if a search result was selected
      if m.searchGrid.isInFocusChain()
        selectedIndex = m.searchGrid.itemFocused
        if selectedIndex >= 0
          gridContent = m.searchGrid.content
          if gridContent <> invalid
            item = gridContent.getChild(selectedIndex)
            if item <> invalid
              metaId = ""
              metaType = ""
              if item.hasField("metaId") then metaId = item.metaId
              if item.hasField("metaType") then metaType = item.metaType

              foundMeta = findMetaById(metaId, metaType)
              if foundMeta <> invalid
                showDetail(foundMeta)
                return true
              end if
            end if
          end if
        end if
      end if
    end if
  end if

  ' Star (*) button → Search
  if key = "replay" or key = "search"
    showScreen("search")
    return true
  end if

  ' Up/Down on search to move between keyboard and results
  if m.currentScreen = "search"
    if key = "down" and m.searchKeyboard.isInFocusChain()
      ' Submit search and move to results
      if m.searchKeyboard.text <> invalid and m.searchKeyboard.text <> ""
        performSearch(m.searchKeyboard.text)
        m.searchGrid.setFocus(true)
      end if
      return true
    else if key = "up" and m.searchGrid.isInFocusChain()
      m.searchKeyboard.setFocus(true)
      return true
    end if
  end if

  ' On home screen, update hero when focus changes
  if m.currentScreen = "home" and (key = "left" or key = "right" or key = "up" or key = "down")
    ' Update hero after a brief delay to let focus settle
    updateHeroFromFocus()
  end if

  return false
end function

sub updateHeroFromFocus()
  rowIndex = m.contentRows.rowItemFocused
  if rowIndex <> invalid and type(rowIndex) = "roArray" and rowIndex.Count() >= 2
    rowContent = m.contentRows.content
    if rowContent <> invalid
      row = rowContent.getChild(rowIndex[0])
      if row <> invalid
        item = row.getChild(rowIndex[1])
        if item <> invalid
          metaId = ""
          if item.hasField("metaId") then metaId = item.metaId
          if item.hasField("metaType")
            foundMeta = findMetaById(metaId, item.metaType)
            if foundMeta <> invalid
              setHero(foundMeta)
            end if
          end if
        end if
      end if
    end if
  end if
end sub

function findMetaById(id as String, metaType as String) as Object
  for each meta in m.allMetas
    if meta.id = id
      return meta
    end if
  end for

  ' Try fetching from addons
  for each addon in m.addons
    if addon.hasMeta = true
      metaResult = FetchMeta(addon.transportUrl, metaType, id)
      if metaResult <> invalid and metaResult.meta <> invalid
        return metaResult.meta
      end if
    end if
  end for

  return invalid
end function
