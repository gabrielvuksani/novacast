function BuildStreamUrl(transportUrl as String, contentType as String, videoId as String) as String
  baseUrl = transportUrl.Replace("/manifest.json", "")
  return baseUrl + "/stream/" + contentType + "/" + videoId + ".json"
end function

function FetchStreams(transportUrl as String, contentType as String, videoId as String) as Dynamic
  url = BuildStreamUrl(transportUrl, contentType, videoId)
  return HttpGetJson(url)
end function

function BuildMetaUrl(transportUrl as String, contentType as String, metaId as String) as String
  baseUrl = transportUrl.Replace("/manifest.json", "")
  return baseUrl + "/meta/" + contentType + "/" + metaId + ".json"
end function

function FetchMeta(transportUrl as String, contentType as String, metaId as String) as Dynamic
  url = BuildMetaUrl(transportUrl, contentType, metaId)
  return HttpGetJson(url)
end function

function BuildSubtitleUrl(transportUrl as String, contentType as String, videoId as String) as String
  baseUrl = transportUrl.Replace("/manifest.json", "")
  return baseUrl + "/subtitles/" + contentType + "/" + videoId + ".json"
end function

function FetchSubtitles(transportUrl as String, contentType as String, videoId as String) as Dynamic
  url = BuildSubtitleUrl(transportUrl, contentType, videoId)
  return HttpGetJson(url)
end function
