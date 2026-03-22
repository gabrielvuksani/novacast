function CreateAddonRegistry() as Object
  registry = {
    defaultAddonUrls: [
      "https://v3-cinemeta.strem.io/manifest.json",
      "https://opensubtitles-v3.strem.io/manifest.json"
    ]
  }

  registry.GetDefaultAddonItems = function() as Object
    items = []
    for each url in m.defaultAddonUrls
      manifest = HttpGetJson(url)
      if manifest <> invalid then
        ' Parse resources to determine capabilities
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

        ' Check catalogs for search support
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

        ' Determine role
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
