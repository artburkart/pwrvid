/*jslint browser: true, indent: 4, devel: true */
/*global performance: false, webkitRTCPeerConnection: false,
mozRTCPeerConnection: false, RTCSessionDescription: true,
mozRTCSessionDescription: false, RTCIceCandidate: true,
mozRTCIceCandidate: false */

// JavaScript variables associated with send and receive channels
var sendChannel, receiveChannel, localPeerConnection = null, remotePeerConnection = null;

// JavaScript variables associated with demo elements
var startButton = document.getElementById('startButton2');
var sendButton = document.getElementById('sendButton');
var closeButton = document.getElementById('closeButton');
var dataChannelSend = document.getElementById('dataChannelSend');
var dataChannelReceive = document.getElementById('dataChannelReceive');

// Enable startButton 
startButton.disabled = false;
sendButton.disabled = true;
closeButton.disabled = true;

//Utility function for logging information to the JavaScript console
function logger(text) {
    console.log('At time: ' + (performance.now() / 1000).toFixed(3) + ' --> ' + text);
}

function onSignalingError(error) {
    console.log('Failed to create signaling message : ' + error.name);
}

// Handler for sending data to the remote peer
function sendData() {
    var data = dataChannelSend.value;
    sendChannel.send(data);
    logger('Sent data: ' + data);
}

// Handler for closeButton
function closeDataChannels() {
    // Close data channels
    logger('Closing data channels');
    sendChannel.close();
    logger('Closed data channel with label: ' + sendChannel.label);
    receiveChannel.close();
    logger('Closed data channel with label: ' + receiveChannel.label);

    // Close peer connections
    localPeerConnection.close();
    remotePeerConnection.close();

    // Reset remote and local peer connections
    localPeerConnection = null;
    remotePeerConnection = null;
    logger('Closed peer connections');

    // Rollback to the initial setup of the HTML5 page
    startButton.disabled = false;
    sendButton.disabled = true;
    closeButton.disabled = true;
    dataChannelSend.value = '';
    dataChannelReceive.value = '';
    dataChannelSend.disabled = true;
    dataChannelSend.placeholder = '1: Press Start; 2: Enter text; 3: Press Send.';
}

// Handler for SDP made available to the application
function gotRemoteDescription(desc) {
    // Set remote SDP as (remote/local) description for both local and remote parties
    remotePeerConnection.setLocalDescription(desc);
    logger('Answer from remotePeerConnection\'s SDP: \n' + desc.sdp);
    localPeerConnection.setRemoteDescription(desc);
}

// Handler local SDP made available to the application
function gotLocalDescription(desc) {
    // Set local SDP as (local/remote) description for both local and remote parties
    localPeerConnection.setLocalDescription(desc);
    logger('localPeerConnection\'s SDP: \n' + desc.sdp);
    remotePeerConnection.setRemoteDescription(desc);

    // Create answer from the remote party, based on the local SDP
    remotePeerConnection.createAnswer(gotRemoteDescription, onSignalingError);
}

// Handler for new local ICE candidate
function gotLocalCandidate(event) {
    logger('local ice callback');
    if (event.candidate) {
        remotePeerConnection.addIceCandidate(event.candidate);
        logger('Local ICE candidate: \n' + event.candidate.candidate);
    }
}

// Handler for remote ICE candidate
function gotRemoteIceCandidate(event) {
    logger('remote ice callback');
    if (event.candidate) {
        localPeerConnection.addIceCandidate(event.candidate);
        logger('Remote ICE candidate: \n ' + event.candidate.candidate);
    }
}

// Message event handler
function handleMessage(event) {
    logger('Received message: ' + event.data);
    // Display message on page
    dataChannelReceive.value = event.data;
    // Clear text area in page
    dataChannelSend.value = '';
}

// Handler for 'open' and 'close' events on sender's data channel
function handleSendChannelStateChange() {
    var readyState = sendChannel.readyState;
    logger('Send channel state is: ' + readyState);
    if (readyState === 'open') {
        // Enable 'Send' text area and set focus
        dataChannelSend.disabled = false;
        dataChannelSend.focus();
        dataChannelSend.placeholder = '';

        // Enable sendButton and closeButton
        sendButton.disabled = false;
        closeButton.disabled = false;
    } else {
        // Disable 'Send' text area if sendChannel is 'close'
        dataChannelSend.disabled = true;

        // Disable sendButton and closeButton
        sendButton.disabled = true;
        closeButton.disabled = true;
    }
}

// Handler for 'open' or 'close' events on receiver's data channel
function handleReceiveChannelStateChange() {
    var readyState = receiveChannel.readyState;
    logger('Receive channel state is: ' + readyState);
}

// Handler for remote peer connection's data channel events
function gotReceiveChannel(event) {
    logger('Receive Channel Callback: event --> ' + event);
    // Retrieve channel information
    receiveChannel = event.channel;
    // Set handlers for the following events:
    // (i) open; (ii) message; (iii) close
    receiveChannel.onopen = handleReceiveChannelStateChange;
    receiveChannel.onmessage = handleMessage;
    receiveChannel.onclose = handleReceiveChannelStateChange;
}

function createConnection() {
    var RTCPeerConnection, servers = null;

    // Chrome
    if (navigator.webkitGetUserMedia) {
        RTCPeerConnection = webkitRTCPeerConnection;
    // Firefox
    } else if (navigator.mozGetUserMedia) {
        RTCPeerConnection = mozRTCPeerConnection;
        RTCSessionDescription = mozRTCSessionDescription;
        RTCIceCandidate = mozRTCIceCandidate;
    }

    logger('RTCPeerConnection object: ' + RTCPeerConnection);

    // JavaScript variable for proper configuration of an RTCPeerConnection object: use DTLS/SRTP
    var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

    // Create the local PeerConnection object with data channels
    localPeerConnection = new RTCPeerConnection(servers, pc_constraints);
    logger('Created local peer connection object, with Data Channel');

    try {
        // Note: SCTP-based reliable DataChannels supported in Chrome 29+ !
        // use {reliable: false} for older versions of Chrome
        sendChannel = localPeerConnection.createDataChannel('sendDataChannel', {reliable: true});
        logger('Created reliable send data channel');
    } catch (e) {
        alert('Failed to create data channel!');
        logger('createDataChannel() failed with following message: ' + e.message);
    }

    // Associate handlers with peer connection ICE events
    localPeerConnection.onicecandidate = gotLocalCandidate;

    // Associate handlers with data channel events
    sendChannel.onopen = handleSendChannelStateChange;
    sendChannel.onclose = handleSendChannelStateChange;

    // Mimic a remote peer connection
    window.remotePeerConnection = new RTCPeerConnection(servers, pc_constraints);
    logger('Created remote peer connection object, with DataChannel');

    // Associate handlers with peer connection ICE events and data channel creation event
    remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
    remotePeerConnection.ondatachannel = gotReceiveChannel;

    // Start negotiating session
    localPeerConnection.createOffer(gotLocalDescription, onSignalingError);

    // Disable startButton and closeButton
    startButton.disabled = true;
    closeButton.disabled = false;
}

//Associate handlers with buttons
startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;