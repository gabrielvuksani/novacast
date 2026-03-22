function HttpGetJson(url as String) as Dynamic
  transfer = CreateObject("roUrlTransfer")
  transfer.SetUrl(url)
  transfer.AddHeader("Accept", "application/json")
  transfer.AddHeader("User-Agent", "NovaCast/1.0 Roku")

  ' Enable HTTPS certificate validation
  transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
  transfer.InitClientCertificates()

  ' Set timeout to 10 seconds
  port = CreateObject("roMessagePort")
  transfer.SetMessagePort(port)

  if transfer.AsyncGetToString()
    msg = wait(10000, port)
    if type(msg) = "roUrlEvent"
      responseCode = msg.GetResponseCode()
      if responseCode >= 200 and responseCode < 300
        response = msg.GetString()
        if response <> invalid and response <> ""
          return ParseJson(response)
        end if
      end if
    end if
  end if

  return invalid
end function
