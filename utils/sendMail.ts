require("dotenv").config();
import nodemailer, { Transporter } from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

// Define the EmailOptions interface
interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any }; // Corrected data type
}

// Send mail function
const sendMail = async (options: EmailOptions): Promise<void> => {
  // Create transporter object
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"), // Convert to number if necessary
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Destructure options for easy access
  const { email, subject, template, data } = options;

  // Get the path to the email template file
  const templatePath = path.join(__dirname, '../mails', template);
  // const templatePath = path.join(__dirname, '../mails', `${template}.ejs`);


  // Render the email template with EJS
  const html: string = await ejs.renderFile(templatePath, data);

  // Mail options
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject,
    html,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

// Export the sendMail function
export default sendMail ;
