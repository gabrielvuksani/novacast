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
        ' Skip search-only required catalogs
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

  ' Try every addon URL for streams
  for i = 0 to urls.Count() - 1
    url = urls[i]
    baseUrl = url.Replace("/manifest.json", "")

    ' Build stream URL directly without re-fetching manifest
    streamUrl = baseUrl + "/stream/" + contentType + "/" + contentId + ".json"
    streamData = HttpGetJson(streamUrl)

    if streamData <> invalid and streamData.streams <> invalid
      for each stream in streamData.streams
        playUrl = invalid
        streamFormat = "hls"
        streamLabel = ""
        isPlayable = false

        ' Check for direct URL
        if stream.url <> invalid and stream.url <> ""
          playUrl = stream.url

          ' Detect format from URL
          lowUrl = LCase(playUrl)
          if Instr(1, lowUrl, ".m3u8") > 0
            streamFormat = "hls"
            isPlayable = true
          else if Instr(1, lowUrl, ".mpd") > 0
            streamFormat = "dash"
            isPlayable = true
          else if Instr(1, lowUrl, ".mp4") > 0 or Instr(1, lowUrl, ".mkv") > 0
            streamFormat = "mp4"
            isPlayable = true
          else if Instr(1, lowUrl, "http") > 0
            ' Could be an HLS stream without .m3u8 extension
            streamFormat = "hls"
            isPlayable = true
          end if
        end if

        ' Build display label
        if stream.name <> invalid and stream.name <> ""
          streamLabel = stream.name
        end if
        if stream.title <> invalid and stream.title <> ""
          if streamLabel <> "" then streamLabel = streamLabel + " - "
          streamLabel = streamLabel + stream.title
        end if
        if streamLabel = "" then streamLabel = "Stream"

        ' Truncate label
        if Len(streamLabel) > 80 then streamLabel = Left(streamLabel, 77) + "..."

        ' Only add playable streams (with actual URLs, not just infoHash)
        if isPlayable and playUrl <> invalid
          streams.Push({
            url: playUrl,
            format: streamFormat,
            label: streamLabel
          })
        end if
      end for
    end if
  end for

  m.top.result = { action: "streams", streams: streams }
end sub

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
