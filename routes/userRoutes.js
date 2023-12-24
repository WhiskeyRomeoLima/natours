const express = require('express')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')
const router = express.Router()
//https://github.com/jonasschmedtmann/complete-node-bootcamp/blob/master/4-natours/after-section-10/routes/userRoutes.js

router.post('/signup', authController.signup)
router.post('/login', authController.login)

router.post('/forgotPassword', authController.forgotPassword)
router.post('/resetPassword', authController.resetPassword)

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser)

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser)

module.exports = router