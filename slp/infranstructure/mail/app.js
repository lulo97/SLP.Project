import express from "express";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config()

const app = express();
const resend = new Resend(process.env.MAIL_RESEND_KEY);

app.use(express.json());

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields: to, subject, html" });
    }

    const data = await resend.emails.send({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.MAIL_PORT;
app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});