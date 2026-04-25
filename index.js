const express = require("express");
const session = require("express-session");

const app = express();

const API_URL = "http://127.0.0.1:5001";

function authHeaders(req) {
  return {
    Authorization: `Bearer ${req.session.token}`,
    Accept: "application/json",
  };
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "change-me-super-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.use((req, res, next) => {
  console.log("Time:", Date.now());
  next();
});

const publicRoutes = ["/login"];

app.use((req, res, next) => {
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  if (!req.session.token) {
    return res.redirect("/login");
  }

  next();
});


const layout_start = ` <!doctype html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <title>Trips</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">`;

const layout_end = `
    </body>
    </html>`;

app.get("/", (req, res) => {
  res.redirect("/trips");
});

app.get("/login", (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <title>Login</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
      <main class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-5">
            <div class="card border-0 shadow-sm rounded-4">
              <div class="card-body p-4">
                <h1 class="h3 mb-4">Login</h1>

                <form method="POST" action="/login">
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input value="test2@text.com" class="form-control" type="email" name="email" required>
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Passwort</label>
                    <input value="test2" class="form-control" type="password" name="password" required>
                  </div>

                  <button class="btn btn-primary w-100 rounded-pill">Login</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </body>
    </html>
  `);
});

app.post("/login", async (req, res) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: req.body.email,
        password: req.body.password,
      }),
    });

    if (!response.ok) {
      return res.status(401).send("Login fehlgeschlagen");
    }

    const data = await response.json();

    req.session.token = data.access_token;

    res.redirect("/trips");
  } catch (error) {
    res.status(500).send("API nicht erreichbar");
  }
});

app.get("/trips", async (req, res) => {
  const response = await fetch(`${API_URL}/api/trips`, {
    headers: authHeaders(req),
  });

  if (!response.ok) {
    return res.redirect("/login");
  }

  const trips = await response.json();

  const cards = trips.map(trip => `
    <div class="col-md-6 col-xl-4">
      <div class="card h-100 border-0 shadow-sm rounded-4">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between gap-3 mb-3">
            <div>
              <h5 class="mb-1">${trip.name}</h5>
              <small class="text-muted">
                ${trip.created_at ? new Date(trip.created_at).toLocaleDateString("de-DE") : ""}
              </small>
            </div>
            <span class="badge rounded-pill text-bg-primary align-self-start">
              ${trip.locations?.length || 0} Locations visited
            </span>
          </div>

          <p class="text-muted">Your visited locations and memories</p>

          <a href="/trips/${trip.id}" class="btn btn-primary btn-sm rounded-pill px-3">
            View
          </a>
        </div>
      </div>
    </div>
  `).join("");

  res.send(`
    ${layout_start}
      <nav class="navbar bg-white border-bottom">
        <div class="container">
          <a class="navbar-brand fw-bold" href="/trips">Travel Memory</a>
          <a class="btn btn-outline-danger btn-sm rounded-pill px-3" href="/logout">Logout</a>
        </div>
      </nav>

      <main class="container py-5">
        <div class="p-4 p-md-5 mb-5 bg-white rounded-4 shadow-sm">
          <h1 class="fw-bold mb-2">Your Trips</h1>
          <p class="text-muted mb-0">Manage your trips, locations and memories.</p>
        </div>

        <div class="row g-4">
          ${cards || `
            <div class="col-12">
              <div class="card border-0 shadow-sm rounded-4">
                <div class="card-body p-5 text-center">
                  <h4>Looks empty here...</h4>
                  <p class="text-muted">Create your first trip memory</p>
                </div>
              </div>
            </div>
          `}
        </div>
      </main>
    ${layout_end}
  `);
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.listen(3000, () => {
  console.log("Node Client läuft auf http://localhost:3000");
});