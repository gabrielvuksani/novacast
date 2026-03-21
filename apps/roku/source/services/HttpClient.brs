function HttpGetJson(url as String) as Dynamic
  transfer = CreateObject("roUrlTransfer")
  transfer.SetUrl(url)
  transfer.AddHeader("Accept", "application/json")
  response = transfer.GetToString()
  responseCode = transfer.GetResponseCode()

  if responseCode < 200 or responseCode >= 300 then
    return invalid
  end if

  if response = invalid or response = "" then
    return invalid
  end if

  return ParseJson(response)
end function
