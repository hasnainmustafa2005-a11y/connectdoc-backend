import nodemailer from "nodemailer";

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or Outlook, etc.
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS, // app password
      },
    });

    const mailOptions = {
      from: `"ConnectDoc" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Your Login OTP (Valid for 2 Minutes)",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Login Verification</h2>
          <p>Your OTP is:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>This OTP will expire in <b>2 minutes</b>.</p>
          <p>If you didn’t request this, ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 OTP email sent to", toEmail);
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

export default sendOtpEmail;
