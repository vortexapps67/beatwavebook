// The Story of BeatWave - Client Configuration
// Connects to your live Supabase Project

const supabaseConfig = {
  supabaseUrl: "https://ckjsrurruaxcveoxpzws.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNranNydXJydWF4Y3Zlb3hwendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTM2NzcsImV4cCI6MjEwNDE2OTY3N30.uUcbTmFTVJusweOVyUtjjwZo5KMoqvBQtqqOGZzmx6M"
};

// Global Payment & Pricing Configuration
const paymentConfig = {
  upiId: "akshanshsinha67@axl",
  merchantName: "Vortex Apps (BeatWave)",
  qrImage: "upi qr aarav.jpg",
  tiers: {
    ebook: {
      id: "ebook",
      name: "Digital E-Book Edition",
      price: 150,
      formattedPrice: "₹150",
      description: "Full unabridged PDF + EPUB edition with architecture blueprints and interactive code. Delivered upon verification."
    },
    print: {
      id: "print",
      name: "Collector's Printed Copy",
      price: 250,
      deliveryCharge: 40,
      formattedPrice: "₹250 + delivery",
      description: "Collector's softcover paperback on premium book stock, free companion e-book included, delivered to your doorstep."
    }
  }
};
