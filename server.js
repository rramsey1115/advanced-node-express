"use strict";
require("dotenv").config();
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const session = require("express-session");
const passport = require("passport");

const routes = require("./routes.js");
const auth = require("./auth.js");
const cookieParser = require("cookie-parser");
const passportSocketIo = require("passport.socketio");

const MongoStore = require("connect-mongo")(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.set("view engine", "pug");
app.set("views", "./views/pug");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Set to false unless your app needs to resave sessions
    saveUninitialized: false, // Set to false to prevent saving uninitialized sessions
    key: "express.sid",
    store: store,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); //For FCC testing purposes**
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Authentication with Socket.IO
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(
  wrap(
    session({
      cookieParser: cookieParser,
      key: "express.sid",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: store,
      cookie: { secure: false }, // Adjust as needed for production
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail,
    })
  )
);
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));
// io.use(
//   passportSocketIo.authorize({
//     cookieParser: cookieParser,
//     key: "express.sid",
//     secret: process.env.SESSION_SECRET,
//     store: store,
//     success: onAuthorizeSuccess,
//     fail: onAuthorizeFail,
//   })
// );

myDB(async (client) => {
  const myDataBase = await client.db("myPugDataBase").collection("users");

  routes(app, myDataBase);
  auth(app, myDataBase);

  let currentUsers = 0;
  io.on("connection", (socket) => {
    ++currentUsers;
    io.emit("user", {
      user: socket.request.user,
      currentUsers,
      connected: true,
    });
    socket.on("chat message", (message) => {
      io.emit("chat message", { username: socket.request.user, message });
    });

    socket.on("user count", function (data) {
      console.log(data);
    });
    console.log("A user has connected");
    socket.on("disconnect", () => {
      console.log("A user has disconnected");
      --currentUsers;
      io.emit("user", {
        user: socket.request.user,
        currentUsers,
        connected: false,
      });
    });
  });
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", {
      title: e,
      message: "Unable to connect to database",
    });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log("successful connection to socket.io");

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log("failed connection to socket.io:", message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
