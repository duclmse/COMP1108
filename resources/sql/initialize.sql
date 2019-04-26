CREATE TABLE Users (
    id              INTEGER PRIMARY KEY,
    username        TEXT UNIQUE,
    fullname        TEXT,
    email           TEXT UNIQUE,
    avatar          TEXT,
    hashed_password TEXT
);

CREATE TABLE RelationshipTypes (
    id   INTEGER,
    name TEXT,
    PRIMARY KEY (id)
);

CREATE TABLE Relationships (
    user_1      INTEGER,
    user_2      INTEGER,
    action_user INTEGER,
    status      INTEGER,
    PRIMARY KEY (user_1, user_2),
    FOREIGN KEY (user_1) REFERENCES Users (id),
    FOREIGN KEY (user_2) REFERENCES Users (id),
    FOREIGN KEY (action_user) REFERENCES Users (id),
    FOREIGN KEY (status) REFERENCES RelationshipTypes (id)
);

CREATE TABLE Chats (
    id   INTEGER PRIMARY KEY,
    name TEXT
);

CREATE TABLE ChatMembers (
    chat_id  INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    nickname TEXT,
    PRIMARY KEY (chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES Chats (id),
    FOREIGN KEY (user_id) REFERENCES Users (id)
);

CREATE TABLE Messages (
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    time    INTEGER,
    content TEXT,
    PRIMARY KEY (chat_id, user_id, time),
    FOREIGN KEY (chat_id) REFERENCES Chats (id),
    FOREIGN KEY (user_id) REFERENCES Users (id)
);


