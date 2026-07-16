const Workout = require('../models/workoutsmodels')
const { isValidId } = require('../models/modelUtils')
// GET all workouts
const getWorkouts = async (req, res) => {
    const user_id = req.user._id
   
        const workouts = await Workout.findAll({ where: { user_id }, order: [['createdAt', 'DESC']] })
        res.status(200).json(workouts)
    } 
       
// GET a single workout
const getWorkout = async (req, res) => {
    const { id } = req.params

    if (!isValidId(id)) {
        return res.status(404).json({ error: 'Invalid workout id' })
    }

    try {
        const workout = await Workout.findByPk(id)
        if (!workout) {
            return res.status(404).json({ error: 'no such Workout ' })
        }
        res.status(200).json(workout)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// CREATE a new workout
const createWorkout = async (req, res) => {
    const { title, reps, load } = req.body

    let emptyFields = []
    if (!title) {
        emptyFields.push('title')
    }
    if (!load) {
        emptyFields.push('load')
    }
     if (!reps) {
        emptyFields.push('reps')
    }
    if (emptyFields.length > 0) {
        return res.status(400).json({ error: 'Please fill in all fields', emptyFields })
    }
    try {
        const user_id = req.user._id
        const workout = await Workout.create({ title, reps, load, user_id })
        res.status(201).json(workout)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

// DELETE a workout
const deleteWorkout = async (req, res) => {
    const { id } = req.params

    if (!isValidId(id)) {
        return res.status(404).json({ error: 'Invalid workout id' })
    }

    try {
        const workout = await Workout.findByPk(id)
        if (!workout) {
            return res.status(404).json({ error: 'Workout not found' })
        }
        await workout.destroy()
        res.status(200).json(workout)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// UPDATE a workout
const updateWorkout = async (req, res) => {
    const { id } = req.params

    if (!isValidId(id)) {
        return res.status(404).json({ error: 'Invalid workout id' })
    }

    try {
        const workout = await Workout.findByPk(id)
        if (!workout) {
            return res.status(404).json({ error: 'no such workout found' })
        }
        await workout.update(req.body)
        res.status(200).json(workout)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = {
    getWorkouts,
    getWorkout,
    createWorkout,
    deleteWorkout,
    updateWorkout,
}
