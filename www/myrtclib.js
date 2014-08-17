/*global onRoomReceived, attachMediaStream, RTCPeerConnection,
 getUserMedia, webrtcDetectedBrowser, RTCSessionDescription , RTCIceCandidate */
/*exported  myrtclibinit */
var pc = null;
var room = null;
var initiator;
var localStream;
var remoteStream;
var signalingURL;
var localVideo;
var remoteVideo;
var channelReady;
var channel;

var pc_config = {iceServers: [
  {url: 'stun:2321150.121'},
  {url: 'stun:stun.l.google.com:19302'}
]};

var sdpConstraints = {mandatory: {
  OfferToReceiveAudio: true,
  OfferToReceiveVideo: true
}};

function sendMessage (message) {
  var msgString = JSON.stringify(message);
  channel.send(msgString);
}

function setLocalAndSendMessage (sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function doAnswer () {
  pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function processSignalingMessage (message) {
  var msg = JSON.parse(message);
  if (msg.type === 'offer') {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    doAnswer();
  } else if (msg.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
  } else if (msg.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: msg.label,
      candidate: msg.candidate});
    pc.addIceCandidate(candidate);
  } else if (msg.type === 'GETROOM') {
    room = msg.value;
    onRoomReceived(room);
  } else if (msg.type === 'WRONGROOM') {
    window.location.href = '/';
  }
}

function onIceCandidate (event) {
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  }
}

function onRemoteStreamAdded (event) {
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
}

function mergeConstraints (cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    if (cons2.mandatory.hasOwnProperty(name)) {
      merged.mandatory[name] = cons2.mandatory[name];
    }
  }
    merged.optional.concat(cons2.optional);
    return merged;
}

function doCall () {
  var constraints = {optional: []};
  if (webrtcDetectedBrowser === 'firefox') {
    constraints.mandatory = {MozDontOfferDataChannel: true};
  }
  constraints = mergeConstraints(constraints, sdpConstraints);
  pc.createOffer(setLocalAndSendMessage, null, constraints);
}

function createPeerConnection () {
  var pc_constraints = {optional: [{DtlsSrtpKeyAgreement: true}]};
  try {
    pc = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidaet = onIceCandidate;
    pc.onaddstream = onRemoteStreamAdded;
  } catch (e) {
    pc = null;
    return;
  }
}

function onUserMediaSuccess (stream) {
  attachMediaStream(localVideo, stream);
  localStream = stream;
  createPeerConnection();
  pc.addStream(localStream);
  if (initiator) {
    doCall();
  }
}

function doGetUserMedia () {
  var constraints = {audio: true, video: {mandatory: {}, optional: []}};
  try {
    getUserMedia(constraints, onUserMediaSuccess, null);
  } catch (e) {}
}

function onChannelOpened () {
  channelReady = true;
  if (location.search.substring(1, 5) === 'room') {
    room = location.search.substring(6);
    sendMessage({type: 'ENTERROOM', value: room * 1});
    initiator = true;
  } else {
    sendMessage({type: 'GETROOM', value: ''});
    initiator = false;
  }
  doGetUserMedia();
}

function onChannelMessage (message) {
 processSignalingMessage(message.data);
}

function onChannelClosed () {
  channelReady = false;
}

function openChannel () {
  channelReady = false;
  channel = new WebSocket(signalingURL);
  channel.onopen = onChannelOpened;
  channel.onmessage = onChannelMessage;
  channel.onclose = onChannelClosed;
}

function myrtclibinit (sURL, lv, rv) {
  signalingURL = sURL;
  localVideo = lv;
  remoteVideo = rv;
  openChannel();
}
