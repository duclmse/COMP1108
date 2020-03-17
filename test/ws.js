let ws;
const openWs = function () {
    ws = new WebSocket(`ws://${location.origin}:8088`);

    ws.onopen = function (e) {
        console.log("Websocket opened");
    };
    ws.onclose = function (e) {
        console.log("Websocket closed");
    };
    ws.onmessage = function (e) {
        console.log("Websocket message received: " + e.data);

        const json = JSON.parse(e.data);

        if (json.action === "candidate") {
            if (json.to === user) {
                processIce(json.data);
            }
        } else if (json.action === "offer") {
            // incoming offer
            if (json.to === user) {
                user2 = json.from;
                processOffer(json.data)
            }
        } else if (json.action === "answer") {
            // incoming answer
            if (json.to === user) {
                processAnswer(json.data);
            }
        }
    };
    ws.onerror = function (e) {
        console.log("Websocket error");
    }
};

const config = {"iceServers": [{}]}; // "url": "stun:stun.l.google.com:19302"
const connection = {};

let peerConnection;
let dataChannel;

function openDataChannel() {
    peerConnection = new RTCPeerConnection(config, connection);
    peerConnection.onicecandidate = function (e) {
        if (!peerConnection || !e || !e.candidate) return;
        const candidate = e.candidate;
        sendNegotiation("candidate", candidate);
    };

    dataChannel = peerConnection.createDataChannel("datachannel", {reliable: false});

    dataChannel.onopen = function () {
        console.log("------ DATACHANNEL OPENED ------");
        $("#sendform").show();
    };
    dataChannel.onclose = function () {console.log("------ DC closed! ------")};
    dataChannel.onerror = function () {console.log("DC ERROR!!!")};

    peerConnection.ondatachannel = function (ev) {
        console.log('peerConnection.ondatachannel event fired.');
        ev.channel.onopen = function () {
            console.log('Data channel is open and ready to be used.');
        };
        ev.channel.onmessage = function (e) {
            console.log("DC from [" + user2 + "]:" + e.data);
            $('body').append(user2 + ': <div class="message from">' + e.data + '</div>')
        }
    };

    return peerConnection
}

function connectTo(e) {
    e.preventDefault();
    user2 = $("#connectTo").val();
    openDataChannel();

    const sdpConstraints = {offerToReceiveAudio: true, offerToReceiveVideo: false};
    peerConnection.createOffer(sdpConstraints).then(function (sdp) {
        peerConnection.setLocalDescription(sdp);
        sendNegotiation("offer", sdp);
        console.log("------ SEND OFFER ------");
    }, function (err) {
        console.log(err)
    });

}

function sendDirect(e) {
    e.preventDefault();
    dataChannel.send($("#message").val());
    $('body').append('Me: <div class="message">' + $("#message").val() + '</div>');
    console.log("Sending over datachannel: " + $("#message").val());
    $("#message").val('');
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
}

function sendNegotiation(type, sdp) {
    const json = {from: user, to: user2, action: type, data: sdp};
    ws.send(JSON.stringify(json));
    console.log("Sending [" + user + "] to [" + user2 + "]: " + JSON.stringify(sdp));
}

function processOffer(offer) {
    const peerConnection = openDataChannel();
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).catch(e => {
        console.log(e)
    });

    const sdpConstraints = {
        mandatory: {
            'OfferToReceiveAudio': false,
            'OfferToReceiveVideo': false
        }
    };

    peerConnection.createAnswer(sdpConstraints).then(function (sdp) {
        return peerConnection.setLocalDescription(sdp).then(function () {
            sendNegotiation("answer", sdp);
            console.log("------ SEND ANSWER ------");
        })
    }, function (err) {
        console.log(err)
    });
    console.log("------ PROCESSED OFFER ------");

}

function processAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("------ PROCESSED ANSWER ------");
    return true;
}

function processIce(iceCandidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(e => {
        debugger;
        console.log(e)
    })
}
