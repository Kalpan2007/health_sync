import User from '../models/UserSchema.js';
import Doctor from '../models/DoctorSchema.js';
import Booking from '../models/BookingSchema.js';
import Stripe from 'stripe';

export const getCheckoutSession = async (req, res) => {
  try {
    // GET CURRENTLY BOOKED DOCTOR
    const doctor = await Doctor.findById(req.params.doctorId);
    const user = await User.findById(req.user.id);

    if (!doctor || !user) {
      return res.status(404).json({ success: false, message: "Doctor or user not found" });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log("🔑 Stripe Key:", process.env.STRIPE_SECRET_KEY);

    // CREATE STRIPE CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.CLIENT_SITE_URL}/checkout-success`,
      cancel_url: `${req.protocol}://${req.get('host')}/doctors/${doctor.id}`,
      customer_email: user.email,
      client_reference_id: req.params.doctorId,
      line_items: [
        {
          price_data: {
            currency: 'usd', // Use a supported currency
            unit_amount: doctor.ticketPrice * 100,
            product_data: {
              name: doctor.name,
              description: doctor.bio,
              images: [doctor.photo],
            },
          },
          quantity: 1,
        },
      ],
    });

    // CREATE NEW BOOKING
    const booking = new Booking({
      doctor: doctor._id,
      user: user._id,
      ticketPrice: doctor.ticketPrice,
      session: session.id,
    });

    await booking.save();

    res.status(200).json({ success: true, message: "Successfully paid", session });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    res.status(500).json({ success: false, message: "Error creating checkout session", error: err.message });
  }
};

