const User = require("../models/userModel");
const AuditLog = require("../models/auditLogModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "3d" });
};

const logAudit = async (req, action, entityType, entityId, details = {}) => {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: req.user?.fullName || req.user?.email || "System",
      actorRole: req.user?.role || "System",
      action,
      entityType,
      entityId: String(entityId || ""),
      details,
      ipAddress: req.ip || "",
    });
  } catch (error) {
    console.log("Audit log skipped:", error.message);
  }
};

const loginUser = async (req, res) => {
  const { identifier, password } = req.body;

  // Safe logging: do NOT log password contents
  try {
    console.log("Login attempt", {
      identifier: String(identifier || ""),
      hasPassword: !!password,
      ip: req.ip || "",
      userAgent: req.get("user-agent") || "",
    });

    const user = await User.login(identifier, password);
    const method = String(identifier || "").includes("@")
      ? "email"
      : "username";
    await user.recordLogin({
      identifier,
      method,
      success: true,
      ipAddress: req.ip || "",
      userAgent: req.get("user-agent") || "",
    });
    const token = createToken(user._id);

    console.log("Login success", {
      userId: user._id,
      username: user.username,
      method,
    });

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      accountStatus: user.accountStatus,
      mustChangePassword: user.mustChangePassword,
      token,
    });
  } catch (error) {
    // Log full stack for debugging unexpected errors
    console.error("Login error:", error && error.message, error && error.stack);
    // Return a safer message to the client but include original message if present
    const message = error && error.message ? error.message : "Login failed";
    res.status(400).json({ error: message });
  }
};

const signupUser = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can create users" });
  }

  const {
    username,
    email,
    password,
    fullName,
    firstName,
    lastName,
    role,
    department,
    employeeNumber,
    phoneNumber,
    position,
    accountStatus,
    mustChangePassword,
  } = req.body;

  try {
    const user = await User.createUser({
      username,
      email,
      password,
      fullName,
      firstName,
      lastName,
      role,
      department,
      employeeNumber,
      phoneNumber,
      position,
      accountStatus,
      createdBy: req.user._id,
      mustChangePassword,
    });
    await logAudit(req, "CREATE_USER", "User", user._id, {
      username: user.username,
      role: user.role,
    });

    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        employeeNumber: user.employeeNumber,
        phoneNumber: user.phoneNumber,
        position: user.position,
        accountStatus: user.accountStatus,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  return signupUser(req, res);
};

const editUser = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can manage users" });
  }

  try {
    const updates = { ...req.body };
    delete updates.password;
    delete updates.loginHistory;
    delete updates.pin;
    delete updates.roleForced;

    if ((updates.firstName || updates.lastName) && !updates.fullName) {
      const existingUser = await User.findByPk(req.params.id);
      updates.fullName =
        `${updates.firstName || existingUser?.firstName || ""} ${updates.lastName || existingUser?.lastName || ""}`.trim() ||
        existingUser?.fullName;
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.update(updates);

    await logAudit(req, "EDIT_USER", "User", user._id, {
      username: user.username,
      updates: Object.keys(updates),
    });
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  return editUser(req, res);
};

const unlockUser = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can manage users" });
  }

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.accountStatus = "Active";
    user.mustChangePassword = true;
    user.temporaryPasswordAssignedAt = new Date();
    await user.save();

    await logAudit(req, "UNLOCK_USER", "User", user._id, {
      username: user.username,
    });
    res
      .status(200)
      .json({ message: `Account unlocked for ${user.fullName}`, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can manage users" });
  }

  const { status } = req.body;

  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validStatuses = ["Active", "Inactive", "Suspended", "Locked"];
    const normalizedStatus = String(status || "").trim();
    if (!validStatuses.includes(normalizedStatus)) {
      return res
        .status(400)
        .json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    user.accountStatus = normalizedStatus;
    await user.save();

    await logAudit(req, "UPDATE_USER_STATUS", "User", user._id, {
      username: user.username,
      status: normalizedStatus,
    });
    res.status(200).json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can manage users" });
  }

  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "username",
        "email",
        "fullName",
        "firstName",
        "lastName",
        "role",
        "department",
        "employeeNumber",
        "phoneNumber",
        "position",
        "accountStatus",
        "mustChangePassword",
        "createdAt",
        "loginHistory",
      ],
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can manage users" });
  }

  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.destroy();

    await logAudit(req, "DELETE_USER", "User", req.params.id, {
      username: user.username,
      role: user.role,
    });
    res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can reset passwords" });
  }

  const { userId, newPassword, forcePasswordChange = true } = req.body;

  try {
    if (!newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;
    user.mustChangePassword = Boolean(forcePasswordChange);
    user.temporaryPasswordAssignedAt = new Date();
    await user.save();

    await logAudit(req, "RESET_PASSWORD", "User", user._id, {
      username: user.username,
      forcePasswordChange: user.mustChangePassword,
    });
    res
      .status(200)
      .json({ message: `Password reset successfully for ${user.fullName}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resetPin = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can reset PINs" });
  }

  const { userId, newPin } = req.body;

  try {
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ error: "PIN must be 6 digits" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.pin = newPin;
    await user.save();

    await logAudit(req, "RESET_PIN", "User", user._id, {
      username: user.username,
    });
    res
      .status(200)
      .json({ message: `PIN reset successfully for ${user.fullName}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const normalizeLegacyValues = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can normalize user records" });
  }

  try {
    const result = await User.normalizeLegacyValues();
    await logAudit(req, "NORMALIZE_LEGACY_USER_VALUES", "User", null, {
      updatedCount: result.updatedCount,
      totalCount: result.totalCount,
    });
    res
      .status(200)
      .json({ message: "User normalization completed", ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can view audit logs" });
  }

  try {
    const logs = await AuditLog.findAll({
      order: [["createdAt", "DESC"]],
      limit: 250,
    });
    res.status(200).json(logs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getLoginHistory = async (req, res) => {
  if (req.user?.role !== "System Administrator") {
    return res
      .status(403)
      .json({ error: "Only system administrators can view login history" });
  }

  try {
    const users = await User.findAll({
      attributes: ["id", "username", "fullName", "role", "loginHistory"],
    });
    const history = users
      .flatMap((member) =>
        (member.loginHistory || []).map((entry) => ({
          userId: member._id,
          username: member.username,
          fullName: member.fullName,
          role: member.role,
          identifier: entry.identifier,
          method: entry.method,
          success: entry.success,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: entry.timestamp,
        })),
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(history.slice(0, 250));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  loginUser,
  signupUser,
  createUser,
  updateUser,
  editUser,
  updateUserStatus,
  unlockUser,
  getUsers,
  deleteUser,
  resetPassword,
  resetPin,
  normalizeLegacyValues,
  getAuditLogs,
  getLoginHistory,
};
