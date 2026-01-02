// seedServicePrices.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import ServicePrice from "./models/ServicePrice.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const services = [
    { key: "gp_consultation", title: "GP Consultation", price: "€49" },
    { key: "online_prescription", title: "Online Prescriptions", price: "€30" },
    { key: "sick_certificates", title: "Sick Certificates", price: "€25" },
    { key: "womens_health", title: "Women’s Health Services", price: "€59" },
    { key: "dermatology", title: "Dermatology", price: "€55" },
    { key: "mental_health", title: "Mental Health Support", price: "€65" },
  ];

  for (let s of services) {
    await ServicePrice.findOneAndUpdate({ key: s.key }, s, { upsert: true });
  }

  console.log("✅ Service prices seeded!");
  mongoose.connection.close();
});
