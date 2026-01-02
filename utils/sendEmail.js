import nodemailer from "nodemailer";

export async function sendEmailWithPDF(toEmail, pdfBase64, pdfFileName) {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or another SMTP
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const base64content = pdfBase64.includes("base64,")
    ? pdfBase64.split("base64,")[1]
    : pdfBase64;

  const mailOptions = {
    from: `"Health Service" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your Consultation Form (${pdfFileName})`,
    text: "Dear patient,\n\nPlease find your consultation form attached.\n\nRegards.",
    attachments: [
      {
        filename: pdfFileName,
        content: base64content,
        encoding: "base64"
      }
    ]
  };

  return transporter.sendMail(mailOptions);
}
