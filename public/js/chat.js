$(() => {
    const socket = io.connect(location.origin);

    const profileImg = $("#profile-img");
    let currentUser = {id: -1, name: "Anonymous", avatar: "/images/default_avatar.png"};
    let currentChat;
    const chat_list = {};

    $.ajax({
        url: "/user",
        accept: "application/json",
        success: (json) => {
            currentUser = json;
            profileImg.attr("src", json.avatar);
            $(".username").html(json.fullname);
            comeOnline();
        }
    });

    const comeOnline = () => {
        socket.emit("come-online", currentUser);
    };

    socket.on("online-friends", friends => {
        console.log(friends);
        friends.forEach(fr => {
            changeStatus(fr, "online");
        })
    });

    socket.on("friend-change-status", data => {
        console.log(data);
        const {user_id, avatar, fullname} = data;
        changeStatus(user_id);
    });

    const changeStatus = (fr) => {
        for (const chat in chat_list) {
            if (chat_list.hasOwnProperty(chat)) {
                const meta = chat_list[chat].meta;
                console.log(meta);
                if (meta.list_id.includes(fr)) {
                    console.log(meta.chat_id);
                    $(`#chat-${meta.chat_id}>.wrap>span`).attr("data-status", "online")
                }
            }
        }
    };

    const contact_list = $("#contact-list").html("");
    const fetchRecent = (page) => {
        $.ajax({
            url: "/chat/recent",
            accept: "application/json",
            data: {page},
            success: data => {
                renderRecent(data);

            }
        });
    };
    fetchRecent();

    const renderRecent = (data) => {
        data.forEach(chat => {
            let {avatar, chat_id, name, everyone, ids, content, user_id, fullname, last_update} = chat;
            name = name || everyone.replace(/,/g, ", ");
            const list_id = ids.split(",").map(e => parseInt(e));

            chat_list[chat_id] = {meta: {...chat, list_id}};

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

    const changeConversation = chatId => {
        if (currentChat === chatId) return;
        currentChat = chatId;
        $.ajax({
            url: "/chat/content",
            accept: "application/json",
            method: "POST",
            data: {chatId},
            success: data => {
                $("#content").html(renderChat(data.info));
                $("#chat-content").html(renderChatContent(data));
            }
        })
    };

    const renderChat = (chat) => {
        const {avatar} = chat;
        return `<div class="contact-profile">
            <img src="${avatar}" alt=""/>
            <!--<p></p>-->
            <!--<div class="social-media">-->
            <!--<i class="fa fa-facebook" aria-hidden="true"></i>-->
            <!--<i class="fa fa-twitter" aria-hidden="true"></i>-->
            <!--<i class="fa fa-instagram" aria-hidden="true"></i>-->
            <!--</div>-->
        </div>
        <div id="chat" class="messages"><ul id="chat-content"></ul></div>
        <div class="message-input">
            <div class="wrap">
                <input id="txt-chat" type="text" placeholder="Write a message..."/>
                <button class="attach"><i class="fa fa-plus more" aria-hidden="true"></i></button>
                <button class="submit"><i class="fa fa-paper-plane" aria-hidden="true"></i></button>
            </div>
        </div>`
    };

    const renderChatContent = data => {
        const {members, content} = data;
        const member_list = members.reduce((result, current) => {
            result[current.id] = current;
            return result;
        }, {});

        const chatContent = $("#chat-content");
        content.forEach(msg => {
            let from = (msg.user_id === currentUser.id) ? 'sent' : 'replies';
            chatContent.prepend($(`<li class="${from}">
                    <img src="${member_list[msg.user].avatar}" alt="" />
                    <p>${msg.content}</p>
                </li>`));
        });
        $("#chat").scrollEnd("fast");
    };

    const message_div = $(".messages");
    message_div.animate({scrollTop: $(document).height()}, "fast");

    profileImg.on("click", () => $("#status-options").toggleClass("active"));

    $(".expand-button").click(() => {
        $("#profile").toggleClass("expanded");
        $("#contacts").toggleClass("expanded");
    });

    $("#status-options ul li").click(e => {
        profileImg.removeClass();
        const online = $("#status-online").removeClass("active");
        const away = $("#status-away").removeClass("active");
        const busy = $("#status-busy").removeClass("active");
        const offline = $("#status-offline").removeClass("active");

        $(e.target).addClass("active");
        console.log(e.target);

        if (online.hasClass("active")) {
            profileImg.addClass("online");
        } else if (away.hasClass("active")) {
            profileImg.addClass("away");
        } else if (busy.hasClass("active")) {
            profileImg.addClass("busy");
        } else if (offline.hasClass("active")) {
            profileImg.addClass("offline");
        } else {
            profileImg.removeClass();
        }
        $("#status-options").removeClass("active");
    });

    const sendMessage = () => {
        const msg_inp = $("#txt-chat");
        const message = msg_inp.val();
        if ($.trim(message) === '') {
            return false;
        }
        socket.emit('new-message', {message, chat_id: currentChat, user_id:currentUser.id});
        $('.messages ul').append($(`<li class="sent"><img src="${currentUser.avatar}" alt="" /><p>${message}</p></li>`));
        msg_inp.val("").focus();
        $('.contact.active .preview').html(`<span>You: </span>${message}`);
        $("#chat").scrollEnd("fast");
    };

    $('.submit').on("click", sendMessage);

    socket.on("new-message", data => {
        const {} = data;
    });

    $(window).on('keydown', e => {
        if (e.which === 13) {
            sendMessage();
            return false;
        }
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
        console.log(txt);

    });

    const searchUser = txt => {

    }
});