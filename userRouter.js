const express = require('express')
const {
  createUser, getAllUsers, getUserById, updateUser, deleteUser, renameUsersFile,streamUsersFile,copyUsersFile
} = require('./userController')

const router = express.Router()

router.post('/', createUser)        
router.get('/', getAllUsers)
router.get('/stream-file', streamUsersFile)         
router.get('/:id', getUserById)     
router.put('/:id', updateUser)       
router.delete('/:id', deleteUser)  
router.post('/rename-file', renameUsersFile)  
router.post('/copy-file', copyUsersFile)


module.exports = router