const chat_list = {};

$(() => {
    const socket = io.connect(location.origin);

    const profileImg = $("#profile-img");
    let currentUser = {};
    let currentChat;

    $.ajax({
        url: "/user",
        accept: "application/json",
        success: (user) => {
            currentUser = user;
            profileImg.attr("src", user.avatar);
            $(".username").html(user.fullname);
            $("#mail").val(user.email);
            socket.emit("come-online", currentUser);
        }
    });

    socket.on("online-friends", friends => {
        friends.forEach(fr => changeStatus(fr, "online"))
    });

    socket.on("friend-change-status", data => {
        const {id, status} = data;
        changeStatus(id, status);
    });

    const changeStatus = (fr, status) => {
        for (const chat in chat_list) {
            if (chat_list.hasOwnProperty(chat)) {
                const meta = chat_list[chat].meta;
                if (meta.list_user.includes(fr)) {
                    $(`#chat-${meta.chat_id}>.wrap>span`).attr("data-status", status)
                }
            }
        }
    };

    const contact_list = $("#contact-list").html("");
    const fetchMeta = (param) => new Promise((resolve, reject) => {
        $.ajax({
            url: "/chat/recent",
            accept: "application/json",
            data: param,
            success: data => resolve(data),
            error: err => reject(err)
        });
    });

    const fetchRecent = (param, notRender) => {
        return fetchMeta(param).then(data => renderRecent(data, notRender))
    };
    fetchRecent({});

    const renderRecent = (data, notRender) => {
        console.log(data);
        data.forEach(chat => {
            let {avatar, chat_id, name, everyone, ids, content, user_id, fullname, last_update} = chat;
            name = name || everyone.replace(/,/g, ", ");
            const list_user = ids.split(",").map(e => parseInt(e));

            chat_list[chat_id] = {meta: {...chat, name, list_user}};

            if (notRender) return;

            if (user_id === currentUser.id) {
                content = `<span style="font-weight: bold">You:</span> ${content}`;
            } else {
                content = `<span style="font-weight: bold">${fullname.split(" ")[0]}:</span> ${content}`;
            }
            const update = new Date(last_update);
            $(`<li id="chat-${chat_id}" class="contact" data-chat-id="${chat_id}" title="${name} - ${update}">
                <div class="wrap">
                    <span class="contact-status ${status}"></span>
                    <img src="${avatar || "/images/default_avatar.png"}" alt="" />
                    <div class="meta">
                        <p class="name">${name}</p>
                        <p class="preview">${content}</p>
                    </div>
                </div>
            </li>`).on("click", e => {
                let el = e.target;
                while (el && el.tagName !== 'LI') {el = el.parentNode}
                changeConversation($(el).attr("data-chat-id"));
            }).appendTo(contact_list);
        });
    };

    const changeConversation = id => {
        $(`.contact`).removeClass("active");
        $(`#chat-${id}`).addClass("active").removeClass("new-msg");

        if (currentChat === id) return;

        currentChat = id;
        const chat = chat_list[id];
        const option = {renderChat: true};
        if (chat) {
            fetchConversation({id, last_update: chat.last_update}, option)
        } else {
            fetchConversation({id}, option);
        }
    };

    const fetchConversation = (conversation, option) => {
        $.ajax({
            url: "/chat/content",
            accept: "application/json",
            method: "POST",
            data: conversation,
            success: async data => {
                let chat = chat_list[data.id];
                if (!chat) {
                    await fetchRecent({id: data.id}, true);
                    currentChat = data.id;
                }
                chat = {...chat, ...data};
                displayChat(data.id, data, option)
            }
        })
    };

    const displayChat = (id, data, option) => {
        if (option.renderChat) $("#content").html(renderChat(id));
        populateChatContent(id, data, option);
        setLoadMoreEvent(id);
        setCallEvent();
        setSendEvent();
    };

    const renderChat = (id) => {
        console.log(`renderChat ${id}`);
        const {avatar, name} = chat_list[id].meta;
        return `<div class="contact-profile">
            <img src="${avatar || "/images/default_avatar.png"}" alt=""/>
            <p>${name}</p>
            <!--<div class="social-media"><i class="fa fa-facebook" aria-hidden="true"></i>-->
            <!--<i class="fa fa-twitter" aria-hidden="true"></i><i class="fa fa-instagram" aria-hidden="true"></i></div>-->
        </div>
        <div id="chat" class="messages">
            <br><div class="text-center col-12"><a href="#" id="load-more" class="text-center">Load older messages</a></div>
            <ul id="chat-content"></ul>
        </div>
        <div class="message-input">
            <div class="wrap">
                <input id="txt-chat" type="text" placeholder="Write a message..."/>
                <button class="attach"><i class="fa fa-plus more" aria-hidden="true"></i></button>
                <button class="submit"><i class="fa fa-paper-plane" aria-hidden="true"></i></button>
            </div>
        </div>`
    };

    const setLoadMoreEvent = (id) => {
        $("#load-more").on("click", e => {
            e.preventDefault();
            fetchConversation(
                {id: currentChat, oldest: chat_list[id].meta.oldest},
                {renderChat: false, stay: true}
            );
        })
    };

    let inCall = !1;
    let constrs = {};
    const setCallEvent = () => {
        $(".attach").on("click hover", e => {
            if (!inCall) $("#modal-call").modal("show");
        });

        $("#video-call").on("click", e => {
            startCall({audio: true, video: true})
        });

        $("#voice-chat").on("click", e => {
            startCall({audio: true, video: false})
        });

        const startCall = constraints => {
            openMediaChat();
            start(constraints);
            socket.emit("call", {
                chat_id: currentChat, user_id: currentUser.id, username: currentUser.fullname,
                recipients: chat_list[currentChat].meta.list_user
            })
        }
    };

    const setSendEvent = () => {$('.submit').on("click", sendMessage);};

    const populateChatContent = (id, data, option) => {
        const {members, content} = data;
        const member_list = members.reduce((result, current) => {
            result[current.user_id] = current;
            return result;
        }, {});
        chat_list[id].members = member_list;

        const chatContent = $("#chat-content");
        if (content.length > 0) {
            let time = chat_list[id].meta.last_update;
            content.forEach(msg => {
                if (msg.time < time) {time = msg.time}
                chatContent.prepend($(renderMessage(member_list[msg.user_id], msg)));
            });
            chat_list[id].meta.oldest = time;
        }
        if (content.length < 10) {
            $("#load-more").addClass("hidden")
        }

        if (!option.stay) $("#chat").scrollEnd("fast");
    };

    const renderMessage = (member, msg) => {
        const from = (msg.user_id === currentUser.id) ? 'sent' : 'replies';
        return `<li class="${from}" title="${member.nickname || member.fullname} - ${new Date(msg.time)}">
                    <img src="${member.avatar}" alt="" /><p>${msg.content}</p>
               </li>`
    };

    const message_div = $(".messages");
    message_div.animate({scrollTop: $(document).height()}, "fast");

    profileImg.on("click", () => $("#status-options").toggleClass("active"));

    $(".expand-button").on("click", () => {
        $("#profile").toggleClass("expanded");
        $("#contacts").toggleClass("expanded");
    });

    $("#status-options ul li").on("click", e => {
        let el = e.target;
        while (el && el.tagName !== 'LI') {el = el.parentNode}

        profileImg.removeClass();
        $(".status").removeClass("active");
        $(el).addClass("active");

        const status = $(".status.active").attr("data-status");
        profileImg.addClass(status);
        $("#status-options").removeClass("active");

        socket.emit("change-status", {id: currentUser.id, status})
    });

    const sendMessage = () => {
        const msg_inp = $("#txt-chat");
        const message = escape(msg_inp.val());
        if ($.trim(message) === '') {
            return false;
        }

        const recipients = chat_list[currentChat].meta.list_user;
        socket.emit('new-message', {message, chat_id: currentChat, user_id: currentUser.id, recipients});

        msg_inp.val("").focus();
        $("#chat").scrollEnd("fast");
        $('.messages ul').append($(`<li class="sent"><img src="${currentUser.avatar}" alt="" /><p>${message}</p></li>`));
        $(`#chat-${currentChat} .preview`).html(`<span>You: </span>${message}`);
        moveToTop(currentChat, new Date());
    };

    const escape = (s) => {
        return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const moveToTop = (id, time, newmsg) => {
        const contact = $(`#chat-${id}`).detach().attr("title", `${chat_list[id].name} - ${time}`);
        if (newmsg) {
            contact.addClass("new-msg")
        }
        $(contact).prependTo("#contact-list");
    };

    socket.on("new_message", data => {
        const {chat_id, time} = data;
        const chat = chat_list[chat_id];
        if (!chat) { return; }

        moveToTop(chat_id, new Date(time), true);
        let {members} = chat;
        if (!members) {
            $.ajax({
                url: "/chat/member",
                accept: "application/json",
                data: {id: chat_id},
                success: member_list => {
                    members = member_list;
                    receiveMessage(data, members)
                }
            })
        } else {
            receiveMessage(data, members)
        }
    });

    const receiveMessage = (data, members) => {
        const {content, chat_id, user_id} = data;
        const member = members[user_id];

        $(`#chat-${chat_id} .preview`).html(`<span>${member.nickname || member.fullname} </span>${content}`);
        if (chat_id === currentChat) {
            $("#chat-content").append(renderMessage(member, data));
            $("#chat").scrollEnd("fast");
        }
    };

    $(window).on('keydown', e => {
        if (e.which === 13) {
            sendMessage();
            return false;
        }
    });

    $("#sidepanel").hover(function () {
        $(this).addClass("hover");
    }, function () {
        $(this).removeClass("hover");
    });

    $.fn.extend({
        doneTyping: function (callback, timeout) {
            timeout = timeout || 500;
            let timeoutReference;
            const doneTyping = el => {
                if (!timeoutReference) return;
                timeoutReference = null;
                callback.call(el);
            };
            return this.each((i, el) => {
                const $el = $(el);
                $el.is(':input') && $el.on('keyup keypress paste', e => {
                    if (e.type === 'keyup' && e.keyCode !== 8) return;
                    if (timeoutReference) clearTimeout(timeoutReference);
                    timeoutReference = setTimeout(() => doneTyping(el), timeout);
                }).on('blur', () => doneTyping(el));
            });
        },

        scrollEnd: function (option) {
            this.animate({scrollTop: this.prop("scrollHeight")}, option);
        }
    });

    const search = $("#txt-search");
    search.doneTyping(() => {
        const txt = search.val();
        contact_list.html("");
        if (txt) {
            findFriends(txt)
        } else {
            fetchRecent({});
        }
    });

    const findFriends = q => {
        $.ajax({
            url: "/user/friend",
            data: {search: q},
            accept: "application/json",
            success: data => renderSearch(data)
        })
    };

    const renderSearch = (data) => {
        console.log(data);
        data.forEach(datum => {
            const {id, fullname, email, avatar} = datum;
            $(`<li id="user-${id}" class="contact" data-user-id="${id}">
                <div class="wrap">
                    <img src="${avatar || "/images/default_avatar.png"}" alt="" />
                    <div class="meta">
                        <p class="name">${fullname}</p>
                        <p class="preview">${email}</p>
                    </div>
                </div>
            </li>`).on("click", e => {
                let el = e.target;
                while (el && el.tagName !== 'LI') {el = el.parentNode}
                createConversation($(el).attr("data-user-id"));
                contact_list.html(el);
                fetchRecent({});
            }).appendTo(contact_list);
        })
    };

    const createConversation = (id) => {
        fetchConversation({user: id}, {renderChat: true})
    };

    $("#btn-search-user").on("click", e => {
        const search = $("txt-search-user").val();
        $.ajax({
            url: "/user/search",
            data: {search},
            accept: "application/json",
            success: data => {
                console.log(data);

            }
        })
    });

    //region media call
    $("#btn-voice").on("click", e => {
        let {audio, video} = constrs;
        audio = !audio;
        updateCall({audio, video})
    });

    $("#btn-video").on("click", e => {
        let {audio, video} = constrs;
        video = !video;
        updateCall({audio, video})
    });

    $("#btn-hangup").on("click", e => {
        socket.emit("end-call", {chat_id: currentChat});
        hangup();
    });

    const audio = new Audio('/media/ring.wav');
    let playAudio = false;
    socket.on("incoming-call", data => {
        const {chat_id, user_id, username} = data;
        $("#call-msg").html(`${username} is calling you`);
        $("#modal-incoming-call").modal("show");
        playAudio = true;
        audio.play();
        audio.onended = () => {
            if (playAudio) audio.play();
        };
        setTimeout(() => {
            playAudio = false;

        }, 30000);

        $("#btn-decline").on("click", e => {
            $("#modal-incoming-call").modal("hide");
            playAudio = false;
        });

        $("#btn-answer").on("click", e => {
            $("#modal-incoming-call").modal("hide");
            playAudio = false;
            openMediaChat();
            startCall(chat_id, currentUser.id);
        });
    });

    const startCall = (chat_id, user_id) => {
        socket.emit("answer", {chat_id, user_id})
    };

    socket.on("answer", data => {
        call(constrs);
    });

    socket.on("call-end", data => {
        hangup()
    });

    const upgradeButton = document.getElementById('upgradeButton');
    // startButton.onclick = start;
    // callButton.onclick = call;
    // upgradeButton.onclick = upgrade;

    let startTime;
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    localVideo.addEventListener('loadedmetadata', function () {
        console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    });

    remoteVideo.addEventListener('loadedmetadata', function () {
        console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    });

    remoteVideo.onresize = () => {
        console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
        console.warn('RESIZE', remoteVideo.videoWidth, remoteVideo.videoHeight);
        // We'll use the first onsize callback as an indication that video has started playing out.
        if (startTime) {
            const elapsedTime = window.performance.now() - startTime;
            console.log(`Setup time: ${elapsedTime.toFixed(3)}ms`);
            startTime = null;
        }
    };

    const config = {"iceServers": [{}]}; // "url": "stun:stun.l.google.com:19302"
    const connection = {};
    let localStream;
    let pc1;
    let pc2;

    function getName(pc) {
        return (pc === pc1) ? 'pc1' : 'pc2';
    }

    function getOtherPc(pc) {
        return (pc === pc1) ? pc2 : pc1;
    }

    const updateIcon = (constraints) => {
        const {video, audio} = constraints;
        if (video) {
            $("#ico-video").removeClass("fa-video-slash").addClass("fa-video");
        } else {
            $("#ico-video").removeClass("fa-video").addClass("fa-video-slash");
        }

        if (audio) {
            $("#ico-voice").removeClass("fa-microphone-slash").addClass("fa-microphone");
        } else {
            $("#ico-voice").removeClass("fa-microphone").addClass("fa-microphone-slash");
        }
    };

    function start(constraints) {
        constrs = constraints;
        console.log('Requesting local stream');
        updateIcon(constraints);
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            console.log('Received local stream');
            localVideo.srcObject = stream;
            localStream = stream;
        }).catch(e => {
            console.log(e);
            alert(`Cannot establish connection`);
            closeMediaChat()
        });
    }

    function call(constraints) {
        console.log('Starting call');
        startTime = window.performance.now();
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {console.log(`Using audio device: ${audioTracks[0].label}`);}

        pc1 = new RTCPeerConnection(null);
        pc1.onicecandidate = e => onIceCandidate(pc1, e);

        pc2 = new RTCPeerConnection(null);
        pc2.onicecandidate = e => onIceCandidate(pc2, e);

        pc1.oniceconnectionstatechange = e => onIceStateChange(pc1, e);
        pc2.oniceconnectionstatechange = e => onIceStateChange(pc2, e);
        pc2.ontrack = gotRemoteStream;

        localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
        console.log('Added local stream to pc1');
        console.log('pc1 createOffer start');
        const {audio, video} = constraints;
        pc1.createOffer({
            offerToReceiveAudio: audio,
            offerToReceiveVideo: video
        }).then(onCreateOfferSuccess, onCreateSessionDescriptionError);
    }

    function onCreateSessionDescriptionError(error) {
        console.log(`Failed to create session description: ${error.toString()}`);
    }

    function onCreateOfferSuccess(desc) {
        console.log(`Got offer from pc1`);
        console.log('pc1 setLocalDescription start');
        pc1.setLocalDescription(desc).then(() => onSetLocalSuccess(pc1), onSetSessionDescriptionError);
        console.log('pc2 setRemoteDescription start');
        pc2.setRemoteDescription(desc).then(() => onSetRemoteSuccess(pc2), onSetSessionDescriptionError);
        console.log('pc2 createAnswer start');
        // Since the 'remote' side has no media stream we need to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        pc2.createAnswer().then((desc) => {
            console.log(`Got answer from pc2`);
            console.log('pc2 setLocalDescription start');
            pc2.setLocalDescription(desc).then(() => onSetLocalSuccess(pc2), onSetSessionDescriptionError);
            console.log('pc1 setRemoteDescription start');
            pc1.setRemoteDescription(desc).then(() => onSetRemoteSuccess(pc1), onSetSessionDescriptionError);
        }, onCreateSessionDescriptionError);
    }

    function onSetLocalSuccess(pc) {
        console.log(`${getName(pc)} setLocalDescription complete`);
    }

    function onSetRemoteSuccess(pc) {
        console.log(`${getName(pc)} setRemoteDescription complete`);
    }

    function onSetSessionDescriptionError(error) {
        console.log(`Failed to set session description: ${error.toString()}`);
    }

    function gotRemoteStream(e) {
        console.log('gotRemoteStream', e.track, e.streams[0]);

        remoteVideo.srcObject = null;
        remoteVideo.srcObject = e.streams[0];
    }

    function onIceCandidate(pc, event) {
        getOtherPc(pc).addIceCandidate(event.candidate).then(() => {
            console.log(`${getName(pc)} addIceCandidate success`);
        }, error => {
            console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
        });
        console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    }

    function onIceStateChange(pc, event) {
        if (pc) {
            console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
            console.log('ICE state change event: ', event);
        }
    }

    function updateCall(constraints) {
        constrs = constraints;
        updateIcon(constraints);
        console.log(constraints);
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                console.log(`Using video device: ${videoTracks[0].label}`);
            }
            localStream.addTrack(videoTracks[0]);
            localVideo.srcObject = null;
            localVideo.srcObject = localStream;
            pc1.addTrack(videoTracks[0], localStream);
            return pc1.createOffer();
        }).then(offer => {
            pc1.setLocalDescription(offer)
        }).then(() => {
            pc2.setRemoteDescription(pc1.localDescription)
        }).then(() => {
            pc2.createAnswer()
        }).then(answer => {
            pc2.setLocalDescription(answer)
        }).then(() => {
            pc1.setRemoteDescription(pc2.localDescription)
        });
    }

    function hangup() {
        inCall = !1;
        console.log('Ending call');
        closeMediaChat();

        pc1.close();
        pc1 = null;
        pc2.close();
        pc2 = null;

        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(videoTrack => {
            videoTrack.stop();
            localStream.removeTrack(videoTrack);
        });
        localVideo.srcObject = null;
        localVideo.srcObject = localStream;
        socket.emit("call-end", {chat_id: currentChat})
    }

    const openMediaChat = () => {
        inCall = true;
        $("#modal-call").modal("hide");

        const width = $(window).width();
        if (width < 768) {
            const margin = width - 58;
            $("#frame").addClass("call").css({marginRight: margin});
            $("#media-call").removeClass("hidden").css({width: margin});
        } else {
            $("#frame").addClass("call").css({marginRight: "60%"});
            $("#media-call").removeClass("hidden").css({width: "60%"});
        }
    };

    const closeMediaChat = () => {
        $("#frame").removeClass("call").css({marginRight: 0});
        $("#media-call").addClass("hidden").css({width: 0});
    }
    //endregion media call
});