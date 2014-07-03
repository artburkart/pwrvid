// var constraints = {audio: false, video: true};
var video = document.querySelector("video")

var vgaButton = document.querySelector("button#vga");
var qvgaButton = document.querySelector("button#qvga");
var hdButton = document.querySelector("button#hd");

var stream;

navigator.getUserMedia = navigator.getUserMedia
    || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia;

function success(stream) {
    window.stream = stream;
    if (window.URL) {
        video.src = window.URL.createObjectURL(stream);
    } else {
        video.src = stream;
    }
    video.play();
}

function error(err) {
    console.log("navigator.getUserMedia error: ", err);
}

var qvgaConstraints = {
    video: {
        mandatory: {
            maxWidth: 320,
            maxHeight: 240
        }
    }
};

var vgaConstraints = {
    video: {
        mandatory: {
            maxWidth: 640,
            maxHeight: 480
        }
    }
};

var hdConstraints = {
    video: {
        mandatory: {
            maxWidth: 1366,
            maxHeight: 768
        }
    }
};

qvgaButton.onclick = function(){getMedia(qvgaConstraints)};
vgaButton.onclick = function(){getMedia(vgaConstraints)};
hdButton.onclick = function() {getMedia(hdConstraints)};

function getMedia(constraints) {
    if (!!stream) {
        video.src = null;
        stream.stop();
    }
    navigator.getUserMedia(constraints, success, error);
}
