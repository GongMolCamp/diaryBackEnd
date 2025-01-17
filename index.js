const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const { normalize } = require("path");
const jwt = require("jsonwebtoken");
const socketIO = require("socket.io")(http, {
  cors: {
    //허용할 도메인 설정
  },
});

const PORT = normalize(process.env.PORT || '80');

function createUniqueId() {
  return Math.random().toString(20).substring(2, 10);
}

let chatgroups = [];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

async function queryChatRoom(userId) {
    // query group_id from user_table by userId

    // return format
    // json
    /*
    {
        couple_img,
        couple_user_name,
        group_id,
        message_date,
        message_write_id,
        message_text,
        message_read
    }
    */
}

const JWT_SECRET = "diary app key for jwt";

// Middleware to authenticate the token
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    if (!token) throw new Error("Token not provided");
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user; // 사용자 정보 저장
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
};

// 사용자와 방 관리 객체
const rooms = {}; // { roomName: [usernames...] }

socketIO.use(authenticateSocket); // JWT 인증 적용

socketIO.on("connection", (socket) => {
  console.log(`${socket.id} user is just connected`);

  socket.on("getGroup", (userId) => {
    const username = socket.user.username;
    console.log(userId);
    //socket.emit("sendGroup", queryChatRoom(userId));
    socket.emit("sendGroup", {
      couple_img : '',
      couple_user_name : 'gf',
      group_id : 'testgroup',
      message_date : '2025-01-01',
      message_write_id : username,
      message_text : '안녕',
      message_read : false,
    });
  });

  // Join Room
  socket.on("joinRoom", (roomName) => {
    const username = socket.user.username;

    // 방에 추가
    if (!rooms[roomName]) rooms[roomName] = [];
    rooms[roomName].push(username);

    socket.join(roomName);
    console.log(`${username} joined room: ${roomName}`);
  });

  socket.on("newChatMessage", (data) => {
    const { currentChatMesage, groupIdentifier, currentUser, timeData } = data;
    const filteredGroup = chatgroups.filter(
      (item) => item.id === groupIdentifier
    );
    const newMessage = {
      id: createUniqueId(),
      text: currentChatMesage,
      currentUser,
      time: `${timeData.hr}:${timeData.mins}`,
    };

    socket
      .to(filteredGroup[0].currentGroupName)
      .emit("groupMessage", newMessage);
    filteredGroup[0].messages.push(newMessage);
    socket.emit("groupList", chatgroups);
    socket.emit("foundGroup", filteredGroup[0].messages);
  });
});



app.get("/", (req, res) => {
  res.json(chatgroups);
});

// 로그인 엔드포인트
app.post("/login", (req, res) => {
  const { username, password, groupid } = req.body;

  // 가짜 사용자 인증 (데모용)
  if (username === "test" && password === "password") {
    // 사용자 정보
    const user = { id: 1, groupid };

    // JWT 생성
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });

    return res.json({ success: true, token });
  }

  // 인증 실패
  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

http.listen(PORT, () => {
  console.log(`Server is listeing on ${PORT}`);
});