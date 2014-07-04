// Variables holding stream and connection information
var localStream, localPeerConnection, remotePeerConnection;

// Variables for video elements on page
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

// Variables for call management buttons on page
var startButton = document.getElementById("startButton");
var callButton = document.getElementById("callButton");
var hangupButton = document.getElementById("hangupButton");

// Only allow users to click on the startButton at startup
startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;

// Associate handlers with click events on buttons
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

// Utility function for logging information to frontend console
function log(text) {
    console.log("At time: " + (performance.now() / 1000).toFixed(3) + " --> " + text);
}

// Success callback for getUserMedia()
function successCallback(stream){
    log("Received local stream");

    // Associate local video element with retrieved stream
    localVideo.src = window.URL ? URL.createObjectURL(stream) : stream;
    localStream = stream;

    // Enable the Call button
    callButton.disabled = false;
}

// Function for startButton
function start() {
    log("Requesting local stream");
    
    // Disable the startButton on the page
    startButton.disabled = true;
    
    // Address different browsers
    navigator.getUserMedia = navigator.getUserMedia 
    || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    
    // Get video and audio media from user
    navigator.getUserMedia(
        {audio:true, video:true},
        successCallback,
        function(error) {
            log("navigator.getUserMedia error: ", error);
        }
    );
}

// Function for callButton
function call() {
    // Disable callButton, enable hangupButton
    callButton.disabled = true;
    hangupButton.disabled = false;
    log("Starting call");
    
    // Note getVideoTracks() and getAudioTracks() are not currently IE or Safari
    if(navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
        // Log info about video and audio device in use
        if (localStream.getVideoTracks().length > 0) {
            log('Using video device: ' + localStream.getVideoTracks()[0].label);
        }
        if (localStream.getAudioTracks().length > 0) {
            log('Using audio device: ' + localStream.getAudioTracks()[0].label);
        }
    }

    // Chrome
    if (navigator.webkitGetUserMedia) {
        RTCPeerConnection = webkitRTCPeerConnection;
    // Firefox
    } else if (navigator.mozGetUserMedia){
        RTCPeerConnection = mozRTCPeerConnection;
        RTCSessionDescription = mozRTCSessionDescription;
        RTCIceCandidate = mozRTCIceCandidate;
    }
    log("RTCPeerConnection object: " + RTCPeerConnection);
    
    // An optional configuration string associated with NAT traversal setup
    var servers = null;
    
    // Create localPeerConnection object
    localPeerConnection = new RTCPeerConnection(servers);
    log("Created local peer connection object localPeerConnection");
    
    // Add handler associated with ICE protocol events
    localPeerConnection.onicecandidate = gotLocalIceCandidate;
    
    // Create remotePeerConnection object
    remotePeerConnection = new RTCPeerConnection(servers);
    log("Created remote peer connection object remotePeerConnection");
    
    // Add handler for ICE protocol events and one for remote stream
    remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
    remotePeerConnection.onaddstream = gotRemoteStream;

    // Add the local stream to the local PeerConnection.
    localPeerConnection.addStream(localStream);
    log("Added localStream to localPeerConnection");

    // Create an Offer to be 'sent' to the callee as soon as the local SDP is ready.
    localPeerConnection.createOffer(gotLocalDescription, onSignalingError);
}

function onSignalingError(error){
    console.log('Failed to create signaling message : ' + error.name);
}

// Handler called when 'local' SDP becomes available
function gotLocalDescription(description){
    // Add local description to local PeerConnection
    localPeerConnection.setLocalDescription(description);
    log("Offer from localPeerConnection: \n" + description.sdp);

    // Add local description to 'pseudoremote' PeerConnection
    // Note: this will have to be changed for remote peers
    // (need to set up a proper signaling channel)
    remotePeerConnection.setRemoteDescription(description);

    // Create the Answer to the received Offer based on the 'local' description
    remotePeerConnection.createAnswer(gotRemoteDescription, onSignalingError);
}

// Handler to be called when the remote SDP becomes available
function gotRemoteDescription(description){
    // Set local description as local description of remotePeerConnection.
    remotePeerConnection.setLocalDescription(description);
    log("Answer from remotePeerConnection: \n" + description.sdp);

    // Set local description as remote description of localPeerConnection
    localPeerConnection.setRemoteDescription(description);
}

// Handler to be called when hanging up the call
function hangup() {
    log("Ending call");

    // Close PeerConnection(s)
    localPeerConnection.close();
    remotePeerConnection.close();

    // Reset local variables
    localPeerConnection = null;
    remotePeerConnection = null;

    // Disable Hangup button
    hangupButton.disabled = true;

    // Enable callButton to allow for new calls
    callButton.disabled = false;
}

// Handler called as soon as the remote stream is available
function gotRemoteStream(event){
    // Associate remote video element with retrieved stream
    remoteVideo.src = window.URL ? window.URL.createObjectURL(event.stream) : event.stream;
    log("Received remote stream");
}

// Handler called whenever new local ICE candidate is available
function gotLocalIceCandidate(event){
    if (event.candidate) {
        // Add candidate to remotePeerConnection
        remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        log("Local ICE candidate: \n" + event.candidate.candidate);
    }
}

// Handler called whenever new remote ICE candidate is available
function gotRemoteIceCandidate(event){
    if (event.candidate) {
        // Add candidate to localPeerConnection
        localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        log("Remote ICE candidate: \n " + event.candidate.candidate);
    }
}

