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
  m.progressBarWidth = 1620
  m.progressBarX = 110
  m.retryCount = 0
  m.maxRetries = 2

  ' HTTPS certs for video — MUST be set before any playback
  m.video.setCertificatesFile("common:/certs/ca-bundle.crt")
  m.video.initClientCertificates()

  ' Enable trickplay and native UI as fallback
  m.video.enableTrickPlay = false
  m.video.enableUI = false

  ' Observe video state
  m.video.observeField("state", "onStateChange")
  m.video.observeField("position", "onPositionChange")
  m.video.observeField("bufferingStatus", "onBufferingChange")
  m.video.observeField("errorCode", "onErrorCode")
  m.video.observeField("errorMsg", "onErrorMsg")
  m.video.observeField("downloadSpeed", "onDownloadSpeed")

  ' Observe content changes
  m.top.observeField("content", "onContentSet")

  ' Auto-hide timer
  m.hideTimer = createObject("roSGNode", "Timer")
  m.hideTimer.duration = 5
  m.hideTimer.repeat = false
  m.hideTimer.observeField("fire", "onHideControls")

  ' Buffering stall detector
  m.stallTimer = createObject("roSGNode", "Timer")
  m.stallTimer.duration = 30
  m.stallTimer.repeat = false
  m.stallTimer.observeField("fire", "onStallTimeout")

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
  else
    m.subtitleLabel.text = ""
  end if

  ' Reset retry counter
  m.retryCount = 0

  ' Validate the URL before attempting playback
  streamUrl = ""
  if contentNode.url <> invalid then streamUrl = contentNode.url
  if streamUrl = "" or streamUrl = invalid
    showStatus("No stream URL")
    closeAfterDelay(2)
    return
  end if

  ' Validate stream format
  fmt = ""
  if contentNode.streamFormat <> invalid then fmt = LCase(contentNode.streamFormat)

  ' Only allow formats Roku can actually play
  if fmt <> "hls" and fmt <> "dash" and fmt <> "mp4" and fmt <> "smooth"
    ' Default to HLS for unknown formats — Roku handles this gracefully
    contentNode.streamFormat = "hls"
  end if

  ' Add HTTP headers if the stream needs them
  addStreamHeaders(contentNode)

  m.video.content = contentNode
  m.video.control = "play"
  m.isPlaying = true
  updatePlayPause()
  showControls()

  ' Start stall detector
  m.stallTimer.control = "stop"
  m.stallTimer.control = "start"
end sub

sub addStreamHeaders(contentNode as Object)
  ' Some streams need a User-Agent or Referer header
  url = contentNode.url
  if url = invalid then return

  lowUrl = LCase(url)

  ' For streams that commonly need headers, add them
  if Instr(1, lowUrl, "vixsrc") > 0 or Instr(1, lowUrl, "febbox") > 0
    contentNode.HttpHeaders = ["User-Agent: Mozilla/5.0 (Roku; SceneGraph) NovaCast/1.0"]
  end if
end sub

' ══════════════ VIDEO STATE ══════════════

sub onStateChange()
  state = m.video.state

  if state = "playing"
    m.isPlaying = true
    m.bufferingLabel.visible = false
    m.retryCount = 0
    updatePlayPause()
    startHideTimer()
    ' Cancel stall timer since we started playing
    m.stallTimer.control = "stop"

  else if state = "paused"
    m.isPlaying = false
    updatePlayPause()
    showControls()

  else if state = "buffering"
    m.bufferingLabel.visible = true
    m.bufferingLabel.text = "Buffering..."
    showControls()
    ' Restart stall timer
    m.stallTimer.control = "stop"
    m.stallTimer.control = "start"

  else if state = "error"
    handlePlaybackError()

  else if state = "finished"
    m.video.control = "stop"
    m.top.action = "close"

  else if state = "stopped"
    ' Normal stop — do nothing
  end if
end sub

sub handlePlaybackError()
  errorCode = 0
  if m.video.errorCode <> invalid then errorCode = m.video.errorCode
  errorMsg = ""
  if m.video.errorMsg <> invalid then errorMsg = m.video.errorMsg

  m.video.control = "stop"

  ' Try switching format on error -3 or -5
  if (errorCode = -3 or errorCode = -5) and m.retryCount < m.maxRetries
    m.retryCount = m.retryCount + 1
    contentNode = m.video.content

    if contentNode <> invalid and contentNode.url <> invalid
      currentFmt = ""
      if contentNode.streamFormat <> invalid then currentFmt = contentNode.streamFormat

      ' Cycle through formats: hls -> mp4 -> dash
      if currentFmt = "hls"
        contentNode.streamFormat = "mp4"
        showStatus("Retrying as MP4...")
      else if currentFmt = "mp4"
        contentNode.streamFormat = "dash"
        showStatus("Retrying as DASH...")
      else
        contentNode.streamFormat = "hls"
        showStatus("Retrying as HLS...")
      end if

      m.video.content = contentNode
      m.video.control = "play"
      return
    end if
  end if

  ' All retries exhausted — show error and close
  errLabel = "Playback error"
  if errorCode <> 0 then errLabel = "Error " + errorCode.ToStr()
  if errorMsg <> "" then errLabel = errLabel + ": " + errorMsg

  showStatus(errLabel)
  closeAfterDelay(3)
end sub

sub onErrorCode()
  ' Logged for debugging — actual handling happens in onStateChange
end sub

sub onErrorMsg()
  ' Logged for debugging — actual handling happens in onStateChange
end sub

sub onStallTimeout()
  ' If we've been buffering for 30 seconds, the stream is likely dead
  state = m.video.state
  if state = "buffering"
    showStatus("Stream timed out")
    m.video.control = "stop"
    closeAfterDelay(2)
  end if
end sub

sub closeAfterDelay(seconds as Integer)
  closeTimer = createObject("roSGNode", "Timer")
  closeTimer.duration = seconds
  closeTimer.repeat = false
  closeTimer.observeField("fire", "onCloseTimerFire")
  closeTimer.control = "start"
  m.closeTimer = closeTimer
end sub

sub onCloseTimerFire()
  m.top.action = "close"
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

sub onDownloadSpeed()
  ' Could display download speed in UI if desired
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
    m.playPauseLabel.text = "PAUSE"
  else
    m.playPauseLabel.text = "PLAY"
  end if
end sub

sub seekRelative(seconds as Integer)
  newPos = m.video.position + seconds
  if newPos < 0 then newPos = 0
  dur = m.video.duration
  if dur > 0 and newPos > dur then newPos = dur - 1

  m.video.seek = newPos

  if seconds > 0
    showStatus("+" + Abs(seconds).ToStr() + "s")
  else
    showStatus("-" + Abs(seconds).ToStr() + "s")
  end if
  showControls()
end sub

sub showStatus(msg as String)
  m.statusLabel.text = msg
  m.statusLabel.visible = true

  statusTimer = createObject("roSGNode", "Timer")
  statusTimer.duration = 1.5
  statusTimer.repeat = false
  statusTimer.observeField("fire", "onHideStatus")
  statusTimer.control = "start"
  m.statusTimer = statusTimer
end sub

sub onHideStatus()
  m.statusLabel.visible = false
end sub

sub toggleSubtitles()
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
    m.stallTimer.control = "stop"
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
