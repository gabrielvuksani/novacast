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
  seenIds = {}

  for i = 0 to urls.Count() - 1
    url = urls[i]
    manifest = HttpGetJson(url)
    if manifest <> invalid and manifest.catalogs <> invalid
      for each catalog in manifest.catalogs
        ' Skip search-only catalogs
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
          rowData = { title: catalogName, items: [], type: catalog.type }
          for each meta in catalogData.metas
            ' Deduplicate by ID
            metaId = ""
            if meta.id <> invalid then metaId = meta.id
            if metaId <> "" and seenIds[metaId] = invalid
              seenIds[metaId] = true
              ' Ensure type is set on each meta
              if meta.type = invalid or meta.type = ""
                meta.type = catalog.type
              end if
              rowData.items.Push(meta)
              allMetas.Push(meta)
            else if metaId = ""
              ' No ID — still include but can not deduplicate
              if meta.type = invalid or meta.type = ""
                meta.type = catalog.type
              end if
              rowData.items.Push(meta)
              allMetas.Push(meta)
            end if
          end for
          if rowData.items.Count() > 0
            rows.Push(rowData)
          end if
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

    ' First check if this addon supports streams
    ' by checking the manifest resources
    manifest = HttpGetJson(url)
    if manifest = invalid then continue for

    hasStreamResource = false
    if manifest.resources <> invalid
      for each resource in manifest.resources
        resourceName = ""
        if type(resource) = "roString" or type(resource) = "String"
          resourceName = resource
        else if type(resource) = "roAssociativeArray" and resource.name <> invalid
          resourceName = resource.name
        end if
        if resourceName = "stream" then hasStreamResource = true
      end for
    end if

    if not hasStreamResource then continue for

    ' Check if this addon supports the content type
    supportsType = false
    if manifest.types <> invalid
      for each supportedType in manifest.types
        if LCase(supportedType) = LCase(contentType) then supportsType = true
      end for
    end if
    ' Also check idPrefixes if available
    if manifest.idPrefixes <> invalid
      for each prefix in manifest.idPrefixes
        if Instr(1, contentId, prefix) = 1 then supportsType = true
      end for
    end if
    ' If no types/idPrefixes specified, assume it supports everything
    if manifest.types = invalid or manifest.types.Count() = 0
      supportsType = true
    end if

    if not supportsType then continue for

    ' Build the stream URL
    lastManifest = Instr(1, url, "/manifest.json")
    if lastManifest > 0
      baseUrl = Left(url, lastManifest - 1)
    else
      baseUrl = url
    end if

    streamApiUrl = baseUrl + "/stream/" + contentType + "/" + contentId + ".json"
    streamData = HttpGetJson(streamApiUrl)

    if streamData <> invalid and streamData.streams <> invalid
      addonName = "Unknown"
      if manifest.name <> invalid then addonName = manifest.name

      for each stream in streamData.streams
        playUrl = invalid
        isTorrent = false
        isExternal = false

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

        ' Check for external URL
        if (playUrl = invalid or playUrl = "") and stream.externalUrl <> invalid and stream.externalUrl <> ""
          playUrl = stream.externalUrl
          isExternal = true
        end if

        ' Build label
        streamLabel = ""
        if stream.name <> invalid and stream.name <> "" then streamLabel = stream.name
        if stream.title <> invalid and stream.title <> ""
          if streamLabel <> ""
            streamLabel = streamLabel + " - " + stream.title
          else
            streamLabel = stream.title
          end if
        end if
        if stream.description <> invalid and stream.description <> "" and streamLabel = ""
          streamLabel = stream.description
        end if
        if streamLabel = "" then streamLabel = "Stream"

        ' Clean up label — remove special chars that crash XML
        streamLabel = streamLabel.Replace(Chr(10), " ")
        streamLabel = streamLabel.Replace(Chr(13), " ")
        if Len(streamLabel) > 70 then streamLabel = Left(streamLabel, 67) + "..."

        if isTorrent
          streams.Push({
            url: "",
            format: "torrent",
            label: "[Torrent] " + streamLabel,
            addonName: addonName,
            playable: false,
            score: 0
          })
        else if isExternal
          ' External URLs open in browser — not playable on Roku
          streams.Push({
            url: playUrl,
            format: "external",
            label: "[External] " + streamLabel,
            addonName: addonName,
            playable: false,
            score: 0
          })
        else if playUrl <> invalid and playUrl <> ""
          ' Clean URL
          cleanUrl = playUrl.Replace(" ", "%20")

          ' Validate it is actually an HTTP(S) URL
          lowUrl = LCase(cleanUrl)
          if Instr(1, lowUrl, "http://") = 1 or Instr(1, lowUrl, "https://") = 1
            streamFormat = detectFormat(cleanUrl)
            isAdaptive = (streamFormat = "hls" or streamFormat = "dash")

            ' Score: HLS > DASH > MP4 > unknown
            score = 1
            if streamFormat = "hls" then score = 10
            if streamFormat = "dash" then score = 8
            if streamFormat = "mp4" then score = 5

            formatTag = UCase(streamFormat)
            streams.Push({
              url: cleanUrl,
              format: streamFormat,
              label: "[" + formatTag + "] " + streamLabel,
              addonName: addonName,
              playable: true,
              score: score
            })
          end if
        end if
      end for
    end if
  end for

  ' Sort: highest score first (HLS > DASH > MP4 > non-playable)
  sorted = sortStreamsByScore(streams)

  m.top.result = { action: "streams", streams: sorted }
end sub

function sortStreamsByScore(streams as Object) as Object
  ' Simple insertion sort by score descending
  for i = 1 to streams.Count() - 1
    key = streams[i]
    j = i - 1
    while j >= 0 and streams[j].score < key.score
      streams[j + 1] = streams[j]
      j = j - 1
    end while
    streams[j + 1] = key
  end for
  return streams
end function

function detectFormat(url as String) as String
  lowUrl = LCase(url)

  ' Explicit HLS extensions
  if Instr(1, lowUrl, ".m3u8") > 0 then return "hls"
  if Instr(1, lowUrl, "/playlist") > 0 and Instr(1, lowUrl, ".m3u8") > 0 then return "hls"

  ' Explicit DASH extensions
  if Instr(1, lowUrl, ".mpd") > 0 then return "dash"

  ' Known HLS URL patterns
  if Instr(1, lowUrl, "/master.m3u8") > 0 then return "hls"
  if Instr(1, lowUrl, "/index.m3u8") > 0 then return "hls"
  if Instr(1, lowUrl, "/chunklist") > 0 then return "hls"
  if Instr(1, lowUrl, "/playlist/") > 0 then return "hls"
  if Instr(1, lowUrl, "hls") > 0 then return "hls"

  ' Direct video files
  if Instr(1, lowUrl, ".mp4") > 0 then return "mp4"
  if Instr(1, lowUrl, ".mkv") > 0 then return "mp4"
  if Instr(1, lowUrl, ".webm") > 0 then return "mp4"
  if Instr(1, lowUrl, ".m4v") > 0 then return "mp4"
  if Instr(1, lowUrl, ".avi") > 0 then return "mp4"
  if Instr(1, lowUrl, ".mov") > 0 then return "mp4"
  if Instr(1, lowUrl, ".ts") > 0 then return "hls"
  if Instr(1, lowUrl, ".flv") > 0 then return "mp4"

  ' Smooth streaming
  if Instr(1, lowUrl, ".ism") > 0 then return "smooth"

  ' Default: try HLS (most streaming URLs without extension are HLS)
  return "hls"
end function

sub searchTask()
  urls = m.top.transportUrls
  query = m.top.searchQuery
  if urls = invalid or query = "" then return

  results = []
  seenIds = {}

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
        if catalog.extraSupported <> invalid
          for each supported in catalog.extraSupported
            if supported = "search" then supportsSearch = true
          end for
        end if

        if supportsSearch
          searchResult = FetchCatalog(url, catalog.type, catalog.id, query)
          if searchResult <> invalid and searchResult.metas <> invalid
            for each meta in searchResult.metas
              metaId = ""
              if meta.id <> invalid then metaId = meta.id
              if metaId <> "" and seenIds[metaId] = invalid
                seenIds[metaId] = true
                if meta.type = invalid or meta.type = ""
                  meta.type = catalog.type
                end if
                results.Push(meta)
              else if metaId = ""
                results.Push(meta)
              end if
            end for
          end if
        end if
      end for
    end if
  end for

  m.top.result = { action: "search", results: results }
end sub
