const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // ✅ Added input validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please fill all the details" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User Already Exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: "User Created Successfully",
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "User registration failed" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please fill all the details" });
        }

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(403).json({ success: false, message: "Incorrect password" });
        }

        const payload = { email: user.email, id: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" });

        // ✅ Safely strip password
        const { password: _, ...safeUser } = user.toObject();

        // ✅ Cookie options based on environment
        const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
        };

        return res.cookie("token", token, options).status(200).json({
            success: true,
            token,
            user: safeUser,
            message: "User logged in successfully"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Login failed" });
    }
};

// ✅ Kept here but will be removed in routes fix step
exports.logout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
        });
        return res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Logout failed" });
    }
};