import AmbulanceBooking from "../models/AmbulanceBookingSchema.js";
import User from "../models/UserSchema.js";
import { sendEmail } from "../utils/sendEmail.js";

export const bookAmbulance = async (req, res) => {
  const { pickupAddress, destination } = req.body;
  const patientId = req.user.id;

  try {
    const booking = new AmbulanceBooking({
      patientId,
      pickupAddress,
      destination,
    });
    await booking.save();

    const drivers = await User.find({ role: "driver" });
    const driverEmails = drivers.map((driver) => driver.email);
    const subject = "New Ambulance Booking Request";
    const message = `A new ambulance booking request has been made.\nPickup: ${pickupAddress}\nDestination: ${destination}\nBooking ID: ${booking._id}`;
    await Promise.all(
      driverEmails.map((email) => sendEmail(email, subject, { text: message }))
    );

    res.status(200).json({ success: true, message: "Ambulance booked, drivers notified", data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to book ambulance" });
  }
};

export const acceptBooking = async (req, res) => {
  const bookingId = req.params.id;
  const driverId = req.user.id;

  try {
    const booking = await AmbulanceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, message: "Booking already assigned or completed" });
    }

    booking.driverId = driverId;
    booking.status = "running";
    await booking.save();

    res.status(200).json({ success: true, message: "Booking accepted", data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to accept booking" });
  }
};

export const updateBookingStatus = async (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;
    const driverId = req.user.id;
  
    try {
      // Validate status value
      if (!["pending", "running", "completed"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
      }
  
      const booking = await AmbulanceBooking.findById(bookingId);
      if (!booking || booking.driverId.toString() !== driverId) {
        return res.status(403).json({ success: false, message: "Unauthorized or booking not found" });
      }
  
      // Update status and save
      booking.status = status;
      const updatedBooking = await booking.save(); // Save returns the updated document
  
      res.status(200).json({ success: true, message: "Status updated", data: updatedBooking });
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ success: false, message: "Failed to update status" });
    }
  };

export const getDriverDashboard = async (req, res) => {
  const driverId = req.user.id;

  try {
    const newRequests = await AmbulanceBooking.find({ status: "pending" });
    const driverBookings = await AmbulanceBooking.find({ driverId });
    res.status(200).json({
      success: true,
      message: "Dashboard data retrieved",
      data: { newRequests, myBookings: driverBookings },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};

export const getBookingStatus = async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  try {
    const booking = await AmbulanceBooking.findById(bookingId);
    if (!booking || booking.patientId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized or booking not found" });
    }
    res.status(200).json({ success: true, message: "Booking status retrieved", data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch booking status" });
  }
};