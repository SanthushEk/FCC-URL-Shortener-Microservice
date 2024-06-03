require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
let mongoose = require("mongoose");
const { URL } = require("url"); // Correcting URL module import
const dns = require("dns"); // Correcting dns module import

/* Connect to the database */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}); // Correcting connection options

// Basic Configuration
const port = process.env.PORT || 3000;

const URLSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: String, required: true, unique: true },
});

let URLModel = mongoose.model("URL", URLSchema);

// Middleware function to parse post request
app.use(express.urlencoded({ extended: false })); // Correcting body parsing middleware

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get('/api/shorturl/:short_url', function (req, res) {
  let short_url = req.params.short_url;
  URLModel.findOne({ short_url: short_url }).then((foundedURL) => {
    if (foundedURL) {
      let original_url = foundedURL.original_url;
      res.redirect(original_url);
    }
    else {
      res.json({ message: "No short URL found for the given input" });
    }
  });

});

// Your first API endpoint
app.post("/api/shorturl", function (req, res) {
  let url = req.body.url;
  // Validate the url
  try {
    let urlObj = new URL(url);
    dns.lookup(urlObj.hostname, (error, address, family) => {
      if (!address) {
        res.json({ error: "invalid url" });
      } else {
        // Check if the url is already in the database
        URLModel.findOne({ original_url: urlObj.href }).then(
          (foundURL) => {
            if (foundURL) {
              res.json({
                original_url: foundURL.original_url,
                short_url: foundURL.short_url,
              });
            }

            else {
              let original_url = urlObj.href;
              //Get the latest short url
              URLModel.find({}).sort({ short_url: "desc" }).limit(1).then(
                (latestURL) => {
                  if (latestURL.length > 0) {
                    let short_url = parseInt(latestURL[0].short_url) + 1;
                    let resObj = { original_url: original_url, short_url: short_url };
                    let newURL = new URLModel(resObj);
                    newURL.save().then(() => {
                      res.json(resObj);
                    });
                  } else {
                    // If no previous URLs exist, start with 1
                    let resObj = { original_url: original_url, short_url: 1 };
                    let newURL = new URLModel(resObj);
                    newURL.save().then(() => {
                      res.json(resObj);
                    });
                  }
                }
              ).catch(err => {
                console.error("Error fetching latest URL:", err);
                res.status(500).json({ error: "Internal Server Error" });
              });
            }
          }
        );
      }
    });
  } catch (err) {
    // If Url is not valid
    res.json({ error: "Invalid url" });
  }
});


app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
