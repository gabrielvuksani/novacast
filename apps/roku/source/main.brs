sub Main(args as Dynamic)
  screen = CreateObject("roSGScreen")
  port = CreateObject("roMessagePort")
  screen.SetMessagePort(port)

  scene = screen.CreateScene("MainScene")
  screen.Show()

  ' Required for Roku certification
  scene.signalBeacon("AppLaunchComplete")

  while true
    msg = wait(0, port)
    if type(msg) = "roSGScreenEvent"
      if msg.isScreenClosed()
        return
      end if
    end if
  end while
end sub
