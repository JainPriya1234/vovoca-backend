const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const pool = require('../database/pg')

const controller = {
    register: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password)
                throw Error("All fields are mandatory")
            if (password.length < 8)
                throw Error("Password should be atleast 8 characters")
            const user = await pool.query("SELECT * FROM admin WHERE username = $1", [username])
            if(user.rows.length !== 0)
                throw Error("Username already exists")
            const user2 = await pool.query("SELECT * FROM admin WHERE email = $1", [email])
            if(user2.rows.length !== 0)
                throw Error("Email already registered")
            const hashed = await bcrypt.hash(password, 8)
            const result = await pool.query("INSERT INTO admin (username, email, password) VALUES($1, $2, $3) RETURNING *", [username, email, hashed])
            if (result.rows.length === 0)
                throw Error("Internal Server Error")
            const token = jwt.sign(
                { user: result.rows[0]._id.toString() },
                    process.env.MASTER_PASSWORD, {
                        expiresIn: 360000
            })
            res.cookie('token', token, { httpOnly: true })
            res.status(201).json({ ...result.rows[0], token })

        } catch (error) {
            console.error(error)
            res.json(error.message)
        }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if(!email || !password)
                throw Error("All fields are mandatory")
            const { rows } = await pool.query("SELECT * FROM admin WHERE email = $1", [email])
            if (rows.length === 0)
                throw Error("Email not registered")
            const passMatch = await bcrypt.compare(password, rows[0].password)
            if (!passMatch)
                throw Error("Password Mismatched")
            
            const token = jwt.sign(
                { user: rows[0]._id.toString() },
                    process.env.MASTER_PASSWORD, {
                        expiresIn: 360000
            })
            res.cookie('token', token, { httpOnly: true })
            res.json({ ...rows[0], token })
        } catch (error) {
            console.error(error)
            res.json(error.message)
        }
    }
}

module.exports = controller