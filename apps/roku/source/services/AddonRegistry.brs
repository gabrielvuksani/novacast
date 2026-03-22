function CreateAddonRegistry() as Object
  registry = {
    defaultAddonUrls: [
      "https://v3-cinemeta.strem.io/manifest.json",
      "https://thepiratebay-plus.strem.fun/manifest.json",
      "https://torrentio.strem.fun/manifest.json",
      "https://848b3516657c-usatv.baby-beamup.club/manifest.json",
      "https://5a0d1888fa64-orion.baby-beamup.club/eyJhcGkiOiJGNzZIOE1BRUxURTZTRE1YOU5HS1ZTQTMyOERXR0U5RiIsImxpbmtMaW1pdCI6IjEwIiwic29ydFZhbHVlIjoiYmVzdCIsImF1ZGlvY2hhbm5lbHMiOiIyLDYsOCIsInZpZGVvcXVhbGl0eSI6ImhkOGssaGQ2ayxoZDRrLGhkMmssaGQxMDgwLGhkNzIwLHNkLHNjcjEwODAsc2NyNzIwLHNjcixjYW0xMDgwLGNhbTcyMCxjYW0iLCJsaXN0T3B0IjoidG9ycmVudCIsImRlYnJpZHNlcnZpY2VzIjpbXSwiYXVkaW9sYW5ndWFnZXMiOltdLCJhZGRpdGlvbmFsUGFyYW1ldGVycyI6IiJ9/manifest.json"
    ]
  }

  registry.GetDefaultAddonItems = function() as Object
    items = []
    for each url in m.defaultAddonUrls
      manifest = HttpGetJson(url)
      if manifest <> invalid then
        hasCatalog = false
        hasMeta = false
        hasStream = false
        hasSubtitles = false
        searchable = false

        if manifest.resources <> invalid
          for each resource in manifest.resources
            resourceName = ""
            if type(resource) = "roString" or type(resource) = "String"
              resourceName = resource
            else if type(resource) = "roAssociativeArray" and resource.name <> invalid
              resourceName = resource.name
            end if

            if resourceName = "catalog" then hasCatalog = true
            if resourceName = "meta" then hasMeta = true
            if resourceName = "stream" then hasStream = true
            if resourceName = "subtitles" then hasSubtitles = true
          end for
        end if

        if manifest.catalogs <> invalid
          hasCatalog = true
          for each catalog in manifest.catalogs
            if catalog.extra <> invalid
              for each extra in catalog.extra
                if extra.name = "search" then searchable = true
              end for
            end if
          end for
        end if

        role = "utility"
        if hasStream and hasCatalog
          role = "hybrid"
        else if hasStream
          role = "playback"
        else if hasSubtitles
          role = "captions"
        else if hasCatalog or hasMeta
          role = "discovery"
        end if

        items.Push({
          transportUrl: url,
          manifest: manifest,
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          hasCatalog: hasCatalog,
          hasMeta: hasMeta,
          hasStream: hasStream,
          hasSubtitles: hasSubtitles,
          searchable: searchable,
          role: role
        })
      end if
    end for

    return items
  end function

  return registry
end function
