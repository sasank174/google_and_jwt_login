const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require('axios');

const app = express();

const CLIENT_ID = '662128229591-2pk9kkukes5frh3hbhasqo5sf32qm3a3.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/home';

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.json());

mongoose.connect("mongodb+srv://manam:manam@cluster0.i6dfw.mongodb.net/madhurai"
).then(() => {
    console.log(`connection to database established`)
}).catch(err => {
    console.log(`db error ${err.message}`);
    process.exit(-1)
});

const userSchema = {
    email: String,
    password: String
};

const User = new mongoose.model("User", userSchema);


// **********************************************************************************************************************
var information = "";
var information2 = "";
var token;

app.get("/", function (req, res) {
    res.render("login", {
        information: information
    });
});

app.get("/home", async function (req, res) {
    const { code } = req.query;
    
    try {
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const { access_token} = data;

        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
        });
        information2 = profile.email;

        res.redirect("/main")
    } catch (error) {
        console.error('Error:', error.response.data.error);
        information = "error with google sign in";
        res.redirect("/")
    }
});

app.get("/main", function (req, res) {
    res.render("home", {
        information2: information2
    });
});


app.get("/register", function (req, res) {
    res.render("register");
});

//  google sign in
app.get('/auth/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
    information2 = 'google test';
    res.redirect(url);
});

app.get('/testurl',(req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        res.status(200)
            .json(
                {
                    success: false,
                    message: "Error!Token was not provided."
                }
            );
    }

    const decodedToken = jwt.verify(token, "secret");
    res.status(200).json(
        {
            success: true,
            data: {
                userId: decodedToken.userId,
                email: decodedToken.email
            }
        }
    );
});

// **********************************************************************************************************************


app.post("/register", function (req, res) {
    var email = req.body.email;
    var password = req.body.password;

    User.findOne({ email: email })
    .then(foundUser => {
        if (foundUser) {
            // User already exists
            information = "User already exists";
            return res.redirect("/");
        } else {
            // Creating new user
            const newUser = new User({
                email: email,
                password: password
            });
            information = "User registered";
            newUser.save();

            
            try {
                token = jwt.sign(
                    {
                        userId: newUser.id,
                        email: newUser.email
                    },
                    "secret",
                    { expiresIn: "1h" }
                );
            } catch (err) {
                console.log(err);
                const error =
                    new Error("Error! Something went wrong.");
                return next(error);
            }

            console.log(token);

            // User successfully registered
            // res
            // .status(201)
            // .json({
            //     success: true,
            //     data: {
            //         userId: newUser.id,
            //         email: newUser.email,
            //         token: token
            //     },
            // });
            return res.redirect("/");
        }  
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    })
});

app.post("/login", function (req, res) {
    var email = req.body.email;
    var password = req.body.password;

    console.log(email);
    console.log(password);

    User.findOne({ email: email })
    .then(foundUser => {
        if (!foundUser) {
            // User not registered
            information = "User not exists";
            return res.redirect("/");
        }
        
        // User found checking password
        if (foundUser.password === password) {
            information2 = "User logged in sucessfully";
            // creating JWT token

            try {
                token = jwt.sign(
                    {
                        userId: foundUser.id,
                        email: foundUser.email
                    },
                    "secret",
                    { expiresIn: "1h" }
                );

            //  uncomment below code for testing jwt token
            // on making post request following details will be displayed

            //     res
            // .status(200)
            // .json({
            //     success: true,
            //     data: {
            //         userId: foundUser.id,
            //         email: foundUser.email,
            //         token: token,
            //     },
            // });

            // make a get request to http://localhost:3000/testurl to validate token

                return res.redirect("/main");
            } catch (err) {
                console.log(err);
                const error =
                    new Error("Error! Something went wrong.");
                    information = "error";
                    return res.redirect("/");
            }

            
            // return res.redirect("/main");
        } else {
            // Incorrect password
            information = "Incorrect password";
            return res.redirect("/");
        }
    })
    .catch(err => {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    });

});

app.listen(process.env.PORT || 3000, function () {
    console.log("Server started on port 3000.");
});