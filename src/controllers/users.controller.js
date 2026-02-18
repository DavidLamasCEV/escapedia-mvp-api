const User = require("../models/user");

exports.getOwners = async (req, res) => {
  try {
    const owners = await User.find({ role: "owner" })
      .select("_id name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ ok: true, owners });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo owners"
    });
  }
};
