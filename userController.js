const fs = require('fs').promises
const fsStream = require('fs')
const path = require('path')


const UPLOADS_DIR = path.join(__dirname, 'uploads')
const FILE = path.join(UPLOADS_DIR, 'usersnew.json')
const RENAMED_FILE = path.join(UPLOADS_DIR, 'usersnew1.json')
const COPY_FILE = path.join(UPLOADS_DIR, 'usersnew-copy.json')

const readUsers = async () => {
  try {
    const data = await fs.readFile(FILE, 'utf8')
    return data.trim() ? JSON.parse(data) : []
  } catch (err) {
    if (err.code === 'ENOENT') return []   
    throw err
  }
}

const writeUsers = async (users) => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(users, null, 2))
}

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email)

const getNextId = (users) =>
  users.length ? Math.max(...users.map(u => u.id)) + 1 : 1

const parseId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) ? id : null
}



const createUser = async (req, res) => {
  try {
    const { name, email, age } = req.body

    if (!name || !email || age === undefined) {
      return res.status(400).json({ error: 'name, email and age are required' })
    }
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name must be a non-empty string' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'email is not valid' })
    }
    if (!Number.isInteger(age) || age < 0) {
      return res.status(400).json({ error: 'age must be a positive whole number' })
    }

    const users = await readUsers()

    const newUser = {
      id: getNextId(users),
      name: name.trim(),
      email,
      age
    }

    users.push(newUser)
    await writeUsers(users)

    res.status(201).json(newUser)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const users = await readUsers()
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to read users' })
  }
}

const getUserById = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) {
      return res.status(400).json({ error: 'id must be a number' })
    }

    const users = await readUsers()
    const user = users.find(u => u.id === id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to read users' })
  }
}

const updateUser = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) {
      return res.status(400).json({ error: 'id must be a number' })
    }

    const { name, email, age } = req.body

    if (name === undefined && email === undefined && age === undefined) {
      return res.status(400).json({ error: 'Provide at least one of name, email or age' })
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'name must be a non-empty string' })
    }
    if (email !== undefined && !isValidEmail(email)) {
      return res.status(400).json({ error: 'email is not valid' })
    }
    if (age !== undefined && (!Number.isInteger(age) || age < 0)) {
      return res.status(400).json({ error: 'age must be a positive whole number' })
    }

    const users = await readUsers()
    const index = users.findIndex(u => u.id === id)
    
    if (index === -1) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (name !== undefined) users[index].name = name.trim()
    if (email !== undefined) users[index].email = email
    if (age !== undefined) users[index].age = age

    await writeUsers(users)
    res.json(users[index])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update user' })
  }
}

const deleteUser = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) {
      return res.status(400).json({ error: 'id must be a number' })
    }

    const users = await readUsers()
    const index = users.findIndex(u => u.id === id)

    if (index === -1) {
      return res.status(404).json({ message: 'User not found, nothing deleted' })
    }

    const [deleted] = users.splice(index, 1)
    await writeUsers(users)

    res.json({ message: 'User deleted successfully', user: deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

const renameUsersFile = async (req, res) => {
  try {
    await fs.rename(FILE, RENAMED_FILE)
    res.json({ message: 'file renamed' })
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ message: 'file does not exist, nothing renamed' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to rename file' })
  }
}

const streamUsersFile = (req, res) => {
  const stream = fsStream.createReadStream(FILE, { encoding: 'utf8' })
  let count = 0
  let content = ''

  stream.on('data', (chunk) => {
    count++
    console.log(`--- Chunk ${count} (${chunk.length} characters) ---`)
    console.log(chunk)
    content += chunk
  })

  stream.on('end', () => {
    console.log('Finished reading the entire file')
    res.json(content.trim() ? JSON.parse(content) : [])
  })

  stream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ message: 'file does not exist' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to read file' })
  })
}

const copyUsersFile = (req, res) => {
  const readStream = fsStream.createReadStream(FILE)
  const writeStream = fsStream.createWriteStream(COPY_FILE)

  readStream.pipe(writeStream)

  writeStream.on('finish', () => {
    console.log('File copied successfully')
    res.json({ message: 'File copied successfully' })
  })

  readStream.on('error', (err) => {
    writeStream.destroy()
    fs.unlink(COPY_FILE).catch(() => {}) 

    if (err.code === 'ENOENT') {
      return res.status(404).json({ message: 'source file does not exist, nothing copied' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to read source file' })
  })

  writeStream.on('error', (err) => {
    console.error(err)
    res.status(500).json({ error: 'Failed to write copy' })
  })
}

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser,renameUsersFile ,streamUsersFile,copyUsersFile}