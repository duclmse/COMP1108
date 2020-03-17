-- most recent chat
SELECT CM.chat_id, C.name, C.avatar, last_update, content, M.user_id, U.fullname
FROM Chats C
         JOIN ChatMembers CM ON C.id = CM.chat_id
         JOIN Messages M ON C.id = M.chat_id
         JOIN Users U ON M.user_id = U.id
WHERE C.id IN (SELECT id
               FROM Chats
                        JOIN ChatMembers CM ON Chats.id = CM.chat_id
               WHERE user_id = ?)
  AND NOT (CM.user_id = ?)
  AND time = last_update
GROUP BY CM.chat_id
ORDER BY last_update DESC
LIMIT 10 OFFSET ?;

-- chat content
SELECT chat_id, user_id, content, time, name, avatar
FROM Messages M
         JOIN Chats C ON M.chat_id = C.id
WHERE chat_id = 1
ORDER BY time DESC
LIMIT 20 OFFSET 0;

INSERT INTO ChatMembers(chat_id, user_id, nickname)
VALUES (20, 21, NULL);

SELECT *
FROM ChatMembers
         JOIN Users U ON ChatMembers.user_id = U.id
WHERE chat_id = 20;

SELECT chat_id, max(time)
FROM Messages
GROUP BY chat_id;

SELECT count(*)
FROM Messages
GROUP BY chat_id;

UPDATE Chats
SET last_update = (SELECT max(TIME)
                   FROM Messages M
                   WHERE M.chat_id = Chats.id
                   GROUP BY chat_id);

SELECT *
FROM Chats
         JOIN ChatMembers CM ON Chats.id = CM.chat_id
WHERE user_id = 0;

INSERT INTO Messages (chat_id, user_id, content, time)
VALUES (1, 0, 'Le Minh Duc', 1555714397774);

SELECT *
FROM Users
LIMIT 10;

SELECT user_1, user_2
FROM Relationships
WHERE (user_1 = ? OR user_2 = ?)
  AND status = 2;

SELECT *
FROM Chats C
         JOIN ChatMembers CM ON C.id = CM.chat_id
WHERE c.id IN (
    SELECT chat_id
    FROM Chats
             JOIN ChatMembers CM ON Chats.id = CM.chat_id
    WHERE (CM.user_id = 0))
  AND CM.user_id IN (?);

SELECT user_id, content, time
FROM Messages M
         JOIN Chats C ON M.chat_id = C.id
WHERE chat_id = ?
  AND time < ?
ORDER BY TIME DESC;


SELECT C.id, count(CM.chat_id) AS count FROM Chats C JOIN ChatMembers CM ON C.id = CM.chat_id WHERE CM.user_id = ?
INTERSECT
SELECT C2.id, count(CM2.chat_id) AS count FROM Chats C2 JOIN ChatMembers CM2 ON C2.id = CM2.chat_id WHERE CM2.user_id = ?
;

SELECT chat_id, count(chat_id) AS count
FROM ChatMembers
WHERE chat_id IN (SELECT CM.chat_id
                  FROM ChatMembers CM
                  WHERE CM.user_id = ?
                  INTERSECT
                  SELECT CM2.chat_id
                  FROM ChatMembers CM2
                  WHERE CM2.user_id = ?)
GROUP BY chat_id
;

SELECT * FROM Chats C JOIN ChatMembers CM ON C.id = CM.chat_id WHERE chat_id = ?
;

INSERT INTO ChatMembers (chat_id, user_id)  VALUES (18, 2)
;

SELECT * FROM Users WHERE id = 2