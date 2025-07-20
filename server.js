require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require("./models/User");
const Inquiry = require("./models/Inquiry");
const InquiryStatus = require("./models/InquiryStatus");
const Query = require('./models/Query');
const CompanyChangeRequest = require('./models/CompanyChangeRequest');
const turnoverUpload = require('./multerTurnover');
const PurchaseOrder = require('./models/PurchaseOrder');
const PurchaseQuery = require('./models/PurchaseQuery');
const PaymentHistory = require('./models/PaymentHistory');



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

app.post("/api/queries", async (req, res) => {
  try {
    const { userId, title, description } = req.body;
    if (!userId || !title || !description) {
      return res.json({ success: false, message: "Missing fields." });
    }
    const queryDoc = await Query.create({ userId, title, description });
    res.json({ success: true, query: queryDoc });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to save query." });
  }
});

app.get("/api/queries", async (req, res) => {
  try {
    const { userId } = req.query;
    const q = await Query.find(userId ? { userId } : {}).sort({
      createdAt: -1,
    });
    res.json({ success: true, queries: q });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to fetch queries." });
  }
});

const pickCompanyFields = (src = {}) => ({
  companyName: src.companyName,
  companyAddress: src.companyAddress,
  companyPhone: src.companyPhone,
  companyEmail: src.companyEmail,
  companyGst: src.companyGst,
  companyPan: src.companyPan,
  companyBanker: src.companyBanker,
  companyAccountNo: src.companyAccountNo,
  companyTurnoverPdfUrl: src.companyTurnoverPdfUrl,
});

// ------------------------------------------------------------------
// GET current Vendor profile for user
// ------------------------------------------------------------------
app.get('/api/company-details/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.json({ success: false, message: 'User not found.' });

    const company = pickCompanyFields(user);
    const hasCompanyData = Object.values(company).some((v) => v && v !== '');

    res.json({
      success: true,
      hasCompanyData,
      company,
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

// ------------------------------------------------------------------
// POST create initial Vendor profile (if none exist)
// Expect JSON body; no file upload yet (turnoverPdfUrl optional URL)
// ------------------------------------------------------------------
app.post('/api/company-details/:userId', turnoverUpload.single('turnoverPdf'), async (req, res) => {
  try {
    const {
      companyName,
      address,
      phone,
      gstNumber ,
      panNumber,
      banker,
      accountNo 
    } = req.body;

    let filePath = null;
    if (req.file) {
      filePath = `/uploads/turnover/${req.file.filename}`;
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.json({ success: false, message: 'User not found.' });

    // If company name already exists, prevent accidental overwrite
    if (user.companyName) {
      return res.json({
        success: false,
        message: 'Vendor profile already exist. Submit a change request instead.',
      });
    }

    user.companyName = companyName;
    user.companyAddress = address;
    user.companyPhone = phone;
    user.companyGst = gstNumber;
    user.companyPan = panNumber;
    user.companyBanker = banker;
    user.companyAccountNo = accountNo;
    user.companyTurnoverPdfUrl = filePath;
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

// ------------------------------------------------------------------
// POST submit change request (multipart/form-data)
// Fields in body + optional PDF file (field name: turnoverPdf)
// ------------------------------------------------------------------
app.post('/api/company-details/request/:userId',
  turnoverUpload.single('turnoverPdf'),
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);
      if (!user) return res.json({ success: false, message: 'User not found.' });

      const {
        companyName,
        address,
        phone,
        gstNumber ,
        panNumber,
        banker,
        accountNo,
        turnoverFile,
      } = req.body;

      // Build request doc
      const reqDoc = new CompanyChangeRequest({
        userId,
        companyName,
        companyAddress: address,
        companyPhone: phone,
        companyGst: gstNumber,
        companyPan: panNumber,
        companyBanker: banker,
        companyAccountNo: accountNo,
      });

      // If file uploaded, store public relative URL (served from /uploads)
      if (req.file) {
        // Example served path: /uploads/turnover/<filename>
        reqDoc.companyTurnoverPdfUrl = `/uploads/turnover/${req.file.filename}`;
      }

      await reqDoc.save();
      res.json({ success: true, request: reqDoc });
    } catch (err) {
      console.error(err);
      res.json({ success: false, message: err.message || 'Server error creating request.' });
    }
  }
);

// ------------------------------------------------------------------
// Admin Approve Change Request
// Copies values into User + marks request approved
// ------------------------------------------------------------------
app.patch('/api/company-details/request/:requestId/approve', async (req, res) => {
  try {
    const reqDoc = await CompanyChangeRequest.findById(req.params.requestId);
    if (!reqDoc) return res.json({ success: false, message: 'Request not found.' });
    if (reqDoc.status !== 'pending') {
      return res.json({ success: false, message: 'Request already processed.' });
    }

    const user = await User.findById(reqDoc.userId);
    if (!user) return res.json({ success: false, message: 'User not found.' });

    // Copy fields
    const fields = pickCompanyFields(reqDoc);
    Object.entries(fields).forEach(([k, v]) => {
      if (typeof v !== 'undefined') user[k] = v;
    });
    await user.save();

    reqDoc.status = 'approved';
    reqDoc.reviewedAt = new Date();
    await reqDoc.save();

    res.json({ success: true, user, request: reqDoc });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

// ------------------------------------------------------------------
// Admin Reject Change Request
// Optionally accept adminComment in body
// ------------------------------------------------------------------
app.patch('/api/company-details/request/:requestId/reject', async (req, res) => {
  try {
    const reqDoc = await CompanyChangeRequest.findById(req.params.requestId);
    if (!reqDoc) return res.json({ success: false, message: 'Request not found.' });
    if (reqDoc.status !== 'pending') {
      return res.json({ success: false, message: 'Request already processed.' });
    }

    reqDoc.status = 'rejected';
    reqDoc.adminComment = req.body?.adminComment;
    reqDoc.reviewedAt = new Date();
    await reqDoc.save();

    res.json({ success: true, request: reqDoc });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

// ------------------------------------------------------------------
// (Optional) GET all requests for a user (history)
// ------------------------------------------------------------------
app.get('/api/company-details/requests/:userId', async (req, res) => {
  try {
    const docs = await CompanyChangeRequest.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, requests: docs });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

// ------------------------------------------------------------------
// CREATE Purchase Order (admin / seed use)
// Body: { purchaseNumber, title, description, status? }
// ------------------------------------------------------------------
app.post('/api/purchase-orders', async (req, res) => {
  try {
    const { purchaseNumber, title, description, status } = req.body;
    if (!purchaseNumber || !title) {
      return res.json({ success: false, message: 'purchaseNumber & title required.' });
    }

    const po = await PurchaseOrder.create({
      purchaseNumber,
      title,
      description,
      status,
    });

    res.json({ success: true, purchaseOrder: po });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to create purchase order.' });
  }
});

// ------------------------------------------------------------------
// GET All Purchase Orders (optional filter by userId in future)
// ------------------------------------------------------------------
app.get('/api/purchase-orders', async (req, res) => {
  try {
    // const { userId } = req.query; // for future scoping
    const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, purchaseOrders: pos });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to fetch purchase orders.' });
  }
});

// ------------------------------------------------------------------
// GET One Purchase Order by id
// ------------------------------------------------------------------
app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.json({ success: false, message: 'Purchase order not found.' });
    res.json({ success: true, purchaseOrder: po });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to fetch purchase order.' });
  }
});

app.post('/api/purchaseQueries', async (req, res) => {
  try {
    const { purchaseOrderId, title, description, type } = req.body;
    if (!purchaseOrderId || !title || !description) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    const query = await PurchaseQuery.create({
      purchaseOrderId,
      title,
      description,
      type: type || 'general'
    });

    res.json({ success: true, query });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to create query' });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { userId, purchaseOrderId, qtyNumber, amount } = req.body;
    if (!purchaseOrderId || qtyNumber == null || amount == null) {
      return res.json({ success: false, message: 'Missing required fields' });
    }
    const payment = await PaymentHistory.create({
      userId,
      purchaseOrderId,
      qtyNumber,
      amount,
    });
    res.json({ success: true, payment });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to save payment' });
  }
});

// Get history
app.get('/api/payments/history', async (req, res) => {
  try {
    const { purchaseOrderId, userId } = req.query;
    if (!purchaseOrderId) {
      return res.json({ success: false, message: 'purchaseOrderId required' });
    }
    const filter = { purchaseOrderId };
    if (userId) filter.userId = userId;
    const history = await PaymentHistory.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to load payment history' });
  }
});


app.listen(8000, () => console.log("Server running on http://localhost:8000"));
