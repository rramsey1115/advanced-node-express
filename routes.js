// const session = require("express-session");
const passport = require("passport");
const { ObjectId } = require("mongodb");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcryptjs");

// create get route for "/chat" and redirect to "/pug/chat"

module.exports = function (app, myDataBase) {
  // Home page route*
  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to myPugDataBase",
      message: "Please login",
      showLogin: true,
      showRegistration: true,
    });
    // Implement Social Auth
  });

  // User Login*
  app.route("/login").post(
    passport.authenticate("local", {
      failureRedirect: "/",
    }),
    (req, res) => {
      res.redirect("/chat");
    }
  );
  // ** Create New middleware **
  const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/");
  };

  app.route("/chat").get(ensureAuthenticated, (req, res) => {
    res.render("chat", { username: req.user });
  });

  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", { username: req.user.username });
  });
  //logging a User out*
  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });

  // Registration of New Users*
  app.route("/register").post(
    (req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne(
        { username: req.body.username },

        (err, user) => {
          if (err) {
            next(err);
          } else if (user) {
            res.redirect("/");
          } else {
            myDataBase.insertOne(
              {
                username: req.body.username,
                password: hash,
              },
              (err, doc) => {
                if (err) {
                  res.redirect("/");
                } else {
                  // The inserted doc is held within the ops prop*
                  next(null, doc.ops[0]);
                }
              }
            );
          }
        }
      );
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res, next) => {
      res.redirect("/chat");
    }
  );

  app.use((req, res, next) => {
    res.status(404).type("text").send("404 err = Not Found");
  });
};
