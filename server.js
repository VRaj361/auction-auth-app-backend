require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require("./models/User");
const Inquiry = require("./models/Inquiry");
const InquiryStatus = require("./models/InquiryStatus");

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(
  process.env.MONGOURL + 'dashboardAuth',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

app.post("/api/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "User already exists" });
    const user = await User.create({ firstName, lastName, email, password });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: "Signup failed" });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) res.json({ success: true, user });
  else res.json({ success: false, message: "Invalid credentials" });
});

app.get("/api/inquiries", async (req, res) => {
  // await new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve('Done after 2 seconds');
  //   }, 2000);
  // });
  const inquiries = await Inquiry.find();
  res.json(inquiries);
});

app.get("/api/inquiries/:id", async (req, res) => {
  // await new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve('Done after 2 seconds');
  //   }, 20000);
  // });
  const inquiry = await Inquiry.findById(req.params.id);
  res.json(inquiry);
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.json({ success: false, message: "Update failed" });
  }
});

app.post("/api/inquiry-status", async (req, res) => {
  try {
    const existing = await InquiryStatus.findOne({
      userId: req.body.userId,
      inquiryId: req.body.inquiryId,
    });
    if (existing) {
      existing.status = req.body.status;
      await existing.save();
      return res.json({ success: true, data: existing });
    }
    const savedStatus = await InquiryStatus.create(req.body);
    res.json({ success: true, data: savedStatus });
  } catch (error) {
    res.json({ success: false, message: "Failed to save status" });
  }
});

app.get("/api/inquiry-status", async (req, res) => {
  try {
    // await new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve('Done after 2 seconds');
    //   }, 4000);
    // });
    const { userId, inquiryId } = req.query;
    const status = await InquiryStatus.findOne({ userId, inquiryId });
    if (status) {
      res.json({ success: true, status: status.status });
    } else {
      res.json({ success: true, status: null });
    }
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch status" });
  }
});

app.get("/api/inquiry-status/all", async (req, res) => {
  const { userId } = req.query;

  try {
    const statuses = await InquiryStatus.find({ userId });

    const detailedStatuses = await Promise.all(
      statuses.map(async (status) => {
        const inquiry = await Inquiry.findById(status.inquiryId);
        return {
          ...status._doc,
          title: inquiry ? inquiry.title : "Untitled Inquiry",
        };
      })
    );

    res.status(200).json({ success: true, orders: detailedStatuses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});
app.listen(8000, () => console.log("Server running on http://localhost:8000"));
