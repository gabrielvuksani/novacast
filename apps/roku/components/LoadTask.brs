sub init()
  m.top.functionName = "doTask"
end sub

sub doTask()
  action = m.top.action
  if action = "loadAddons" then loadAddonsTask()
  if action = "loadCatalogs" then loadCatalogsTask()
  if action = "loadStreams" then loadStreamsTask()
  if action = "search" then searchTask()
end sub

sub loadAddonsTask()
  registry = CreateAddonRegistry()
  addons = registry.GetDefaultAddonItems()
  m.top.result = { action: "addons", addons: addons }
end sub

sub loadCatalogsTask()
  urls = m.top.transportUrls
  if urls = invalid then return

  allMetas = []
  rows = []

  for i = 0 to urls.Count() - 1
    url = urls[i]
    manifest = HttpGetJson(url)
    if manifest <> invalid and manifest.catalogs <> invalid
      for each catalog in manifest.catalogs
        isSearchOnly = false
        if catalog.extra <> invalid
          for each extra in catalog.extra
            if extra.name = "search" and extra.isRequired <> invalid and extra.isRequired = true
              isSearchOnly = true
            end if
          end for
        end if
        if isSearchOnly then continue for

        catalogData = FetchCatalog(url, catalog.type, catalog.id)
        if catalogData <> invalid and catalogData.metas <> invalid
          catalogName = catalog.id
          if catalog.name <> invalid and catalog.name <> "" then catalogName = catalog.name
          rowData = { title: catalogName, items: [] }
          for each meta in catalogData.metas
            rowData.items.Push(meta)
            allMetas.Push(meta)
          end for
          rows.Push(rowData)
        end if
      end for
    end if
  end for

  m.top.result = { action: "catalogs", rows: rows, allMetas: allMetas }
end sub

sub loadStreamsTask()
  urls = m.top.transportUrls
  contentType = m.top.contentType
  contentId = m.top.contentId
  if urls = invalid or contentType = "" or contentId = "" then return

  streams = []

  for i = 0 to urls.Count() - 1
    url = urls[i]

    ' Extract base URL (strip /manifest.json)
    lastManifest = Instr(1, url, "/manifest.json")
    if lastManifest > 0
      baseUrl = Left(url, lastManifest - 1)
    else
      baseUrl = url
    end if

    streamApiUrl = baseUrl + "/stream/" + contentType + "/" + contentId + ".json"
    streamData = HttpGetJson(streamApiUrl)

    if streamData <> invalid and streamData.streams <> invalid
      for each stream in streamData.streams

        ' NOTE: Do NOT skip notWebReady streams on Roku.
        ' notWebReady means the web browser can't play them, but
        ' Roku's native Video node handles HLS/DASH natively.

        playUrl = invalid
        isTorrent = false

        ' Check for direct URL
        if stream.url <> invalid and stream.url <> ""
          playUrl = stream.url
        end if

        ' Check for torrent
        if stream.infoHash <> invalid and stream.infoHash <> ""
          if playUrl = invalid or playUrl = ""
            isTorrent = true
          end if
        end if

        ' Check for external URL as fallback
        if playUrl = invalid or playUrl = ""
          if stream.externalUrl <> invalid and stream.externalUrl <> ""
            playUrl = stream.externalUrl
          end if
        end if

        ' Build label
        streamLabel = ""
        if stream.name <> invalid and stream.name <> "" then streamLabel = stream.name
        if stream.title <> invalid and stream.title <> ""
          if streamLabel <> ""
            streamLabel = streamLabel + " | " + stream.title
          else
            streamLabel = stream.title
          end if
        end if
        if streamLabel = "" then streamLabel = "Stream"
        if Len(streamLabel) > 80 then streamLabel = Left(streamLabel, 77) + "..."

        if isTorrent
          streams.Push({ url: "", format: "torrent", label: "[Torrent] " + streamLabel, playable: false })
        else if playUrl <> invalid and playUrl <> ""
          ' URL-encode spaces
          cleanUrl = playUrl.Replace(" ", "%20")

          ' Detect stream format from URL
          streamFormat = detectFormat(cleanUrl)

          ' Mark HLS/DASH as preferred (true streaming protocols)
          isAdaptive = (streamFormat = "hls" or streamFormat = "dash")

          if isAdaptive
            ' HLS/DASH streams are always safe to play
            streams.Push({ url: cleanUrl, format: streamFormat, label: "[HLS] " + streamLabel, playable: true })
          else
            ' Direct files — still include but note they may not work on all devices
            streams.Push({ url: cleanUrl, format: streamFormat, label: streamLabel, playable: true })
          end if
        end if
      end for
    end if
  end for

  ' Sort: HLS/DASH first, then direct files, then torrents
  sorted = []
  for each s in streams
    if s.format = "hls" or s.format = "dash"
      sorted.Unshift(s)
    else
      sorted.Push(s)
    end if
  end for

  m.top.result = { action: "streams", streams: sorted }
end sub

function detectFormat(url as String) as String
  lowUrl = LCase(url)

  ' Explicit HLS extensions
  if Instr(1, lowUrl, ".m3u8") > 0 then return "hls"

  ' Explicit DASH extensions
  if Instr(1, lowUrl, ".mpd") > 0 then return "dash"

  ' Known HLS playlist URL patterns (vixsrc, etc)
  if Instr(1, lowUrl, "/playlist/") > 0 then return "hls"
  if Instr(1, lowUrl, "/master.m3u8") > 0 then return "hls"
  if Instr(1, lowUrl, "/index.m3u8") > 0 then return "hls"
  if Instr(1, lowUrl, "vixsrc") > 0 then return "hls"

  ' Direct video files — Roku uses "mp4" streamFormat for all direct files
  if Instr(1, lowUrl, ".mp4") > 0 then return "mp4"
  if Instr(1, lowUrl, ".mkv") > 0 then return "mp4"
  if Instr(1, lowUrl, ".webm") > 0 then return "mp4"
  if Instr(1, lowUrl, ".m4v") > 0 then return "mp4"
  if Instr(1, lowUrl, ".avi") > 0 then return "mp4"
  if Instr(1, lowUrl, ".mov") > 0 then return "mp4"

  ' Default: try HLS first (most streaming URLs without extension are HLS)
  return "hls"
end function

sub searchTask()
  urls = m.top.transportUrls
  query = m.top.searchQuery
  if urls = invalid or query = "" then return

  results = []

  for i = 0 to urls.Count() - 1
    url = urls[i]
    manifest = HttpGetJson(url)
    if manifest <> invalid and manifest.catalogs <> invalid
      for each catalog in manifest.catalogs
        supportsSearch = false
        if catalog.extra <> invalid
          for each extra in catalog.extra
            if extra.name = "search" then supportsSearch = true
          end for
        end if

        if supportsSearch
          searchResult = FetchCatalog(url, catalog.type, catalog.id, query)
          if searchResult <> invalid and searchResult.metas <> invalid
            for each meta in searchResult.metas
              results.Push(meta)
            end for
          end if
        end if
      end for
    end if
  end for

  m.top.result = { action: "search", results: results }
end sub
