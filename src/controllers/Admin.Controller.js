import Admin from "../models/Admin.Model.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the admin by username
    const admin = await Admin.findOne({ email });

    // Check if the admin exists
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JSON Web Token (JWT) for authentication
    const token = jwt.sign({ userId: admin._id }, 'your-secret-key', {
      expiresIn: '1h', // You can adjust the token expiration time
    });

    // Send the token in the response
   
    res.status(200).json({
      status: 'success',
      token,
      data: {
        admin
      }
  });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'fail',
      message: error.message
  });
  }
};
// Controller function to create a new admin

export const createAdmin = async (req, res) => {
  const { username, password, email } = req.body;

  try {
    // Check if the username or email is already in use
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin account
    const newAdmin = new Admin({
      username,
      password: hashedPassword,
      email,
    });

    // Save the new admin account
    await newAdmin.save();

    res.status(201).json({ message: 'Admin account created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


// Controller function to get all admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller function to get admin by ID
export const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const updateAdmin = async (req, res) => {
  const { username, password, email } = req.body;
  const userId = req.params.id; // Assuming you have a route parameter for the admin ID

  try {
    // Find the admin by ID
    const admin = await Admin.findById(userId);

    // Check if the admin exists
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update the admin information
    admin.username = username || admin.username;
    admin.email = email || admin.email;

    // If a new password is provided, hash and update it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      admin.password = hashedPassword;
    }

    // Save the updated admin account
    await admin.save();

    res.status(200).json({ message: 'Admin account updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Controller function to delete admin by ID
export const deleteAdmin = async (req, res) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);
    if (!deletedAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller function to change password for an admin
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if the current password matches
    const isPasswordValid = await admin.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    // Update the password
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller function to change username for an admin
export const changeUsername = async (req, res) => {
  try {
    const { newUsername } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update the username
    admin.username = newUsername;
    await admin.save();

    res.status(200).json({ message: 'Username changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
