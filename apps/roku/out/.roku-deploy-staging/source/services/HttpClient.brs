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
