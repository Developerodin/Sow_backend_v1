import express from 'express';
import { changePassword, changeUsername, createAdmin, deleteAdmin, getAdminById, getAllAdmins, loginController, updateAdmin } from '../../controllers/Admin.Controller.js';
// import { changePassword, changeUsername, createAdmin, deleteAdmin, getAdminById, getAllAdmins, loginController, updateAdmin } from '../Controllers/Admin.Controller.js';


const AdminRouter = express.Router();

// Route to create a new admin
AdminRouter.post('/login',loginController)

AdminRouter.post('/', createAdmin);

// Route to get all admins
AdminRouter.get('/', getAllAdmins);

// Route to get admin by ID
AdminRouter.get('/:id', getAdminById);

// Route to update admin by ID
AdminRouter.put('/:id', updateAdmin);

// Route to delete admin by ID
AdminRouter.delete('/:id',deleteAdmin);

// Route to change password for an admin
AdminRouter.post('/:id/change-password', changePassword);

// Route to change username for an admin
AdminRouter.post('/:id/change-username',changeUsername);

export default AdminRouter;
