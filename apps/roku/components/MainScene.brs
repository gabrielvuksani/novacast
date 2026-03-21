sub init()
  m.top.backgroundURI = ""
  m.titleLabel = m.top.findNode("titleLabel")
  m.subtitleLabel = m.top.findNode("subtitleLabel")
  m.addonList = m.top.findNode("addonList")

  m.titleLabel.font.size = 42
  m.subtitleLabel.font.size = 24

  registry = CreateAddonRegistry()
  addonItems = registry.GetDefaultAddonItems()

  itemCount = addonItems.Count()
  if itemCount > 0 then
    m.subtitleLabel.text = "NovaCast Roku shell · " + StrI(itemCount).Trim() + " starter sources"
  else
    m.subtitleLabel.text = "NovaCast Roku shell · no sources loaded"
  end if

  content = CreateObject("roSGNode", "ContentNode")
  for each item in addonItems
    node = content.CreateChild("ContentNode")
    node.title = item.name + "  v" + item.version
    node.description = item.description + " · " + item.transportUrl
  end for

  m.addonList.content = content
end sub
