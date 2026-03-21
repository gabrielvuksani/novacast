sub init()
  m.top.backgroundURI = ""
  m.titleLabel = m.top.findNode("titleLabel")
  m.subtitleLabel = m.top.findNode("subtitleLabel")
  m.addonList = m.top.findNode("addonList")

  m.titleLabel.font.size = 42
  m.subtitleLabel.font.size = 24

  registry = CreateAddonRegistry()
  addonItems = registry.GetDefaultAddonItems()

  content = CreateObject("roSGNode", "ContentNode")
  for each item in addonItems
    node = content.CreateChild("ContentNode")
    node.title = item.name + "  v" + item.version
    node.description = item.description
  end for

  m.addonList.content = content
end sub

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

function HttpGetJson(url as String) as Dynamic
  transfer = CreateObject("roUrlTransfer")
  transfer.SetUrl(url)
  transfer.AddHeader("Accept", "application/json")
  response = transfer.GetToString()

  if response = invalid or response = "" then
    return invalid
  end if

  return ParseJson(response)
end function
