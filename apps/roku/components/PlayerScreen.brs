sub init()
  m.video = m.top.findNode("video")
  m.overlay = m.top.findNode("overlay")
  m.titleLabel = m.top.findNode("titleLabel")
  m.subtitleLabel = m.top.findNode("subtitleLabel")
  m.timeElapsed = m.top.findNode("timeElapsed")
  m.timeRemaining = m.top.findNode("timeRemaining")
  m.progressFill = m.top.findNode("progressFill")
  m.bufferedBar = m.top.findNode("bufferedBar")
  m.scrubber = m.top.findNode("scrubber")
  m.playPauseLabel = m.top.findNode("playPauseLabel")
  m.statusLabel = m.top.findNode("statusLabel")
  m.bufferingLabel = m.top.findNode("bufferingLabel")

  ' State
  m.isPlaying = false
  m.controlsVisible = true
  m.hideTimer = invalid
  m.progressBarWidth = 1620
  m.progressBarX = 110

  ' HTTPS certs for video
  m.video.setCertificatesFile("common:/certs/ca-bundle.crt")
  m.video.initClientCertificates()

  ' Observe video state
  m.video.observeField("state", "onStateChange")
  m.video.observeField("position", "onPositionChange")
  m.video.observeField("bufferingStatus", "onBufferingChange")

  ' Observe content changes
  m.top.observeField("content", "onContentSet")

  ' Auto-hide timer
  m.hideTimer = createObject("roSGNode", "Timer")
  m.hideTimer.duration = 5
  m.hideTimer.repeat = false
  m.hideTimer.observeField("fire", "onHideControls")

  ' Keep focus on this component (NOT on video) for key events
  m.top.setFocus(true)
end sub

sub onContentSet()
  contentNode = m.top.content
  if contentNode = invalid then return

  m.titleLabel.text = contentNode.title
  if contentNode.description <> invalid
    desc = contentNode.description
    if Len(desc) > 60 then desc = Left(desc, 57) + "..."
    m.subtitleLabel.text = desc
  end if

  m.video.content = contentNode
  m.video.control = "play"
  m.isPlaying = true
  updatePlayPause()
  showControls()
end sub

' ══════════════ VIDEO STATE ══════════════

sub onStateChange()
  state = m.video.state

  if state = "playing"
    m.isPlaying = true
    m.bufferingLabel.visible = false
    updatePlayPause()
    startHideTimer()

  else if state = "paused"
    m.isPlaying = false
    updatePlayPause()
    showControls()

  else if state = "buffering"
    m.bufferingLabel.visible = true
    showControls()

  else if state = "error" or state = "finished"
    m.video.control = "stop"
    m.top.action = "close"
  end if
end sub

sub onPositionChange()
  currentPos = m.video.position
  dur = m.video.duration

  if dur <= 0 then return

  ' Update time labels
  m.timeElapsed.text = formatTime(currentPos)
  m.timeRemaining.text = "-" + formatTime(dur - currentPos)

  ' Update progress bar
  fraction = currentPos / dur
  if fraction > 1 then fraction = 1
  if fraction < 0 then fraction = 0

  fillWidth = Int(m.progressBarWidth * fraction)
  m.progressFill.width = fillWidth
  m.scrubber.translation = [m.progressBarX + fillWidth - 8, 0]
end sub

sub onBufferingChange()
  bs = m.video.bufferingStatus
  if bs <> invalid
    pct = bs.percentage
    if pct < 100
      m.bufferingLabel.text = "Buffering " + pct.ToStr() + "%"
      m.bufferingLabel.visible = true
    else
      m.bufferingLabel.visible = false
    end if
  end if
end sub

' ══════════════ CONTROLS VISIBILITY ══════════════

sub showControls()
  m.overlay.visible = true
  m.controlsVisible = true
  startHideTimer()
end sub

sub hideControls()
  if m.isPlaying
    m.overlay.visible = false
    m.controlsVisible = false
  end if
end sub

sub toggleControls()
  if m.controlsVisible
    hideControls()
  else
    showControls()
  end if
end sub

sub startHideTimer()
  m.hideTimer.control = "stop"
  m.hideTimer.control = "start"
end sub

sub onHideControls()
  if m.isPlaying then hideControls()
end sub

' ══════════════ PLAYBACK CONTROLS ══════════════

sub togglePlayPause()
  if m.isPlaying
    m.video.control = "pause"
    m.isPlaying = false
  else
    m.video.control = "resume"
    m.isPlaying = true
  end if
  updatePlayPause()
  showControls()
end sub

sub updatePlayPause()
  if m.isPlaying
    m.playPauseLabel.text = "  PAUSE"
  else
    m.playPauseLabel.text = "  PLAY"
  end if
end sub

sub seekRelative(seconds as Integer)
  newPos = m.video.position + seconds
  if newPos < 0 then newPos = 0
  dur = m.video.duration
  if dur > 0 and newPos > dur then newPos = dur - 1

  m.video.seek = newPos

  ' Show seek feedback
  if seconds > 0
    showStatus(">> " + Abs(seconds).ToStr() + "s")
  else
    showStatus("<< " + Abs(seconds).ToStr() + "s")
  end if
  showControls()
end sub

sub showStatus(msg as String)
  m.statusLabel.text = msg
  m.statusLabel.visible = true

  ' Hide after 1 second
  statusTimer = createObject("roSGNode", "Timer")
  statusTimer.duration = 1
  statusTimer.repeat = false
  statusTimer.observeField("fire", "onHideStatus")
  statusTimer.control = "start"
  m.statusTimer = statusTimer
end sub

sub onHideStatus()
  m.statusLabel.visible = false
end sub

sub toggleSubtitles()
  ' Cycle through available caption modes
  currentMode = m.video.globalCaptionMode
  if currentMode = "On"
    m.video.globalCaptionMode = "Off"
    showStatus("Subtitles OFF")
  else
    m.video.globalCaptionMode = "On"
    showStatus("Subtitles ON")
  end if
  showControls()
end sub

' ══════════════ KEY HANDLING ══════════════

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press then return true

  if key = "back"
    m.video.control = "stop"
    m.top.action = "close"
    return true
  end if

  if key = "OK" or key = "play"
    togglePlayPause()
    return true
  end if

  if key = "rewind" or key = "left"
    seekRelative(-10)
    return true
  end if

  if key = "fastforward" or key = "right"
    seekRelative(10)
    return true
  end if

  if key = "up"
    seekRelative(30)
    return true
  end if

  if key = "down"
    seekRelative(-30)
    return true
  end if

  if key = "replay"
    seekRelative(-10)
    return true
  end if

  if key = "options"
    toggleSubtitles()
    return true
  end if

  ' Any other key: show controls
  showControls()
  return true
end function

' ══════════════ HELPERS ══════════════

function formatTime(totalSeconds as Dynamic) as String
  if totalSeconds = invalid or totalSeconds < 0 then return "0:00"

  seconds = Int(totalSeconds)
  hours = Int(seconds / 3600)
  minutes = Int((seconds MOD 3600) / 60)
  secs = seconds MOD 60

  secsStr = secs.ToStr()
  if secs < 10 then secsStr = "0" + secs.ToStr()

  if hours > 0
    minsStr = minutes.ToStr()
    if minutes < 10 then minsStr = "0" + minutes.ToStr()
    return hours.ToStr() + ":" + minsStr + ":" + secsStr
  end if

  return minutes.ToStr() + ":" + secsStr
end function
