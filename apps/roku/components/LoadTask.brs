sub init()
end sub

sub doTask()
  action = m.top.action

  if action = "loadAddons"
    loadAddonsTask()
  else if action = "loadCatalogs"
    loadCatalogsTask()
  else if action = "loadStreams"
    loadStreamsTask()
  else if action = "search"
    searchTask()
  else if action = "loadMeta"
    loadMetaTask()
  end if
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
          if catalog.name <> invalid and catalog.name <> ""
            catalogName = catalog.name
          end if

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
    ' Check if this addon has stream resource
    manifest = HttpGetJson(url)
    if manifest <> invalid and manifest.resources <> invalid
      hasStream = false
      for each resource in manifest.resources
        resName = ""
        if type(resource) = "roString" or type(resource) = "String"
          resName = resource
        else if type(resource) = "roAssociativeArray" and resource.name <> invalid
          resName = resource.name
        end if
        if resName = "stream" then hasStream = true
      end for

      if hasStream
        streamData = FetchStreams(url, contentType, contentId)
        if streamData <> invalid and streamData.streams <> invalid
          for each stream in streamData.streams
            streamUrl = invalid
            streamFormat = "hls"
            streamLabel = manifest.name

            if stream.url <> invalid
              streamUrl = stream.url
              if Instr(1, LCase(streamUrl), ".mpd") > 0
                streamFormat = "dash"
              else if Instr(1, LCase(streamUrl), ".mp4") > 0
                streamFormat = "mp4"
              end if
            end if

            if stream.title <> invalid and stream.title <> ""
              streamLabel = stream.title
            else if stream.name <> invalid and stream.name <> ""
              streamLabel = stream.name
            end if

            if streamUrl <> invalid
              streams.Push({ url: streamUrl, format: streamFormat, label: streamLabel })
            end if
          end for
        end if
      end if
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

sub loadMetaTask()
  urls = m.top.transportUrls
  contentType = m.top.contentType
  contentId = m.top.contentId
  if urls = invalid or contentType = "" or contentId = "" then return

  for i = 0 to urls.Count() - 1
    url = urls[i]
    metaResult = FetchMeta(url, contentType, contentId)
    if metaResult <> invalid and metaResult.meta <> invalid
      m.top.result = { action: "meta", meta: metaResult.meta }
      return
    end if
  end for

  m.top.result = { action: "meta", meta: invalid }
end sub
