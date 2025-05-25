const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const { normalize } = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require('dotenv').config(); // .env 파일 로드

const { group } = require("console");
const db = require('./controllers/db_pool.js');
const admin = require('firebase-admin');
const cron = require('node-cron');
const authenticateJWT = require('./auth/authenticate.js'); // JWT 인증 미들웨어
const JWT_SECRET = process.env.JWT_SECRET;

// Firebase Admin SDK 초기화
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),  // \n 처리
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: 'https://accounts.google.com/o/oauth2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
  clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 라우터 설정
const loginRouter = require('./routes/login');
const mypageRouter = require('./routes/mypage');
const diaryRouter = require('./routes/diary');
const homeRouter = require('./routes/home');
const detialRouter = require('./routes/detail');

app.use('/login', loginRouter);
app.use('/mypage', mypageRouter);
app.use('/diary', diaryRouter);
app.use('/home', homeRouter);
app.use('/detail', detialRouter);

// Notification 함수
async function sendNotification(token, title, body) {
  const message = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'default',
          badge: 1,
          'mutable-content': 1,
          'content-available': 1,
        },
      },
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': '10',
      },
    },
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
}

// 매일 특정 시간에 알림 보내기 (예: 매일 11:43 AM)
cron.schedule('43 11 * * *', async () => {
  try {
    const [users] = await db.query('SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL');
    for (const user of users) {
      if (user.fcm_token) {
        await sendNotification(
          user.fcm_token,
          '일기 작성 시간입니다 ! 📝',
          '오늘 하루는 어떠셨나요? 소중한 추억을 기록해보세요.'
        );
      }
    }
  } catch (error) {
    console.error('Error sending daily notifications:', error);
  }
}, { timezone: "Asia/Seoul" });

// Socket.io 연결 및 채팅 기능
const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
  },
});

socketIO.use(authenticateJWT); // JWT 인증 적용

socketIO.on("connection", (socket) => {
  console.log(`${socket.user.id} user is just connected`);

  socket.on("new message", async (data, group_id, username) => {
    const uid = socket.user.id;
    const roomSize = socketIO.sockets.adapter.rooms.get(group_id)?.size || 0;

    if (roomSize < 2) {
      const group = chats.groups.find(g => g.group_id === group_id);

      if (group) {
        group.messages.push(data);
      } else {
        chats.groups.push({ group_id: group_id, messages: [] });
      }

      try {
        const sql = 'SELECT fcm_token FROM DiaryDB.users WHERE fcm_token IS NOT NULL AND coupleName = ?';
        const [users] = await db.query(sql, [username]);

        for (const user of users) {
          if (user.fcm_token) {
            await sendNotification(
              user.fcm_token,
              '채팅 알림',
              data['text']
            );
          }
        }
      } catch (error) {
        console.error('Error sending daily notifications:', error);
      }
    } else {
      socket.to(group_id).emit("new msg arrive", data, uid);
    }
  });
});

// Express 서버 설정
const PORT = process.env.PORT || 80;

http.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});
