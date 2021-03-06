const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db_config");
const session = require("express-session");
const redis = require("ioredis");
const redisClient = redis.createClient(process.env.REDIS_URL);
const redisStore = require("connect-redis")(session);

const port = process.env.PORT || 9000;

redisClient.on("error", (err) => {
  console.log("Redis error: ", err);
});
app.set("trust proxy", 1);
const corsOptions = {
  origin: "https://jimmyganci.github.io",
  credentials: true, // access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json()).use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "12345",
    saveUninitialized: false,
    resave: false,
    // unset: "destroy",
    httpOnly: false,
    cookie: {
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
    },
    store: new redisStore({ client: redisClient }),
  })
);

app.post("/login", (req, res) => {
  const sess = req.session;
  //   req.session.save();
  sess.user = req.body;
  res.json(req.session.user);
  res.end("done");
});

app.get("/login", (req, res) => {
  res.json(req.session.user);
});

app.delete("/logout", function (req, res) {
  if (req.session) {
    req.session.destroy(function () {
      res.clearCookie("connect.sid", { path: "/" });
      res.status(200).send("removed session");
    });
  } else {
    res.status(400).send("no session assigned");
  }
});

app.get("/api/score", (req, res) => {
  let sql = `select * from member`;
  const sqlValues = [];
  console.log(req.query.game_type);
  if (req.query.game_type) {
    sql += " WHERE game_type = ?";
    sqlValues.push(req.query.game_type);
  }
  if (req.query.game && !req.query.region && !req.query.score) {
    // filtre juste les challenge
    sql += " WHERE game = ?";
    sqlValues.push(req.query.game);
  }
  if (req.query.region && !req.query.game && !req.query.score) {
    // filtre juste les continents
    sql += " WHERE region = ?";
    sqlValues.push(req.query.region);
  }
  if (req.query.score && !req.query.region && !req.query.game) {
    // filtre juste sur les scores
    sql += ` ORDER BY score ${req.query.score}`;
  }
  if (req.query.game && req.query.region && !req.query.score) {
    // filtre sur les challenges et les continents
    sql += ` WHERE game = ? AND region = ?`;
    sqlValues.push(req.query.game, req.query.region);
  }
  if (!req.query.game && req.query.region && req.query.score) {
    // filtre sur les continents et sur le score
    sql += ` WHERE region = ? ORDER BY score ${req.query.score}`;
    sqlValues.push(req.query.region);
  }
  if (req.query.game && !req.query.region && req.query.score) {
    // filtre sur les challenges et le score
    sql += ` WHERE game = ? ORDER BY score ${req.query.score}`;
    sqlValues.push(req.query.game);
  }
  if (req.query.game && req.query.region && req.query.score) {
    // filtre sur les continents, challenge et score
    sql += ` WHERE game = ? AND region = ? ORDER BY score ${req.query.score}`;
    sqlValues.push(req.query.game, req.query.region);
  }

  if (req.query.pseudo) {
    sql += ` WHERE pseudo LIKE '%${req.query.pseudo}%'`;
  }

  connection.query(sql, sqlValues, (err, result) => {
    if (err) {
      res.status(500).send("Error retrieving data from database");
    } else {
      res.status(200).json(result);
    }
  });
});

app.post("/api/score", function (req, res) {
  // Get sent data.
  const { pseudo, idUser, score, game, region, gameType } = req.body;
  // Do a MySQL query.
  connection.query(
    `INSERT INTO member (pseudo, idUser, score, game, region, game_type) VALUES ('${pseudo}', '${idUser}', '${score}', '${game}', '${region}', '${gameType}')`
  );
  res.end("Success");
});

app.get("/api/score/:id", (req, res) => {
  const idUser = req.params.id;
  console.log(req.params.id);
  connection.query(
    "SELECT * FROM member WHERE idUser = ?",
    [idUser],
    (err, result) => {
      if (err) {
        res.status(500).send("Error retrieving data from database");
      } else {
        res.status(200).json(result);
      }
    }
  );
});

app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;
  connection.query("SELECT * FROM usersdata where id=?", [id], (err) => {
    if (err) {
      res.status(500).send("Error retrieving data from database");
    } else {
      res.status(404).send("user not found");
    }
  });
});

app.get("/api/users/", (req, res) => {
  let sql = "select * from usersdata";
  const sqlValues = [];

  if (req.query.pseudo && !req.query.mail) {
    // filtre juste les pseudos
    sql += " WHERE pseudo = ?";
    sqlValues.push(req.query.pseudo);
  }
  if (req.query.mail && !req.query.pseudo) {
    // filtre juste les mail
    sql += " WHERE mail = ?";
    sqlValues.push(req.query.mail);
  }
  if (req.query.pseudo && req.query.mail) {
    // filtre sur les pseudo et les mails
    sql += ` WHERE pseudo = ? OR mail = ? `;
    sqlValues.push(req.query.pseudo, req.query.mail);
  }
  connection.query(sql, sqlValues, (err, result) => {
    if (err) {
      res.status(500).send("Error retrieving data from database");
    } else {
      res.status(200).json(result);
    }
  });
});

app.post("/api/users", (req, res) => {
  const { pseudo, mail, password } = req.body;
  connection.query(
    `INSERT INTO usersdata (pseudo, mail, password) VALUES (?, ? ,?)`,
    [pseudo, mail, password],
    (err) => {
      if (err) {
        res.status(500).send("Error saving the movie");
      } else {
        const posted = { pseudo, mail, password };
        res.status(201).json(posted);
      }
    }
  );
});

app.put("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  connection.query(
    "SELECT * FROM usersdata WHERE id = ?",
    [userId],
    (err, selectUser) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error");
      } else {
        const userFromDb = selectUser[0];
        if (userFromDb) {
          const userToUpdate = req.body;
          connection.query(
            "UPDATE usersdata SET ? WHERE id = ?",
            [userToUpdate, userId],
            (error) => {
              if (error) {
                console.log(error);
                res.status(500).send("Error updating a user");
              } else {
                const updated = { ...userFromDb, ...userToUpdate };
                res.status(200).json(updated);
              }
            }
          );
        } else {
          res.status(404).send(`Heroes with id ${userId} not found.`);
        }
      }
    }
  );
});

app.listen(port, () => {
  console.log(`App server now listening to port ${port}`);
});
