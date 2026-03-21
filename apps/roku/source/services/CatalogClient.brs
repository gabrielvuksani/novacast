function BuildCatalogUrl(transportUrl as String, contentType as String, catalogId as String, searchTerm = invalid as Dynamic) as String
  baseUrl = transportUrl.Replace("/manifest.json", "")
  suffix = ""

  if searchTerm <> invalid and searchTerm <> "" then
    suffix = "/search=" + searchTerm
  end if

  return baseUrl + "/catalog/" + contentType + "/" + catalogId + suffix + ".json"
end function

function FetchCatalog(transportUrl as String, contentType as String, catalogId as String, searchTerm = invalid as Dynamic) as Dynamic
  url = BuildCatalogUrl(transportUrl, contentType, catalogId, searchTerm)
  return HttpGetJson(url)
end function
