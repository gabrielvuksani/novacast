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
        items.Push({
          transportUrl: url,
          name: manifest.name,
          description: manifest.description,
          version: manifest.version
        })
      end if
    end for

    return items
  end function

  return registry
end function
