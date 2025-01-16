const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const { normalize } = require("path");
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

socketIO.on("connection", (socket) => {
  console.log(`${socket.id} user is just connected`);

  socket.on("getGroup", (userId) => {
    socket.emit("sendGroup", queryChatRoom(userId));
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



http.listen(PORT, () => {
  console.log(`Server is listeing on ${PORT}`);
});